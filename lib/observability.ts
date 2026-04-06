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
  const sanitizeText = (input: string) =>
    input
      .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
      .replace(/(access_token|refresh_token|apikey|api_key|authorization)\s*[:=]\s*["']?[^"',\s]+/gi, '$1=[REDACTED]');

  const truncate = (input: string, max = 1200) => (input.length > max ? `${input.slice(0, max)}…[truncated]` : input);

  const safeString = (value: unknown) => {
    try {
      return truncate(sanitizeText(String(value)));
    } catch {
      return '[unstringifiable]';
    }
  };

  const toJsonSafePreview = (value: unknown, depth = 0): unknown => {
    if (depth > 2) return '[max-depth]';
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') return truncate(sanitizeText(value), 300);
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) return value.slice(0, 8).map((item) => toJsonSafePreview(item, depth + 1));
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const entries = Object.entries(obj).slice(0, 12).map(([key, entryValue]) => [key, toJsonSafePreview(entryValue, depth + 1)]);
      return Object.fromEntries(entries);
    }
    return safeString(value);
  };

  if (error instanceof AppError) {
    return {
      kind: 'app',
      code: error.code,
      status: error.status,
      name: error.name,
      message: truncate(sanitizeText(error.message)),
      stack: error.stack ? truncate(sanitizeText(error.stack)) : null,
    };
  }
  if (error instanceof Error) {
    return {
      kind: 'native',
      name: error.name,
      message: truncate(sanitizeText(error.message)),
      stack: error.stack ? truncate(sanitizeText(error.stack)) : null,
    };
  }
  const constructorName =
    error && typeof error === 'object' && (error as { constructor?: { name?: string } }).constructor
      ? (error as { constructor: { name?: string } }).constructor.name || null
      : null;

  return {
    kind: 'thrown_non_error',
    type: typeof error,
    constructorName,
    preview: toJsonSafePreview(error),
    fallback: safeString(error),
  };
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
