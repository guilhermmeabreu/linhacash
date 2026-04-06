import { AppError } from '@/lib/http/errors';
import crypto from 'crypto';

export type SecurityEvent =
  | 'checkout_attempt'
  | 'checkout_failed'
  | 'checkout_created'
  | 'support_attempt'
  | 'support_failed'
  | 'auth_attempt'
  | 'auth_failed'
  | 'auth_success'
  | 'account_delete_attempt'
  | 'account_delete_failed'
  | 'webhook_received'
  | 'webhook_denied'
  | 'webhook_processed'
  | 'webhook_failed'
  | 'route_rate_limited'
  | 'session_created'
  | 'session_replaced'
  | 'suspicious_activity';

function maskIp(ip: string): string {
  if (!ip || ip === 'unknown') return 'unknown';
  if (ip.includes(':')) return `${ip.split(':').slice(0, 3).join(':')}:*`;
  const parts = ip.split('.');
  if (parts.length !== 4) return 'unknown';
  return `${parts[0]}.${parts[1]}.${parts[2]}.*`;
}

export function getRequestId(req: Request): string {
  const headerId = req.headers.get('x-request-id') || req.headers.get('x-correlation-id');
  if (headerId && /^[a-zA-Z0-9:_\-.]{8,200}$/.test(headerId)) return headerId;
  return crypto.randomUUID();
}

function safeError(error: unknown): Record<string, unknown> {
  if (error instanceof AppError) {
    return {
      kind: 'app',
      code: error.code,
      status: error.status,
      message: error.message?.slice(0, 400),
      stack: error.stack?.slice(0, 2400),
    };
  }
  if (error instanceof Error) {
    return {
      kind: 'native',
      name: error.name,
      message: error.message?.slice(0, 400),
      stack: error.stack?.slice(0, 2400),
    };
  }
  if (typeof error === 'object' && error !== null) {
    const maybe = error as Record<string, unknown>;
    const message =
      typeof maybe.message === 'string'
        ? maybe.message
        : typeof maybe.error_description === 'string'
          ? maybe.error_description
          : typeof maybe.details === 'string'
            ? maybe.details
            : undefined;
    const stack = typeof maybe.stack === 'string' ? maybe.stack : undefined;
    return {
      kind: 'object',
      message: message?.slice(0, 400),
      code: typeof maybe.code === 'string' ? maybe.code : undefined,
      status: typeof maybe.status === 'number' ? maybe.status : undefined,
      hint: typeof maybe.hint === 'string' ? maybe.hint.slice(0, 400) : undefined,
      details: typeof maybe.details === 'string' ? maybe.details.slice(0, 400) : undefined,
      stack: stack?.slice(0, 2400),
    };
  }
  return { kind: 'unknown' };
}

export function logSecurityEvent(event: SecurityEvent, payload: Record<string, unknown>) {
  console.info('[security]', JSON.stringify({ event, ts: new Date().toISOString(), ...payload }));
}

export function logRouteError(route: string, requestId: string, error: unknown, extra?: Record<string, unknown>) {
  console.error(
    '[route-error]',
    JSON.stringify({ route, requestId, ts: new Date().toISOString(), error: safeError(error), ...extra }),
  );
}

export function buildRequestContext(req: Request, extra?: Record<string, unknown>) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
  return {
    requestId: getRequestId(req),
    ipMasked: maskIp(ip),
    method: req.method,
    path: new URL(req.url).pathname,
    ...extra,
  };
}
