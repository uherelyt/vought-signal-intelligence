import { next } from '@vercel/functions';

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
