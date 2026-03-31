import { NextResponse } from 'next/server';
import { corsHeaders, getSupabaseServer, validateSession } from '@/lib/security';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const eventName = String(body?.event_name || '').trim().slice(0, 120);

    if (!eventName) {
      return NextResponse.json({ error: 'event_name obrigatório' }, { status: 400, headers: corsHeaders() });
    }

    let metadata: Record<string, unknown> = {};
    if (body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)) {
      metadata = body.metadata;
    }

    let userId: string | null = null;
    if (req.headers.get('authorization')?.startsWith('Bearer ')) {
      const session = await validateSession(req);
      if (session.valid) userId = session.userId || null;
    }

    const supabase = getSupabaseServer();
    const { error } = await supabase.from('events').insert({
      user_id: userId,
      event_name: eventName,
      metadata,
      created_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({ error: 'Erro ao salvar evento' }, { status: 500, headers: corsHeaders() });
    }

    return NextResponse.json({ ok: true }, { status: 200, headers: corsHeaders() });
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400, headers: corsHeaders() });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}
