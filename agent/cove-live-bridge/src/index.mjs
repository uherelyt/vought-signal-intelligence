import 'dotenv/config';
import http from 'node:http';
import { Client, GatewayIntentBits } from 'discord.js';

const env = {
  discordToken: process.env.DISCORD_BOT_TOKEN?.trim(),
  channelId: process.env.DISCORD_CHANNEL_ID?.trim(),
  prefix: process.env.DISCORD_PREFIX?.trim() || '!cove',
  ollamaUrl: (process.env.OLLAMA_URL || 'http://localhost:11434').replace(/\/$/, ''),
  ollamaModel: process.env.OLLAMA_MODEL?.trim() || 'qwen2.5:3b',
  voughtBase: (process.env.VOUGHTGPT_BASE_URL || 'https://vought-signal-intelligence.vercel.app').replace(/\/$/, ''),
  ingestSecret: process.env.VSID_INGEST_SECRET?.trim(),
  notionToken: process.env.NOTION_TOKEN?.trim(),
  notionVersion: process.env.NOTION_VERSION?.trim() || '2022-06-28',
  notionLimit: Number(process.env.NOTION_RESULT_LIMIT || 6),
  maxContextChars: Number(process.env.MAX_CONTEXT_CHARS || 12000),
  port: Number(process.env.PORT || 8787),
  bridgeSecret: process.env.COVE_BRIDGE_SECRET?.trim(),
};

const SYSTEM_PROMPT = `You are Cove, the VoughtGPT internal intelligence interface. Be clinically polite, concise, factual, bureaucratic, image-conscious, and documentation-oriented. Use terms such as subject, asset, incident, status, assessment, risk, and recommendation when they genuinely fit. Never invent evidence, tool access, measurements, permissions, or completed actions. Distinguish retrieved records from inference. Treat Notion context as an authorized corporate archive. Preserve ambiguity instead of pretending certainty. Do not claim to be ChatGPT or a human employee. Your job is analysis and controlled archival support, not unrestricted mutation of source records.`;

function safeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function jsonResponse(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(data);
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = safeText(payload?.message) || safeText(payload?.error) || `HTTP ${response.status}`;
    throw new Error(`${url}: ${detail}`);
  }
  return payload;
}

async function notionRequest(path, init = {}) {
  if (!env.notionToken) throw new Error('NOTION_TOKEN is not configured');
  return fetchJson(`https://api.notion.com${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.notionToken}`,
      'notion-version': env.notionVersion,
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

function richTextToPlain(items) {
  if (!Array.isArray(items)) return '';
  return items.map((item) => safeText(item?.plain_text) || safeText(item?.text?.content)).filter(Boolean).join('');
}

function pageTitle(page) {
  const properties = page?.properties && typeof page.properties === 'object' ? Object.values(page.properties) : [];
  for (const property of properties) {
    if (property?.type === 'title') {
      const title = richTextToPlain(property.title);
      if (title) return title;
    }
  }
  return page?.id || 'Untitled record';
}

function blockText(block) {
  const type = block?.type;
  const payload = type && block?.[type];
  if (!payload) return '';
  const text = richTextToPlain(payload.rich_text);
  return text ? `${type}: ${text}` : '';
}

async function fetchPageContext(page) {
  const blocks = await notionRequest(`/v1/blocks/${encodeURIComponent(page.id)}/children?page_size=50`);
  const lines = (blocks.results || []).map(blockText).filter(Boolean);
  return `RECORD: ${pageTitle(page)}\nURL: ${page.url || ''}\n${lines.join('\n')}`;
}

async function notionSearch(query = '') {
  if (!env.notionToken) return [];
  const body = {
    page_size: Math.max(1, Math.min(env.notionLimit, 10)),
    sort: { direction: 'descending', timestamp: 'last_edited_time' },
  };
  if (safeText(query)) body.query = safeText(query).slice(0, 100);
  const result = await notionRequest('/v1/search', { method: 'POST', body: JSON.stringify(body) });
  return (result.results || []).filter((item) => item?.object === 'page').slice(0, env.notionLimit);
}

async function retrieveContext(query) {
  if (!env.notionToken) return { text: '', records: [], status: 'SEALED' };
  let pages = await notionSearch(query);
  if (!pages.length && query) pages = await notionSearch('');

  const records = [];
  let text = '';
  for (const page of pages) {
    try {
      const record = await fetchPageContext(page);
      if (text.length + record.length > env.maxContextChars) break;
      records.push({ id: page.id, title: pageTitle(page), url: page.url || null, last_edited_time: page.last_edited_time || null });
      text += `${record}\n\n`;
    } catch (error) {
      records.push({ id: page.id, title: pageTitle(page), error: error.message });
    }
  }
  return { text: text.trim(), records, status: 'AUTHORIZED-READ' };
}

async function ollamaChat(userMessage, context = '') {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...(context ? [{ role: 'system', content: `AUTHORIZED NOTION CONTEXT:\n${context}` }] : []),
    { role: 'user', content: userMessage },
  ];

  const response = await fetchJson(`${env.ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: env.ollamaModel, messages, stream: false }),
  });
  const content = safeText(response?.message?.content);
  if (!content) throw new Error('Ollama returned an empty response');
  return content;
}

async function archiveSignal(signal) {
  if (!env.ingestSecret) return { status: 'SEALED', reason: 'VSID_INGEST_SECRET is not configured' };
  return fetchJson(`${env.voughtBase}/api/ingest`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.ingestSecret}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(signal),
  });
}

async function getVsidStatus() {
  try {
    return await fetchJson(`${env.voughtBase}/api/status`);
  } catch (error) {
    return { status: 'UNREACHABLE', error: error.message };
  }
}

async function answerOperator(input, source = 'discord') {
  const retrieval = await retrieveContext(input);
  const answer = await ollamaChat(input, retrieval.text);
  await archiveSignal({
    source: 'COVE',
    source_type: 'automation',
    subject: 'operator-query',
    external_id: `${source}-${Date.now()}`,
    observed_at: new Date().toISOString(),
    content: answer,
    context: `Operator request processed through local Ollama. Notion retrieval status: ${retrieval.status}.`,
    metrics: { source, model: env.ollamaModel, retrieved_records: retrieval.records.length },
    raw: { request: input, retrieval: retrieval.records },
    confidence: retrieval.records.length ? 'GROUNDED-WITH-MODEL' : 'MODEL-ONLY',
  }).catch((error) => console.error('ARCHIVE_FAILED', error.message));
  return { answer, retrieval };
}

async function runSweep(mode = 'sync') {
  const retrieval = await retrieveContext('');
  const vsid = await getVsidStatus();
  const inventory = retrieval.records.map((record) => `- ${record.title} | ${record.last_edited_time || 'unknown edit time'}`).join('\n');
  const prompt = mode === 'operations'
    ? `Create a compact daily Vought operations assessment from the authorized records below. Identify concrete changes, unresolved risks, and recommended follow-up. Do not invent activity.\n\n${inventory || '[No readable records]'}`
    : `Create a compact hourly synchronization assessment from the authorized records below. Report only detectable changes or state that no material change is evidenced. Do not invent activity.\n\n${inventory || '[No readable records]'}`;
  const assessment = await ollamaChat(prompt, retrieval.text);
  const archived = await archiveSignal({
    source: 'COVE',
    source_type: 'automation',
    subject: mode === 'operations' ? 'vought-operations-sweep' : 'v-sid-autonomous-sync',
    external_id: `${mode}-${new Date().toISOString()}`,
    observed_at: new Date().toISOString(),
    content: assessment,
    context: 'Autonomous local sweep using authorized Notion reads and local Ollama inference.',
    metrics: { mode, model: env.ollamaModel, retrieved_records: retrieval.records.length, vsid_status: vsid.status || null },
    raw: { retrieval: retrieval.records, vsid_status: vsid },
    confidence: retrieval.records.length ? 'GROUNDED-WITH-MODEL' : 'MODEL-ONLY',
  });
  return { mode, assessment, retrieval: retrieval.records, vsid, archived };
}

function authorizedRequest(req) {
  if (!env.bridgeSecret) return false;
  const supplied = req.headers['x-cove-key'];
  return typeof supplied === 'string' && supplied === env.bridgeSecret;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/health') {
    return jsonResponse(res, 200, {
      service: 'COVE LIVE BRIDGE',
      status: 'ONLINE',
      notion: env.notionToken ? 'CONFIGURED' : 'SEALED',
      vsid_ingest: env.ingestSecret ? 'CONFIGURED' : 'SEALED',
      discord: env.discordToken && env.channelId ? 'CONFIGURED' : 'SEALED',
      ollama_model: env.ollamaModel,
      checked_at: new Date().toISOString(),
    });
  }

  if (req.method === 'POST' && url.pathname === '/sweep') {
    if (!authorizedRequest(req)) return jsonResponse(res, 401, { status: 'AUTHORIZATION REQUIRED' });
    let raw = '';
    for await (const chunk of req) raw += chunk;
    let body = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { return jsonResponse(res, 400, { status: 'INVALID JSON' }); }
    try {
      const result = await runSweep(body.mode === 'operations' ? 'operations' : 'sync');
      return jsonResponse(res, 200, result);
    } catch (error) {
      console.error('SWEEP_FAILED', error);
      return jsonResponse(res, 500, { status: 'SWEEP FAILED', error: error.message });
    }
  }

  return jsonResponse(res, 404, { status: 'NOT FOUND' });
});

server.listen(env.port, '0.0.0.0', () => {
  console.log(`COVE_BRIDGE_ONLINE port=${env.port}`);
});

if (env.discordToken && env.channelId) {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  });

  client.on('ready', () => console.log(`DISCORD_ONLINE user=${client.user?.tag || 'unknown'}`));

  client.on('messageCreate', async (message) => {
    if (message.author.bot || message.channelId !== env.channelId) return;
    if (!message.content.startsWith(env.prefix)) return;
    const input = message.content.slice(env.prefix.length).trim();
    if (!input) return;

    try {
      if (input.toLowerCase() === 'status') {
        const status = await getVsidStatus();
        await message.reply(`V-SID status: ${status.status || 'UNKNOWN'} | archive: ${status.archive?.target || 'unreported'}`);
        return;
      }
      if (input.toLowerCase() === 'sweep') {
        const result = await runSweep('sync');
        await message.reply(result.assessment.slice(0, 1900));
        return;
      }
      const result = await answerOperator(input, 'discord');
      const chunks = result.answer.match(/[\s\S]{1,1900}/g) || ['No response generated.'];
      for (const chunk of chunks) await message.reply(chunk);
    } catch (error) {
      console.error('DISCORD_REQUEST_FAILED', error);
      await message.reply(`COVE // REQUEST FAILED // ${error.message}`.slice(0, 1900));
    }
  });

  client.login(env.discordToken).catch((error) => console.error('DISCORD_LOGIN_FAILED', error.message));
} else {
  console.warn('DISCORD_SEALED missing DISCORD_BOT_TOKEN or DISCORD_CHANNEL_ID');
}
