import { createHmac, timingSafeEqual } from 'node:crypto';

const ACTIVE_ARCHIVE_DATABASE_ID = '32349488-3b95-4630-bc24-adf3d4c22996';
const ACTIVE_ARCHIVE_DATA_SOURCE_ID = 'fc48b6a2-a0f0-4600-bc41-8c01a003f609';
const LEGACY_ARCHIVE_DATABASE_ID = '0569f270-e70b-49f0-804c-f24767f88cae';
const LEGACY_ARCHIVE_DATA_SOURCE_ID = '0d0f2048-7670-4a56-a6ff-7c56f8dcb422';
const MAX_UPDATED_BLOCKS = 8;

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
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const receivedBuffer = Buffer.from(received, 'utf8');
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function archiveIds(): Set<string> {
  return new Set(
    [
      ACTIVE_ARCHIVE_DATABASE_ID,
      ACTIVE_ARCHIVE_DATA_SOURCE_ID,
      LEGACY_ARCHIVE_DATABASE_ID,
      LEGACY_ARCHIVE_DATA_SOURCE_ID,
      process.env.VSID_NOTION_DATABASE_ID?.trim(),
    ].filter(Boolean) as string[],
  );
}

function isArchiveGeneratedEvent(payload: Record<string, unknown>): boolean {
  const ids = archiveIds();
  const entity = asRecord(payload.entity);
  const data = asRecord(payload.data);
  const parent = asRecord(data.parent);
  const candidates = [
    asString(entity.id),
    asString(parent.id),
    asString(parent.data_source_id),
  ];
  return candidates.some((candidate) => candidate && ids.has(candidate));
}

async function notionGet(path: string, version: string): Promise<unknown> {
  const token = process.env.NOTION_TOKEN || process.env.VSID_NOTION_TOKEN;
  if (!token) return null;

  const response = await fetch(`https://api.notion.com${path}`, {
    headers: {
      authorization: `Bearer ${token}`,
      'notion-version': version,
    },
  });

  if (!response.ok) {
    return {
      fetch_status: response.status,
      fetch_error: 'Notion follow-up read unavailable',
    };
  }

  return response.json();
}

async function enrichEvent(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const entity = asRecord(payload.entity);
  const data = asRecord(payload.data);
  const entityId = asString(entity.id);
  const entityType = asString(entity.type);
  const version = asString(payload.api_version) || '2026-03-11';

  const snapshot = entityType === 'page' && entityId
    ? await notionGet(`/v1/pages/${encodeURIComponent(entityId)}`, version)
    : null;

  const updatedBlocksInput = Array.isArray(data.updated_blocks) ? data.updated_blocks : [];
  const blockIds = updatedBlocksInput
    .map((item) => asString(asRecord(item).id))
    .filter(Boolean)
    .slice(0, MAX_UPDATED_BLOCKS);

  const updatedBlocks: unknown[] = [];
  for (const blockId of blockIds) {
    updatedBlocks.push(await notionGet(`/v1/blocks/${encodeURIComponent(blockId)}`, version));
  }

  return {
    snapshot,
    updated_blocks: updatedBlocks,
    updated_block_count_reported: updatedBlocksInput.length,
    updated_block_count_fetched: updatedBlocks.length,
  };
}

async function forwardToIngress(
  request: Request,
  payload: Record<string, unknown>,
  enrichment: Record<string, unknown>,
): Promise<Response> {
  const secret = process.env.VSID_INGEST_SECRET?.trim();
  if (!secret) {
    return json({ status: 'V-SID // INGEST NOT CONFIGURED' }, 503);
  }

  const entity = asRecord(payload.entity);
  const eventId = asString(payload.id);
  const eventType = asString(payload.type) || 'notion.event';
  const timestamp = asString(payload.timestamp) || new Date().toISOString();
  const entityType = asString(entity.type) || 'entity';
  const entityId = asString(entity.id) || 'unknown';

  const signal = {
    source: 'NOTION',
    source_type: 'api',
    subject: `${entityType}:${entityId}`,
    external_id: eventId,
    observed_at: timestamp,
    content: JSON.stringify({
      event_type: eventType,
      entity: payload.entity ?? null,
      enrichment,
    }),
    metrics: {
      attempt_number: payload.attempt_number ?? null,
      api_version: payload.api_version ?? null,
    },
    context: 'Signed Notion webhook. Changed entity metadata was fetched through the authorized Notion API where available before archival.',
    confidence: 'VERIFIED-SOURCE',
    raw: {
      event: payload,
      enrichment,
    },
  };

  const ingressUrl = new URL('/api/ingest', request.url);
  const response = await fetch(ingressUrl, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(signal),
  });

  const result = await response.json().catch(() => ({ status: 'V-SID // INGEST RESPONSE UNREADABLE' }));
  if (!response.ok) {
    console.error('NOTION_WEBHOOK_INGEST_FAILED', eventId, eventType, response.status);
    return json({ status: 'V-SID // NOTION EVENT INGEST FAILED', ingress: result }, 502);
  }

  console.info('NOTION_WEBHOOK_INGESTED', eventId, eventType);
  return json({ status: 'V-SID // NOTION EVENT ARCHIVED', ingress: result });
}

export function GET(): Response {
  return json({
    status: 'V-SID // NOTION WEBHOOK ONLINE',
    signature_verification: Boolean(process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN),
    ingress_configured: Boolean(process.env.VSID_INGEST_SECRET),
  });
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

  const verificationToken = typeof payload.verification_token === 'string' ? payload.verification_token : null;
  if (verificationToken) {
    // Notion sends this once during subscription verification. Never log or echo
    // the token; store it only in encrypted deployment configuration.
    return json({ status: 'V-SID // NOTION VERIFICATION RECEIVED' });
  }

  const storedVerificationToken = process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN?.trim();
  if (!storedVerificationToken) {
    console.error('NOTION_WEBHOOK_CONFIGURATION_ERROR');
    return json({ status: 'V-SID // WEBHOOK CONFIGURATION ERROR' }, 503);
  }

  const receivedSignature = request.headers.get('x-notion-signature')?.trim();
  if (!receivedSignature) {
    return json({ status: 'V-SID // SIGNATURE REQUIRED' }, 401);
  }

  const expectedSignature = `sha256=${createHmac('sha256', storedVerificationToken)
    .update(rawBody, 'utf8')
    .digest('hex')}`;

  if (!signaturesMatch(expectedSignature, receivedSignature)) {
    console.warn('NOTION_WEBHOOK_SIGNATURE_REJECTED');
    return json({ status: 'V-SID // SIGNATURE REJECTED' }, 401);
  }

  if (isArchiveGeneratedEvent(payload)) {
    console.info('NOTION_WEBHOOK_ARCHIVE_LOOP_SUPPRESSED', asString(payload.id), asString(payload.type));
    return json({ status: 'V-SID // ARCHIVE LOOP SUPPRESSED' });
  }

  const enrichment = await enrichEvent(payload);
  return forwardToIngress(request, payload, enrichment);
}
