import { AppError } from '@/lib/http/errors';
import { fail, internalError, ok, options } from '@/lib/http/responses';
import { getIP, rateLimit } from '@/lib/rate-limit';
import { requireAuthenticatedUser } from '@/lib/auth/authorization';
import { cancelPaidSubscription } from '@/lib/services/billing-service';

export async function POST(req: Request) {
  const origin = req.headers.get('origin') || undefined;
  try {
    if (!(await rateLimit(`billing:cancel:${getIP(req)}`, 5, 10 * 60_000))) {
      return fail(new AppError('RATE_LIMIT_ERROR', 429, 'Too many cancellation attempts'), origin);
    }

    const user = await requireAuthenticatedUser(req);
    const result = await cancelPaidSubscription(user.id);

    if (!result.cancelled) {
      return ok(
        {
          cancelled: false,
          reason: result.reason,
          message: user.billing.isManualPro
            ? 'Manual Pro grants are managed by administrators and cannot be cancelled by this endpoint.'
            : 'No active paid subscription found.',
        },
        200,
        origin,
      );
    }

    return ok(
      {
        cancelled: true,
        accessUntil: result.accessUntil,
        message: 'Subscription cancellation registered. Pro access remains active until expiration.',
      },
      200,
      origin,
    );
  } catch (error) {
    if (error instanceof AppError) return fail(error, origin);
    return internalError(origin);
  }
}

export async function OPTIONS(req: Request) {
  return options(req.headers.get('origin') || undefined);
}
