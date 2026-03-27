import { NextResponse } from 'next/server';
import { rateLimit, getIP } from '@/lib/rate-limit';

export async function POST(req: Request) {
  // Rate limit: máx 3 mensagens por hora por IP
  if (!rateLimit(getIP(req), 3, 3600000)) {
    return NextResponse.json({ error: 'Muitas mensagens. Tente novamente em 1 hora.' }, { status: 429 });
  }

  try {
    const { name, email, subject, message } = await req.json();

    // Validação
    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 });
    }
    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: 'Mensagem muito longa.' }, { status: 400 });
    }

    // Envia email para o admin via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'LinhaCash Suporte <onboarding@resend.dev>',
        to: process.env.ADMIN_EMAIL,
        reply_to: email,
        subject: `[Suporte] ${subject || 'Nova mensagem'} - ${name}`,
        html: `
          <h2>Nova mensagem de suporte</h2>
          <p><strong>Nome:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Assunto:</strong> ${subject || 'Sem assunto'}</p>
          <hr/>
          <p><strong>Mensagem:</strong></p>
          <p>${message.replace(/\n/g, '<br>')}</p>
          <hr/>
          <p style="color:#888;font-size:12px">Para responder, clique em Responder no seu email — vai direto para ${email}</p>
        `
      })
    });

    if (!res.ok) {
      console.error('Resend error:', await res.text());
      return NextResponse.json({ error: 'Erro ao enviar mensagem.' }, { status: 500 });
    }

    // Envia confirmação para o cliente
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'LinhaCash <onboarding@resend.dev>',
        to: email,
        subject: 'Recebemos sua mensagem! ✅',
        html: `
          <h2>Olá, ${name}!</h2>
          <p>Recebemos sua mensagem e responderemos em breve.</p>
          <p><strong>Sua mensagem:</strong></p>
          <p style="background:#f5f5f5;padding:12px;border-radius:8px">${message.replace(/\n/g, '<br>')}</p>
          <p>Tempo médio de resposta: <strong>até 24 horas</strong></p>
          <br/>
          <p>Equipe LinhaCash 🏀</p>
        `
      })
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
