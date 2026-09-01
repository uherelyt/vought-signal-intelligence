import { next, rewrite } from '@vercel/functions';

const USERNAME = 'uherelyt';
const PASSWORD_SHA256 = '0f713eef62f6375ddfea304d6a5374a3f5f23131293de1b85c54318062711b80';

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function unauthorized(): Response {
  return new Response('V-SID // AUTHORIZATION REQUIRED', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="V-SID Restricted", charset="UTF-8"',
      'Cache-Control': 'no-store, max-age=0',
      'Pragma': 'no-cache',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

export default async function middleware(request: Request): Promise<Response> {
  const pathname = new URL(request.url).pathname;

  // External automation sources cannot complete the dashboard's interactive
  // Basic Auth challenge. The ingress function has its own bearer secret and
  // Notion-write controls. No other route bypasses dashboard auth.
  if (pathname === '/api/ingest') {
    return next();
  }

  const authorization = request.headers.get('authorization') || '';

  if (!authorization.startsWith('Basic ')) {
    return unauthorized();
  }

  try {
    const decoded = atob(authorization.slice(6));
    const separator = decoded.indexOf(':');

    if (separator < 0) {
      return unauthorized();
    }

    const username = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);
    const passwordHash = await sha256Hex(password);

    if (username === USERNAME && passwordHash === PASSWORD_SHA256) {
      // Canonical root: COVE is the writer/file keeper; V-SID stores and tracks.
      // With cleanUrls enabled, static HTML routes must use extensionless paths.
      // The prior full dashboard remains available at /index as a legacy view.
      if (pathname === '/') {
        return rewrite(new URL('/cove', request.url));
      }

      return next();
    }
  } catch {
    return unauthorized();
  }

  return unauthorized();
}

export const config = {
  matcher: '/(.*)',
};
