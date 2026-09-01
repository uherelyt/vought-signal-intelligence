type SourceType = 'api' | 'rss' | 'email' | 'download' | 'automation' | 'manual' | 'vidiq';

type IncomingSignal = {
  source?: string;
  platform?: string;
  source_type?: SourceType | string;
  subject?: string;
  account?: string;
  external_id?: string;
  post_id?: string;
  url?: string;
  observed_at?: string;
  timestamp?: string;
  content?: unknown;
  text?: unknown;
  caption?: unknown;
  title?: unknown;
  metrics?: unknown;
  media?: unknown;
  context?: unknown;
  analyst_note?: unknown;
  confidence?: unknown;
  raw?: unknown;
};

type NormalizedSignal = {
  schema_version: '1.1';
  signal_id: string;
  source: string;
  source_type: SourceType;
  access_class: 'AUTHORIZED-APP' | 'EXTERNAL-INGRESS' | 'USER-CAPTURED';
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

const ACTIVE_NOTION_DATABASE_ID = '32349488-3b95-4630-bc24-adf3d4c22996';
const NOTION_VERSION = process.env.VSID_NOTION_VERSION || '2022-06-28';
const MAX_BODY_BYTES = 1_000_000;
const MAX_BLOCKS = 20;

function jsonResponse(body: unknown, status = 200): Response {
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

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

function sourceType(value: unknown): SourceType {
  const candidate = asString(value).toLowerCase();
  const allowed: SourceType[] = ['api', 'rss', 'email', 'download', 'automation', 'manual', 'vidiq'];
  return allowed.includes(candidate as SourceType) ? (candidate as SourceType) : 'automation';
}

function isoDate(value: unknown): string {
  const candidate = asString(value);
  const parsed = candidate ? new Date(candidate) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function signalId(source: string, externalId: string, observedAt: string): string {
  const basis = `${source}|${externalId}|${observedAt}`;
  let hash = 2166136261;
  for (let i = 0; i < basis.length; i += 1) {
    hash ^= basis.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `SIG-${observedAt.slice(0, 10).replaceAll('-', '')}-${(hash >>> 0)
    .toString(16)
    .padStart(8, '0')}`;
}

function normalize(input: IncomingSignal): NormalizedSignal {
  const source = asString(input.source || input.platform, 'UNKNOWN');
  const externalId = asString(input.external_id || input.post_id);
  const observedAt = isoDate(input.observed_at || input.timestamp);
  const type = sourceType(input.source_type);
  const content = asString(input.content ?? input.text ?? input.caption ?? input.title);
  const subject = asString(input.subject || input.account, 'UNSPECIFIED');

  return {
    schema_version: '1.1',
    signal_id: signalId(source, externalId, observedAt),
    source,
    source_type: type,
    access_class:
      type === 'vidiq' ? 'AUTHORIZED-APP' : type === 'manual' ? 'USER-CAPTURED' : 'EXTERNAL-INGRESS',
    subject,
    external_id: externalId,
    observed_at: observedAt,
    url: asString(input.url),
    content,
    metrics: input.metrics ?? {},
    media: input.media ?? [],
    context: asString(input.context),
    analyst_note: asString(input.analyst_note),
    confidence: asString(input.confidence, 'UNASSESSED'),
    received_at: new Date().toISOString(),
    raw: input.raw ?? input,
  };
}

function richText(value: string): Array<Record<string, unknown>> {
  const chunks = value.match(/[\s\S]{1,1800}/g) || [''];
  return chunks.slice(0, 10).map((content) => ({ type: 'text', text: { content } }));
}

function paragraph(value: string): Record<string, unknown> {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: { rich_text: richText(value) },
  };
}

function recordBlocks(signal: NormalizedSignal): Array<Record<string, unknown>> {
  const serialized = JSON.stringify(signal, null, 2);
  const chunks = serialized.match(/[\s\S]{1,1800}/g) || [];
  return [
    {
      object: 'block',
      type: 'heading_2',
      heading_2: { rich_text: richText('Normalized Signal Record') },
    },
    paragraph(`Signal ID: ${signal.signal_id}`),
    paragraph(`Access Class: ${signal.access_class}`),
    paragraph(`Source Type: ${signal.source_type}`),
    paragraph('Raw normalized payload follows. Analysis is a separate VoughtGPT action and is not implied by ingestion.'),
    ...chunks.slice(0, MAX_BLOCKS - 5).map((chunk) => paragraph(chunk)),
  ];
}

function archiveCandidates(): string[] {
  const configured = process.env.VSID_NOTION_DATABASE_ID?.trim();
  return [...new Set([configured, ACTIVE_NOTION_DATABASE_ID].filter(Boolean) as string[])];
}

async function authorized(request: Request): Promise<boolean> {
  const expected = process.env.VSID_INGEST_SECRET || '';
  if (!expected) return false;
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return false;
  const supplied = header.slice(7);
  if (supplied.length !== expected.length) return false;
  const a = new TextEncoder().encode(supplied);
  const b = new TextEncoder().encode(expected);
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a[i] ^ b[i];
  return mismatch === 0;
}

function eventTitle(signal: NormalizedSignal): string {
  return `${signal.source} signal // ${signal.external_id || signal.signal_id}`;
}

async function findExisting(
  token: string,
  databaseId: string,
  title: string,
): Promise<{ id: string; url?: string } | null> {
  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'notion-version': NOTION_VERSION,
    },
    body: JSON.stringify({
      page_size: 1,
      filter: { property: 'Event', title: { equals: title } },
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(payload.message || `Notion query failed with HTTP ${response.status}`);
  }

  const payload = (await response.json()) as { results?: Array<{ id?: string; url?: string }> };
  const hit = payload.results?.[0];
  return hit?.id ? { id: hit.id, url: hit.url } : null;
}

async function createArchivePage(
  token: string,
  databaseId: string,
  signal: NormalizedSignal,
): Promise<{ id: string; url?: string }> {
  const evidence = [signal.url, signal.external_id && `External ID: ${signal.external_id}`]
    .filter(Boolean)
    .join(' | ');

  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'notion-version': NOTION_VERSION,
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: {
        Event: { title: richText(eventTitle(signal)) },
        Source: { rich_text: richText(`${signal.source} // ${signal.source_type}`) },
        Assessment: { rich_text: richText('Normalized and archived. No model inference has been applied at ingestion time.') },
        'Evidence / Record': { rich_text: richText(evidence || signal.signal_id) },
        Status: { select: { name: 'Logged' } },
        'Transcript / Source Text': { rich_text: richText(signal.content || '[No textual payload]') },
        Type: { select: { name: signal.source === 'NOTION' ? 'Archive Change' : 'Observation' } },
        Risk: { select: { name: 'Routine' } },
        'Action Taken': { rich_text: richText('Accepted by authenticated V-SID ingress, normalized to schema 1.1, and written to the active operational archive.') },
        Destination: { multi_select: [{ name: 'SYS:/ARCHIVE/' }, { name: 'SYS:/LOGS/' }] },
        'Subject / Asset': { rich_text: richText(signal.subject) },
        Timestamp: { date: { start: signal.observed_at } },
      },
      children: recordBlocks(signal),
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as { id?: string; url?: string; message?: string };
  if (!response.ok || !payload.id) {
    throw new Error(payload.message || `Notion write failed with HTTP ${response.status}`);
  }
  return { id: payload.id, url: payload.url };
}

async function writeToNotion(signal: NormalizedSignal): Promise<{ id: string; url?: string; duplicate: boolean; archive: 'configured' | 'active-fallback' }> {
  const token = process.env.NOTION_TOKEN || process.env.VSID_NOTION_TOKEN;
  if (!token) throw new Error('NOTION_TOKEN is not configured');

  const candidates = archiveCandidates();
  const configured = process.env.VSID_NOTION_DATABASE_ID?.trim();
  const errors: string[] = [];

  for (const databaseId of candidates) {
    try {
      const existing = await findExisting(token, databaseId, eventTitle(signal));
      if (existing) {
        return {
          ...existing,
          duplicate: true,
          archive: databaseId === configured ? 'configured' : 'active-fallback',
        };
      }

      const created = await createArchivePage(token, databaseId, signal);
      return {
        ...created,
        duplicate: false,
        archive: databaseId === configured ? 'configured' : 'active-fallback',
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown Notion archive error');
    }
  }

  throw new Error(`No active Notion archive accepted the signal: ${errors.join(' | ')}`);
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ status: 'V-SID // METHOD NOT AUTHORIZED' }, 405);
  }

  if (!(await authorized(request))) {
    const configured = Boolean(process.env.VSID_INGEST_SECRET);
    return jsonResponse({ status: configured ? 'V-SID // INGEST AUTHORIZATION REQUIRED' : 'V-SID // INGEST NOT CONFIGURED' }, configured ? 401 : 503);
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    return jsonResponse({ status: 'V-SID // PAYLOAD TOO LARGE' }, 413);
  }

  let body: IncomingSignal | { records?: IncomingSignal[] };
  try {
    body = JSON.parse(text || '{}');
  } catch {
    return jsonResponse({ status: 'V-SID // INVALID JSON' }, 400);
  }

  const inputs = Array.isArray((body as { records?: IncomingSignal[] }).records)
    ? (body as { records: IncomingSignal[] }).records
    : [body as IncomingSignal];

  if (!inputs.length || inputs.length > 25) {
    return jsonResponse({ status: 'V-SID // INVALID RECORD COUNT' }, 400);
  }

  const normalized = inputs.map(normalize);
  const results: Array<Record<string, unknown>> = [];

  for (const signal of normalized) {
    try {
      const notion = await writeToNotion(signal);
      results.push({
        signal_id: signal.signal_id,
        status: notion.duplicate ? 'DUPLICATE' : 'ARCHIVED',
        archive: notion.archive,
        notion: { id: notion.id, url: notion.url },
      });
    } catch (error) {
      results.push({ signal_id: signal.signal_id, status: 'FAILED', error: error instanceof Error ? error.message : 'Unknown ingestion failure' });
    }
  }

  const failed = results.some((result) => result.status === 'FAILED');
  return jsonResponse(
    {
      status: failed ? 'V-SID // PARTIAL FAILURE' : 'V-SID // ARCHIVE WRITE COMPLETE',
      schema_version: '1.1',
      results,
    },
    failed ? 502 : 201,
  );
}
