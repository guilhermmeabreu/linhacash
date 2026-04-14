import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateSession, errorResponse, okResponse, corsHeaders } from '@/lib/security';
import { rateLimit, getIP } from '@/lib/rate-limit';

let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (supabaseClient) return supabaseClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Supabase env vars are not configured');
  }

  supabaseClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return supabaseClient;
}

const MIN_PASSWORD_LENGTH = 8;

function isStrongPassword(password: string): boolean {
  return /[A-Za-z]/.test(password) && /\d/.test(password);
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const normalized = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = Buffer.from(normalized, 'base64').toString('utf8');
    const parsed = JSON.parse(payload);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function isRecoveryToken(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) return false;

  if (payload.type === 'recovery') return true;

  const amr = payload.amr;
  if (Array.isArray(amr)) {
    return amr.some((entry) => {
      if (typeof entry === 'string') return entry.toLowerCase() === 'recovery';
      if (entry && typeof entry === 'object' && 'method' in entry) {
        const method = (entry as { method?: unknown }).method;
        return typeof method === 'string' && method.toLowerCase() === 'recovery';
      }
      return false;
    });
  }

  return false;
}

export async function POST(req: Request) {
  const supabase = getSupabase();
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  const session = await validateSession(req);
  if (!session.valid || !session.userId || !session.email) {
    return errorResponse('Não autorizado', 401);
  }

  if (!await rateLimit(getIP(req), 5, 60_000)) {
    return errorResponse('Muitas requisições', 429);
  }

  const body = await req.json().catch(() => ({}));
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
  const recoveryFlow = body.recovery === true;

  if (!newPassword) {
    return errorResponse('Preencha os campos de senha', 400);
  }

  const recoverySession = recoveryFlow && token ? isRecoveryToken(token) : false;
  if (!recoverySession && !currentPassword) {
    return errorResponse('Preencha os campos de senha', 400);
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH || !isStrongPassword(newPassword)) {
    return errorResponse('A nova senha deve ter ao menos 8 caracteres, incluindo letras e números', 400);
  }

  if (!recoverySession && currentPassword === newPassword) {
    return errorResponse('A nova senha deve ser diferente da senha atual', 400);
  }

  if (!recoverySession) {
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: session.email,
      password: currentPassword,
    });

    if (authError) {
      return errorResponse('Senha atual inválida', 400);
    }
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(session.userId, {
    password: newPassword,
  });

  if (updateError) {
    return errorResponse('Não foi possível alterar a senha agora. Tente novamente.', 400);
  }

  return okResponse({ ok: true, message: 'Senha alterada com sucesso.' });
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}
