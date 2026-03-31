import { ValidationError } from '@/lib/http/errors';
import { asString, asUUID, ensureObject } from '@/lib/validators/common';

export function validateAdminBillingAction(body: unknown) {
  const input = ensureObject(body);
  const id = asUUID(input.id, 'id');
  const action = asString(input.action, 'action', 32);
  if (!['grant_manual_pro', 'revoke_manual_pro'].includes(action)) {
    throw new ValidationError('action is invalid');
  }
  const reason = typeof input.reason === 'string' ? input.reason.trim().slice(0, 280) : null;
  return { id, action: action as 'grant_manual_pro' | 'revoke_manual_pro', reason: reason || null };
}

export function validateCheckoutPlan(rawPlan: unknown) {
  const plan = asString(rawPlan, 'plan', 12);
  if (!['mensal', 'anual'].includes(plan)) throw new ValidationError('plan is invalid');
  return plan as 'mensal' | 'anual';
}
