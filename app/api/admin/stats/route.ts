import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdminUser } from '@/lib/auth/authorization';
import { AppError } from '@/lib/http/errors';
import { fail, internalError, options } from '@/lib/http/responses';
import { BillingProfileRow, resolveBillingState } from '@/lib/services/billing-domain';
import { getCachedValue } from '@/lib/cache/memory-cache';
import { getIP, rateLimitDetailed } from '@/lib/rate-limit';
import { buildRequestContext, logRouteError, logSecurityEvent } from '@/lib/observability';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const MONTHLY_PRO_PRICE_BRL = 24.9;
const ANNUAL_PRO_PRICE_BRL = 197;
const PLAYOFF_PRICE_BRL = 29.9;
const STRIPE_NATIONAL_PERCENT = 0.0399;
const STRIPE_NATIONAL_FIXED_BRL = 0.39;
type StatsProfileRow = BillingProfileRow & { created_at: string; name: string | null; email: string | null; id: string };

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

export async function GET(req: Request) {
  const origin = req.headers.get('origin') || undefined;
  const context = buildRequestContext(req, { route: '/api/admin/stats' });
  try {
    const admin = await requireAdminUser(req);
    const rate = await rateLimitDetailed(`admin:stats:${admin.email}:${getIP(req)}`, 45, 60_000);
    if (!rate.allowed) {
      logSecurityEvent('route_rate_limited', { ...context, adminEmail: admin.email, retryAfterSeconds: rate.retryAfterSeconds });
      return fail(new AppError('RATE_LIMIT_ERROR', 429, 'Too many admin stats requests'), origin);
    }
    const payload = await getCachedValue('admin:stats', 30_000, async () => {
      const [profiles, games, players, commissionsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id,plan,subscription_status,playoff_pack_active,billing_updated_at,plan_status,plan_source,billing_status,subscription_started_at,subscription_expires_at,cancelled_at,granted_by_admin,granted_reason,payment_provider,payment_reference,subscription_reference,external_reference,referral_code_used,created_at,name,email')
          .order('created_at', { ascending: false }),
        supabase.from('games').select('id', { count: 'exact' }),
        supabase.from('players').select('id', { count: 'exact' }),
        supabase.from('affiliate_commissions').select('code,commission_amount,commission_status'),
      ]);

      const rows = (profiles.data || []) as StatsProfileRow[];
      const billingStates = rows.map((row) => resolveBillingState(row));
      const total_users = rows.length;
      const pro_paid_users = billingStates.filter((b) => b.isPaidPro).length;
      const pro_admin_users = billingStates.filter((b) => b.isManualPro).length;
      const pro_users = pro_paid_users + pro_admin_users;
      const free_users = total_users - pro_users;
      const paidMonthlyUsers = billingStates.filter((billing) => billing.isPaidPro && billing.paidPlanType === 'monthly').length;
      const paidAnnualUsers = billingStates.filter((billing) => billing.isPaidPro && billing.paidPlanType === 'annual').length;
      const paidPlayoffUsers = billingStates.filter((billing) => billing.isPaidPro && billing.paidPlanType === 'playoff').length;
      const estimatedMonthlyRecurringRevenue = (paidMonthlyUsers * MONTHLY_PRO_PRICE_BRL) + (paidAnnualUsers * (ANNUAL_PRO_PRICE_BRL / 12));
      const monthlyCashCollected = paidMonthlyUsers * MONTHLY_PRO_PRICE_BRL;
      const annualCashCollected = paidAnnualUsers * ANNUAL_PRO_PRICE_BRL;
      const playoffRevenue = paidPlayoffUsers * PLAYOFF_PRICE_BRL;
      const grossRevenue = monthlyCashCollected + annualCashCollected + playoffRevenue;
      const paidTransactions = paidMonthlyUsers + paidAnnualUsers + paidPlayoffUsers;
      const estimatedStripeFees = (grossRevenue * STRIPE_NATIONAL_PERCENT) + (paidTransactions * STRIPE_NATIONAL_FIXED_BRL);
      const commissions = (commissionsResult.data || []).map((item) => ({
        code: String(item.code || ''),
        commission_amount: Number(item.commission_amount || 0),
        commission_status: String(item.commission_status || 'pending'),
      }));
      const totalAffiliateCommissions = commissions.reduce((sum, item) => sum + item.commission_amount, 0);
      const commissionsPaid = commissions.filter((item) => item.commission_status === 'paid').reduce((sum, item) => sum + item.commission_amount, 0);
      const commissionsEarned = commissions.filter((item) => item.commission_status === 'earned').reduce((sum, item) => sum + item.commission_amount, 0);
      const commissionsPending = commissions.filter((item) => item.commission_status === 'pending').reduce((sum, item) => sum + item.commission_amount, 0);
      const netRevenue = grossRevenue - estimatedStripeFees - totalAffiliateCommissions;
      const topByConversion = [...commissions.reduce((acc, item) => {
        acc.set(item.code, (acc.get(item.code) || 0) + 1);
        return acc;
      }, new Map<string, number>()).entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([code, conversions]) => ({ code, conversions }));
      const topByCommissionAmount = [...commissions.reduce((acc, item) => {
        acc.set(item.code, (acc.get(item.code) || 0) + item.commission_amount);
        return acc;
      }, new Map<string, number>()).entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([code, commission_amount_brl]) => ({ code, commission_amount_brl: roundMoney(commission_amount_brl) }));

      return {
        total_users,
        pro_users,
        pro_paid_users,
        pro_admin_users,
        free_users,
        paid_monthly_users: paidMonthlyUsers,
        paid_annual_users: paidAnnualUsers,
        paid_playoff_users: paidPlayoffUsers,
        total_games: games.count || 0,
        total_players: players.count || 0,
        estimated_monthly_revenue_brl: roundMoney(estimatedMonthlyRecurringRevenue),
        estimated_monthly_recurring_revenue_brl: roundMoney(estimatedMonthlyRecurringRevenue),
        monthly_cash_collected_brl: roundMoney(monthlyCashCollected),
        annual_cash_collected_brl: roundMoney(annualCashCollected),
        playoff_revenue_brl: roundMoney(playoffRevenue),
        gross_revenue_brl: roundMoney(grossRevenue),
        estimated_stripe_fees_brl: roundMoney(estimatedStripeFees),
        estimated_affiliate_commissions_brl: roundMoney(totalAffiliateCommissions),
        net_revenue_brl: roundMoney(netRevenue),
        affiliate_paid_conversions: commissions.length,
        total_affiliate_commission_paid_brl: roundMoney(commissionsPaid),
        total_affiliate_commission_earned_brl: roundMoney(commissionsEarned),
        total_affiliate_commission_pending_brl: roundMoney(commissionsPending),
        top_referral_codes_by_conversion: topByConversion,
        top_referral_codes_by_commission_amount: topByCommissionAmount,
        recent_signups: rows.slice(0, 10),
      };
    });

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof AppError) {
      logRouteError('/api/admin/stats', context.requestId, error, { status: error.status, code: error.code });
      return fail(error, origin);
    }
    logRouteError('/api/admin/stats', context.requestId, error, { status: 500 });
    return internalError(origin);
  }
}

export async function OPTIONS(req: Request) {
  return options(req.headers.get('origin') || undefined);
}
