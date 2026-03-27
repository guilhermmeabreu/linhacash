import { NextResponse } from 'next/server';
import { rateLimit, getIP } from '@/lib/rate-limit';

export async function POST(req: Request) {
  // Rate limit: máx 5 checkouts por minuto por IP
  if (!rateLimit(getIP(req), 5, 60000)) {
    return NextResponse.json({ error: 'Muitas tentativas. Tente novamente em 1 minuto.' }, { status: 429 });
  }

  try {
    const { plan, referral_code } = await req.json();

    // Validação
    if (!['mensal', 'anual'].includes(plan)) {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
    }

    const price = plan === 'anual' ? 197.00 : 24.90;
    const title = plan === 'anual' ? 'LinhaCash Pro Anual' : 'LinhaCash Pro Mensal';

    const body: any = {
      items: [{ title, quantity: 1, currency_id: 'BRL', unit_price: price }],
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_URL}/app.html?status=success`,
        failure: `${process.env.NEXT_PUBLIC_URL}/app.html?status=failure`,
        pending: `${process.env.NEXT_PUBLIC_URL}/app.html?status=pending`
      },
      auto_return: 'approved',
      notification_url: `${process.env.NEXT_PUBLIC_URL}/api/webhook/mp`
    };

    if (referral_code && /^[A-Z0-9]{2,20}$/.test(referral_code)) {
      body.metadata = { referral_code };
    }

    const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (!data.init_point) {
      console.error('MP error:', data);
      return NextResponse.json({ error: 'Erro ao gerar pagamento' }, { status: 500 });
    }

    return NextResponse.json({ url: data.init_point });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
