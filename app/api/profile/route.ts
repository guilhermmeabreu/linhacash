import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateSession, sanitizeProfile, errorResponse, okResponse, corsHeaders } from '@/lib/security';
import { getBillingState } from '@/lib/services/billing-service';
import { rateLimit, getIP } from '@/lib/rate-limit';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/profile — perfil do usuário autenticado
export async function GET(req: Request) {
  const session = await validateSession(req);
  if (!session.valid) return errorResponse('Não autorizado', 401);

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, email, plan, theme, created_at')
    .eq('id', session.userId)
    .single();

  if (!profile) return errorResponse('Perfil não encontrado', 404);

  const billing = await getBillingState(session.userId!);
  return okResponse({
    profile: sanitizeProfile({ ...profile, plan: billing.hasProAccess ? 'pro' : 'free' }),
    billing,
  });
}

// PATCH /api/profile — atualizar nome, email ou tema
export async function PATCH(req: Request) {
  const session = await validateSession(req);
  if (!session.valid) return errorResponse('Não autorizado', 401);

  if (!await rateLimit(getIP(req), 10, 60000)) {
    return errorResponse('Muitas requisições', 429);
  }

  const body = await req.json().catch(() => ({}));

  // Campos permitidos — nunca deixar o frontend atualizar plan diretamente
  const allowed: Record<string, any> = {};
  if (body.name) allowed.name = String(body.name).trim().slice(0, 100);
  if (body.theme && ['dark', 'light'].includes(body.theme)) allowed.theme = body.theme;

  // Email requer verificação separada — não permitir update direto
  if (body.email) {
    return errorResponse('Alteração de email requer verificação. Use a opção de segurança.');
  }

  if (Object.keys(allowed).length === 0) {
    return errorResponse('Nenhum campo válido para atualizar');
  }

  const { error } = await supabase
    .from('profiles')
    .update(allowed)
    .eq('id', session.userId);

  if (error) return errorResponse('Erro ao atualizar perfil', 500);

  return okResponse({ ok: true });
}

// OPTIONS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}
