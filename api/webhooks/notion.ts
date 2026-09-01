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

export function GET(): Response {
  return json({ status: 'V-SID // NOTION WEBHOOK ONLINE' });
}

export async function POST(request: Request): Promise<Response> {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ status: 'V-SID // INVALID JSON' }, 400);
  }

  const verificationToken =
    typeof payload.verification_token === 'string' ? payload.verification_token : null;

  if (verificationToken) {
    console.log('NOTION_WEBHOOK_VERIFICATION_TOKEN', verificationToken);
    return json({
      status: 'V-SID // NOTION VERIFICATION RECEIVED',
      verification_token: verificationToken,
    });
  }

  console.log('NOTION_WEBHOOK_EVENT', JSON.stringify(payload));
  return json({ status: 'V-SID // NOTION EVENT ACCEPTED' });
}
