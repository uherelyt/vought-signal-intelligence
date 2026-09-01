import { createHmac, timingSafeEqual } from 'node:crypto';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex, nofollow, noarchive',
    },
  });
}

function signaturesMatch(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export function GET(): Response {
  return json({ status: 'V-SID // NOTION WEBHOOK ONLINE' });
}

export async function POST(request: Request): Promise<Response> {
  let rawBody: string;
  let payload: Record<string, unknown>;

  try {
    rawBody = await request.text();
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return json({ status: 'V-SID // INVALID JSON' }, 400);
  }

  const verificationToken =
    typeof payload.verification_token === 'string' ? payload.verification_token : null;

  // Notion's one-time subscription verification request precedes event signing.
  if (verificationToken) {
    console.log('NOTION_WEBHOOK_VERIFICATION_TOKEN', verificationToken);
    return json({
      status: 'V-SID // NOTION VERIFICATION RECEIVED',
      verification_token: verificationToken,
    });
  }

  const storedVerificationToken = process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN;
  if (!storedVerificationToken) {
    console.error('NOTION_WEBHOOK_CONFIGURATION_ERROR missing verification token');
    return json({ status: 'V-SID // WEBHOOK CONFIGURATION ERROR' }, 503);
  }

  const receivedSignature = request.headers.get('x-notion-signature');
  if (!receivedSignature) {
    return json({ status: 'V-SID // SIGNATURE REQUIRED' }, 401);
  }

  const expectedSignature = `sha256=${createHmac('sha256', storedVerificationToken)
    .update(rawBody)
    .digest('hex')}`;

  if (!signaturesMatch(expectedSignature, receivedSignature)) {
    console.warn('NOTION_WEBHOOK_SIGNATURE_REJECTED');
    return json({ status: 'V-SID // SIGNATURE REJECTED' }, 401);
  }

  console.log('NOTION_WEBHOOK_EVENT', rawBody);
  return json({ status: 'V-SID // NOTION EVENT ACCEPTED' });
}
