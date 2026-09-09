import { timingSafeEqual } from 'node:crypto';

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

function safeEqual(expected: string, received: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(received, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function compactText(value: string, max = 1500): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1)}…`;
}

function authSecret(request: Request): string {
  const bearer = request.headers.get('authorization')?.trim() || '';
  if (bearer.toLowerCase().startsWith('bearer ')) return bearer.slice(7).trim();
  return request.headers.get('x-cove-webhook-secret')?.trim() || '';
}

async function forwardToDiscord(message: string): Promise<{ ok: boolean; status: number | null }> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL?.trim();
  if (!webhookUrl) return { ok: false, status: null };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: 'Cove // Tumblr Relay',
      content: message.slice(0, 2000),
      allowed_mentions: { parse: [] },
    }),
  });

  return { ok: response.ok, status: response.status };
}

async function forwardToIngress(
  request: Request,
  signal: Record<string, unknown>,
): Promise<{ ok: boolean; status: number | null }> {
  const secret = process.env.VSID_INGEST_SECRET?.trim();
  if (!secret) return { ok: false, status: null };

  const ingressUrl = new URL('/api/ingest', request.url);
  const response = await fetch(ingressUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(signal),
  });

  return { ok: response.ok, status: response.status };
}

export function GET(): Response {
  return json({
    status: 'V-SID // TUMBLR WEBHOOK RELAY ONLINE',
    secret_configured: Boolean(process.env.TUMBLR_WEBHOOK_SECRET),
    discord_configured: Boolean(process.env.DISCORD_WEBHOOK_URL),
    ingest_configured: Boolean(process.env.VSID_INGEST_SECRET),
  });
}

export async function POST(request: Request): Promise<Response> {
  const expectedSecret = process.env.TUMBLR_WEBHOOK_SECRET?.trim();
  if (!expectedSecret) {
    console.error('TUMBLR_WEBHOOK_CONFIGURATION_ERROR');
    return json({ status: 'V-SID // TUMBLR WEBHOOK NOT CONFIGURED' }, 503);
  }

  const receivedSecret = authSecret(request);
  if (!receivedSecret || !safeEqual(expectedSecret, receivedSecret)) {
    console.warn('TUMBLR_WEBHOOK_AUTH_REJECTED');
    return json({ status: 'V-SID // TUMBLR WEBHOOK AUTH REJECTED' }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = asRecord(await request.json());
  } catch {
    return json({ status: 'V-SID // INVALID JSON' }, 400);
  }

  const post = asRecord(payload.post);
  const blog = asRecord(payload.blog);
  const title = firstString(payload.title, post.title, payload.summary, 'Tumblr notification');
  const blogName = firstString(payload.blog_name, blog.name, post.blog_name, payload.blog, 'Tumblr');
  const postUrl = firstString(payload.post_url, payload.url, post.post_url, post.url);
  const postId = firstString(payload.post_id, payload.id, post.id);
  const body = compactText(firstString(payload.body, payload.caption, payload.description, payload.text, post.body, post.caption));
  const eventType = firstString(payload.event_type, payload.type, 'tumblr.notification');
  const observedAt = firstString(payload.timestamp, payload.created_at, new Date().toISOString());

  const lines = [
    `📡 **TUMBLR_WEBHOOK** // ${blogName}`,
    title,
    body,
    postUrl,
  ].filter(Boolean);
  const message = lines.join('\n');

  const signal = {
    source: 'TUMBLR',
    source_type: 'webhook',
    subject: blogName,
    external_id: postId || undefined,
    observed_at: observedAt,
    content: JSON.stringify({
      event_type: eventType,
      title,
      body,
      post_url: postUrl || null,
    }),
    metrics: {},
    context: 'Authorized Tumblr relay webhook received by Vought Signal Intelligence and routed to Discord/Cove.',
    confidence: 'VERIFIED-SOURCE',
    raw: payload,
  };

  const [discord, ingest] = await Promise.all([
    forwardToDiscord(message),
    forwardToIngress(request, signal),
  ]);

  if (!discord.ok && discord.status !== null) {
    console.error('TUMBLR_WEBHOOK_DISCORD_FAILED', discord.status);
  }
  if (!ingest.ok && ingest.status !== null) {
    console.error('TUMBLR_WEBHOOK_INGEST_FAILED', ingest.status);
  }

  const delivered = discord.ok || ingest.ok;
  console.info('TUMBLR_WEBHOOK_RECEIVED', postId || 'no-id', eventType, {
    discord: discord.status,
    ingest: ingest.status,
  });

  return json(
    {
      status: delivered
        ? 'V-SID // TUMBLR NOTIFICATION RELAYED'
        : 'V-SID // TUMBLR NOTIFICATION OBSERVED; NO OUTPUT CONFIGURED',
      discord,
      ingest,
    },
    delivered ? 200 : 503,
  );
}
