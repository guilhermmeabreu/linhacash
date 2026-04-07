import { createClient } from '@supabase/supabase-js';
import { errorResponse, okResponse } from '@/lib/security';
import { assertAllowedOrigin, assertJsonRequest } from '@/lib/http/request-guards';
import { getIP, rateLimitDetailed } from '@/lib/rate-limit';
import { buildRequestContext, logRouteError, logSecurityEvent } from '@/lib/observability';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  const context = buildRequestContext(req, { route: '/api/auth/recovery/verify' });
  try {
    assertAllowedOrigin(req);
    assertJsonRequest(req);

    const ip = getIP(req);
    const rate = await rateLimitDetailed(`recovery-verify:${ip}`, 8, 60 * 60_000);
    if (!rate.allowed) {
      logSecurityEvent('route_rate_limited', { ...context, retryAfterSeconds: rate.retryAfterSeconds });
      return errorResponse(`Muitas tentativas. Tente novamente em ${rate.retryAfterSeconds}s.`, 429);
    }

    const body = await req.json().catch(() => ({}));
    const tokenHash = typeof body.token_hash === 'string' ? body.token_hash.trim() : '';
    const type = typeof body.type === 'string' ? body.type.trim().toLowerCase() : 'recovery';

    if (!tokenHash || type !== 'recovery') {
      return errorResponse('Link de recuperação inválido ou expirado', 400);
    }

    const { data, error } = await supabase.auth.verifyOtp({
      type: 'recovery',
      token_hash: tokenHash,
    });

    if (error || !data?.session?.access_token) {
      return errorResponse('Link de recuperação inválido ou expirado. Solicite um novo email.', 400);
    }

    return okResponse({
      ok: true,
      token: data.session.access_token,
      expiresAt: data.session.expires_at,
    });
  } catch (error) {
    logRouteError('/api/auth/recovery/verify', context.requestId, error);
    return errorResponse('Falha ao validar recuperação', 500);
  }
}
