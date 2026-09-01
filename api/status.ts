const ACTIVE_ARCHIVE_NAME = 'V-SID Operational Log // LIVE';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, max-age=0',
      'x-content-type-options': 'nosniff',
      'access-control-allow-origin': 'https://vought-signal-intelligence.vercel.app',
    },
  });
}

export default function handler(request: Request): Response {
  if (request.method !== 'GET') {
    return json({ status: 'V-SID // METHOD NOT AUTHORIZED' }, 405);
  }

  const ingressSecret = Boolean(process.env.VSID_INGEST_SECRET?.trim());
  const notionToken = Boolean((process.env.NOTION_TOKEN || process.env.VSID_NOTION_TOKEN)?.trim());
  const webhookVerification = Boolean(process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN?.trim());
  const pipelineReady = ingressSecret && notionToken && webhookVerification;

  return json({
    service: 'V-SID',
    surface: 'PUBLIC-SANITIZED',
    status: pipelineReady ? 'LIVE' : 'SEALED',
    ingress: {
      endpoint: '/api/ingest',
      configured: ingressSecret && notionToken,
      authentication: 'bearer',
    },
    notion_webhook: {
      endpoint: '/api/webhooks/notion',
      configured: webhookVerification,
      authentication: 'hmac-sha256',
      follow_up_read: notionToken,
    },
    archive: {
      target: ACTIVE_ARCHIVE_NAME,
      active_fallback: true,
      configured_override_present: Boolean(process.env.VSID_NOTION_DATABASE_ID?.trim()),
    },
    deployment: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || null,
    checked_at: new Date().toISOString(),
  });
}
