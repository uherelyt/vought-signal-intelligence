type IncomingSignal = Record<string, unknown>;

type Signal = {
  schema_version: '1.1';
  signal_id: string;
  source: string;
  source_type: string;
  access_class: string;
  subject: string;
  external_id: string;
  observed_at: string;
  url: string;
  content: string;
  metrics: unknown;
  media: unknown;
  context: string;
  analyst_note: string;
  confidence: string;
  received_at: string;
  raw: unknown;
};

const ACTIVE_DATABASE_ID = '32349488-3b95-4630-bc24-adf3d4c22996';
const NOTION_VERSION = process.env.VSID_NOTION_VERSION || '2022-06-28';
const MAX_BODY_BYTES = 1_000_000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex, nofollow, noarchive',
    },
  });
}

function text(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try { return JSON.stringify(value); } catch { return fallback; }
}

function asIso(value: unknown): string {
  const candidate = text(value);
  const date = candidate ? new Date(candidate) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function hashId(source: string, externalId: string, observedAt: string): string {
  const basis = `${source}|${externalId}|${observedAt}`;
  let hash = 2166136261;
  for (let i = 0; i < basis.length; i += 1) {
    hash ^= basis.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `SIG-${observedAt.slice(0, 10).replaceAll('-', '')}-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function normalize(input: IncomingSignal): Signal {
  const source = text(input.source || input.platform, 'UNKNOWN').toUpperCase();
  const sourceType = text(input.source_type, 'automation').toLowerCase();
  const externalId = text(input.external_id || input.post_id);
  const observedAt = asIso(input.observed_at || input.timestamp);
  const accessClass = sourceType === 'manual'
    ? 'USER-CAPTURED'
    : sourceType === 'vidiq'
      ? 'AUTHORIZED-APP'
      : 'EXTERNAL-INGRESS';

  return {
    schema_version: '1.1',
    signal_id: hashId(source, externalId, observedAt),
    source,
    source_type: sourceType,
    access_class: accessClass,
    subject: text(input.subject || input.account, 'UNSPECIFIED'),
    external_id: externalId,
    observed_at: observedAt,
    url: text(input.url),
    content: text(input.content ?? input.text ?? input.caption ?? input.title),
    metrics: input.metrics ?? {},
    media: input.media ?? [],
    context: text(input.context),
    analyst_note: text(input.analyst_note),
    confidence: text(input.confidence, 'UNASSESSED'),
    received_at: new Date().toISOString(),
    raw: input.raw ?? input,
  };
}

function rich(value: string): Array<Record<string, unknown>> {
  return (value.match(/[\s\S]{1,1800}/g) || ['']).slice(0, 10).map((content) => ({
    type: 'text',
    text: { content },
  }));
}

function titleFor(signal: Signal): string {
  return `${signal.source} signal // ${signal.external_id || signal.signal_id}`;
}

function databaseCandidates(): string[] {
  const configured = process.env.VSID_NOTION_DATABASE_ID?.trim();
  return [...new Set([configured, ACTIVE_DATABASE_ID].filter(Boolean) as string[])];
}

async function bearerAuthorized(request: Request): Promise<boolean> {
  const expected = process.env.VSID_INGEST_SECRET?.trim() || '';
  const header = request.headers.get('authorization') || '';
  if (!expected || !header.startsWith('Bearer ')) return false;
  const supplied = header.slice(7);
  if (supplied.length !== expected.length) return false;
  const left = new TextEncoder().encode(supplied);
  const right = new TextEncoder().encode(expected);
  let mismatch = 0;
  for (let i = 0; i < left.length; i += 1) mismatch |= left[i] ^ right[i];
  return mismatch === 0;
}

async function notionRequest(token: string, path: string, init: RequestInit): Promise<Record<string, unknown>> {
  const response = await fetch(`https://api.notion.com${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'notion-version': NOTION_VERSION,
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(text(payload.message, `Notion HTTP ${response.status}`));
  return payload;
}

async function existingPage(token: string, databaseId: string, eventTitle: string): Promise<{ id: string; url?: string } | null> {
  const payload = await notionRequest(token, `/v1/databases/${databaseId}/query`, {
    method: 'POST',
    body: JSON.stringify({ page_size: 1, filter: { property: 'Event', title: { equals: eventTitle } } }),
  });
  const results = Array.isArray(payload.results) ? payload.results as Array<Record<string, unknown>> : [];
  const hit = results[0];
  return hit?.id ? { id: text(hit.id), url: text(hit.url) || undefined } : null;
}

async function createPage(token: string, databaseId: string, signal: Signal): Promise<{ id: string; url?: string }> {
  const normalizedPayload = JSON.stringify(signal, null, 2).slice(0, 12000);
  const payload = await notionRequest(token, '/v1/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: {
        Event: { title: rich(titleFor(signal)) },
        Source: { rich_text: rich(`${signal.source} // ${signal.source_type}`) },
        Assessment: { rich_text: rich('Normalized and archived. No model inference applied at ingestion time.') },
        'Evidence / Record': { rich_text: rich([signal.url, signal.external_id && `External ID: ${signal.external_id}`].filter(Boolean).join(' | ') || signal.signal_id) },
        Status: { select: { name: 'Logged' } },
        'Transcript / Source Text': { rich_text: rich(signal.content || '[No textual payload]') },
        Type: { select: { name: signal.source === 'NOTION' ? 'Archive Change' : 'Observation' } },
        Risk: { select: { name: 'Routine' } },
        'Action Taken': { rich_text: rich('Accepted by authenticated V-SID ingress, normalized to schema 1.1, and written to the active operational archive.') },
        Destination: { multi_select: [{ name: 'SYS:/ARCHIVE/' }, { name: 'SYS:/LOGS/' }] },
        'Subject / Asset': { rich_text: rich(signal.subject) },
        Timestamp: { date: { start: signal.observed_at } },
      },
      children: [
        { object: 'block', type: 'heading_2', heading_2: { rich_text: rich('Normalized Signal Record') } },
        { object: 'block', type: 'paragraph', paragraph: { rich_text: rich(`Signal ID: ${signal.signal_id}`) } },
        { object: 'block', type: 'paragraph', paragraph: { rich_text: rich(normalizedPayload) } },
      ],
    }),
  });
  const id = text(payload.id);
  if (!id) throw new Error('Notion write returned no page ID');
  return { id, url: text(payload.url) || undefined };
}

async function archive(signal: Signal): Promise<{ id: string; url?: string; duplicate: boolean; archive: string }> {
  const token = (process.env.NOTION_TOKEN || process.env.VSID_NOTION_TOKEN)?.trim();
  if (!token) throw new Error('NOTION_TOKEN is not configured');

  const configured = process.env.VSID_NOTION_DATABASE_ID?.trim();
  const errors: string[] = [];
  for (const databaseId of databaseCandidates()) {
    try {
      const existing = await existingPage(token, databaseId, titleFor(signal));
      if (existing) return { ...existing, duplicate: true, archive: databaseId === configured ? 'configured' : 'active-fallback' };
      const created = await createPage(token, databaseId, signal);
      return { ...created, duplicate: false, archive: databaseId === configured ? 'configured' : 'active-fallback' };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown archive error');
    }
  }
  throw new Error(`No active Notion archive accepted the signal: ${errors.join(' | ')}`);
}

export async function POST(request: Request): Promise<Response> {
  if (!(await bearerAuthorized(request))) {
    const configured = Boolean(process.env.VSID_INGEST_SECRET?.trim());
    return json({ status: configured ? 'V-SID // INGEST AUTHORIZATION REQUIRED' : 'V-SID // INGEST NOT CONFIGURED' }, configured ? 401 : 503);
  }

  const bodyText = await request.text();
  if (new TextEncoder().encode(bodyText).byteLength > MAX_BODY_BYTES) {
    return json({ status: 'V-SID // PAYLOAD TOO LARGE' }, 413);
  }

  let parsed: IncomingSignal | { records?: IncomingSignal[] };
  try { parsed = JSON.parse(bodyText || '{}'); }
  catch { return json({ status: 'V-SID // INVALID JSON' }, 400); }

  const records = Array.isArray((parsed as { records?: IncomingSignal[] }).records)
    ? (parsed as { records: IncomingSignal[] }).records
    : [parsed as IncomingSignal];
  if (!records.length || records.length > 25) return json({ status: 'V-SID // INVALID RECORD COUNT' }, 400);

  const results: Array<Record<string, unknown>> = [];
  for (const input of records) {
    const signal = normalize(input);
    try {
      const stored = await archive(signal);
      results.push({
        signal_id: signal.signal_id,
        status: stored.duplicate ? 'DUPLICATE' : 'ARCHIVED',
        archive: stored.archive,
        notion: { id: stored.id, url: stored.url },
      });
    } catch (error) {
      results.push({ signal_id: signal.signal_id, status: 'FAILED', error: error instanceof Error ? error.message : 'Unknown ingestion failure' });
    }
  }

  const failed = results.some((result) => result.status === 'FAILED');
  return json({
    status: failed ? 'V-SID // PARTIAL FAILURE' : 'V-SID // ARCHIVE WRITE COMPLETE',
    schema_version: '1.1',
    results,
  }, failed ? 502 : 201);
}
