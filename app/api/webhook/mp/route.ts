import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.type === 'payment') {
      const paymentId = body.data?.id;
      if (!paymentId) return NextResponse.json({ ok: true });

      const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` }
      });
      const payment = await res.json();

      if (payment.status === 'approved') {
        const email = payment.payer?.email;
        const referralCode = payment.metadata?.referral_code || null;

        if (email) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();

          if (profile) {
            await supabase
              .from('profiles')
              .update({ plan: 'pro', referral_code_used: referralCode })
              .eq('id', profile.id);

            if (referralCode) {
              // Incrementa contador de usos
              const { data: refData } = await supabase
                .from('referral_codes')
                .select('uses')
                .eq('code', referralCode)
                .single();

              if (refData) {
                await supabase
                  .from('referral_codes')
                  .update({ uses: (refData.uses || 0) + 1 })
                  .eq('code', referralCode);
              }

              // Salva uso detalhado
              await supabase.from('referral_uses').insert({
                code: referralCode,
                user_id: profile.id,
                payment_id: String(paymentId),
                created_at: new Date().toISOString()
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Webhook error:', e);
    return NextResponse.json({ ok: true });
  }
}
