import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { buildSecurityHeaders } from '@/lib/http/responses';

const NON_API_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
};

const ADMIN_BYPASS_COOKIE = 'linhacash_admin_bypass';
const ADMIN_ACCESS_HEADER = 'x-admin-access';

const MAINTENANCE_HTML = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>LinhaCash em pausa</title>
  </head>
  <body style="font-family: system-ui, sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0b1020; color: #f8fafc;">
    <main style="text-align: center; padding: 24px; max-width: 640px;">
      <h1 style="font-size: 2rem; margin-bottom: 1rem;">LinhaCash em pausa</h1>
      <p style="font-size: 1.125rem; margin: 0;">Voltamos no início da próxima temporada.</p>
    </main>
  </body>
</html>`;

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const proto = req.headers.get('x-forwarded-proto');
  const isApi = req.nextUrl.pathname.startsWith('/api/');

  if (process.env.NODE_ENV === 'production' && proto && proto !== 'https') {
    url.protocol = 'https:';
    return NextResponse.redirect(url, 308);
  }

  const maintenanceEnabled = process.env.MAINTENANCE_MODE === 'true';
  const hasAdminHeader = req.headers.has(ADMIN_ACCESS_HEADER);
  const hasAdminBypassCookie = req.cookies.has(ADMIN_BYPASS_COOKIE);

  if (maintenanceEnabled && !isApi && !hasAdminHeader && !hasAdminBypassCookie) {
    return new NextResponse(MAINTENANCE_HTML, {
      status: 503,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store, no-cache, must-revalidate',
      },
    });
  }

  const response = NextResponse.next();
  const headers = isApi ? buildSecurityHeaders(req.headers.get('origin') || undefined) : NON_API_HEADERS;
  Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
