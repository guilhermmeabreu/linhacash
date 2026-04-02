import { AppError } from '@/lib/http/errors';
import { fail, internalError, ok, options } from '@/lib/http/responses';
import { requireAuthenticatedUser } from '@/lib/auth/authorization';
import { deleteOwnAccount } from '@/lib/services/account-service';
import { getIP, rateLimitDetailed } from '@/lib/rate-limit';
import { readJsonObject } from '@/lib/http/request-guards';
import { ValidationError } from '@/lib/http/errors';
import { buildRequestContext, logRouteError, logSecurityEvent } from '@/lib/observability';

export async function DELETE(req: Request) {
  const origin = req.headers.get('origin') || undefined;
  const context = buildRequestContext(req);
  try {
    const ip = getIP(req);
    const rate = await rateLimitDetailed(`account-delete:${ip}`, 3, 60 * 60_000);
    if (!rate.allowed) {
      logSecurityEvent('route_rate_limited', { ...context, route: '/api/account/delete', retryAfterSeconds: rate.retryAfterSeconds });
      return fail(new AppError('RATE_LIMIT_ERROR', 429, 'Too many account deletion attempts'), origin);
    }

    const user = await requireAuthenticatedUser(req);
    logSecurityEvent('account_delete_attempt', { ...context, userId: user.id });
    const body = await readJsonObject(req);
    const confirmation = typeof body.confirmation === 'string' ? body.confirmation.trim().toUpperCase() : '';
    if (confirmation !== 'EXCLUIR') {
      throw new ValidationError('Confirmation text is required');
    }
    await deleteOwnAccount(user.id, user.email);
    return ok({ deleted: true });
  } catch (error) {
    if (error instanceof AppError) return fail(error, origin);
    logRouteError('/api/account/delete', context.requestId, error);
    logSecurityEvent('account_delete_failed', context);
    return internalError(origin);
  }
}

export async function OPTIONS(req: Request) {
  return options(req.headers.get('origin') || undefined);
}
