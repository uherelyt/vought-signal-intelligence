/**
 * VoughtCord Redis state transfer (operator-run utility).
 * Local export never posts credentials or values to a remote service.
 *
 * npm install --omit=dev
 * REDIS_URL=... node scripts/redis-state-transfer.mjs inventory
 * REDIS_URL=... node scripts/redis-state-transfer.mjs export ./private-backup.ndjson
 * TARGET_REDIS_URL=... node scripts/redis-state-transfer.mjs import ./private-backup.ndjson
 * TARGET_REDIS_URL=... node scripts/redis-state-transfer.mjs import ./private-backup.ndjson --apply
 * TARGET_REDIS_URL=... node scripts/redis-state-transfer.mjs verify ./private-backup.ndjson
 *
 * Import requires a dedicated, EMPTY target namespace. Never put a backup in Git.
 */
import { createClient } from 'redis';
import { createHash } from 'node:crypto';
import { open, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const PREFIX = 'vought:';
const MAX_KEYS = 20000;
const MAX_BYTES = 100 * 1024 * 1024;
const TYPES = new Set(['string','list','hash','set','zset','stream']);
const op = process.argv[2];
const fileName = process.argv[3];
const apply = process.argv.includes('--apply');
const commands = new Set(['inventory','export','import','verify']);

if (!commands.has(op) || (op !== 'inventory' && !fileName)) {
  console.error('Usage: redis-state-transfer.mjs inventory | export FILE | import FILE [--apply] | verify FILE');
  process.exit(2);
}

async function connect(url, label) {
  if (!url) throw new Error(label + ' is not configured');
  const client = createClient({url});
  client.on('error', (error) => console.error('[redis-connection]', String(error?.message || error).slice(0, 120)));
  await client.connect();
  return client;
}
async function keysWithPrefix(client) {
  const keys = new Set();
  for await (const batch of client.scanIterator({ MATCH: PREFIX + '*', COUNT: 100 })) {
    for (const key of (Array.isArray(batch) ? batch : [batch])) {
      if (typeof key === 'string' && key.startsWith(PREFIX)) keys.add(key);
      if (keys.size > MAX_KEYS) throw new Error('More than ' + MAX_KEYS + ' keys; refusing unbounded transfer');
    }
  }
  return [...keys].sort();
}
function ordered(obj) {
  return Object.fromEntries(Object.entries(obj || {}).sort(([a],[b]) => a.localeCompare(b)));
}
async function readEntry(client, key) {
  const type = await client.type(key);
  if (type === 'none') return null;
  if (!TYPES.has(type)) throw new Error('Unsupported Redis data type: ' + type);
  const pttl = await client.pTTL(key);
  if (pttl === -2) return null;
  let value;
  if (type === 'string') value = await client.get(key);
  else if (type === 'list') value = await client.lRange(key, 0, -1);
  else if (type === 'hash') value = ordered(await client.hGetAll(key));
  else if (type === 'set') value = (await client.sMembers(key)).sort();
  else if (type === 'zset') value = await client.zRangeWithScores(key, 0, -1);
  else if (type === 'stream') value = await client.xRange(key, '-', '+');
  return { key, type, pttl, value };
}
function safeEntry(row) {
  if (!row || typeof row.key !== 'string' || !row.key.startsWith(PREFIX)
     || !TYPES.has(row.type) || !Number.isInteger(row.pttl) || row.pttl < -1) {
    throw new Error('Invalid or out-of-scope record in snapshot');
  }
  return row;
}
function fingerprint(row) {
  const clean = safeEntry(row);
  return JSON.stringify({key:clean.key,type:clean.type,value:clean.value});
}
async function load(file) {
  const raw = await readFile(resolve(file));
  if (raw.byteLength > MAX_BYTES) throw new Error('Snapshot exceeds 100 MiB security limit');
  const lines = raw.toString('utf8').trimEnd().split('\n');
  if (lines.length < 2) throw new Error('Empty snapshot');
  const header = JSON.parse(lines[0]);
  const footer = JSON.parse(lines[lines.length - 1]);
  if (header.schema !== 'voughtcord-redis-v1' || header.prefix !== PREFIX || !Date.parse(header.at)) {
    throw new Error('Invalid snapshot header');
  }
  const rows = lines.slice(1,-1).map(line => safeEntry(JSON.parse(line)));
  const digest = createHash('sha256').update(lines.slice(1,-1).join('\n') + '\n').digest('hex');
  if (footer.count !== rows.length || footer.sha256 !== digest) throw new Error('Snapshot digest/count mismatch');
  if (rows.length > MAX_KEYS || new Set(rows.map(x=>x.key)).size !== rows.length) throw new Error('Duplicate or excessive snapshot keys');
  return {header,rows,footer};
}
async function place(client,row,at) {
  const elapsed = Date.now() - Date.parse(at);
  const remaining = row.pttl === -1 ? -1 : row.pttl - elapsed;
  if (row.pttl >= 0 && remaining <= 0) return 'expired';
  const {key,type,value} = row;
  if (type === 'string') await client.set(key, value);
  else if (type === 'list' && value.length) await client.rPush(key,value);
  else if (type === 'hash' && Object.keys(value).length) await client.hSet(key,value);
  else if (type === 'set' && value.length) await client.sAdd(key,value);
  else if (type === 'zset' && value.length) await client.zAdd(key,value.map(x=>({score:Number(x.score),value:x.value})));
  else if (type === 'stream') {
    for (const item of value) await client.xAdd(key, item.id, item.message);
  }
  // Empty list/set/hash/zset/stream keys do not persist in Redis, so there is nothing to restore.
  if (remaining > 0 && await client.exists(key)) await client.pExpire(key, remaining);
  return 'written';
}

let source;
try {
  if (op === 'inventory' || op === 'export') {
    source = await connect(process.env.REDIS_URL, 'REDIS_URL');
    const keys = await keysWithPrefix(source);
    const counts = {};
    for (const key of keys) {
      const type = await source.type(key);
      counts[type] = (counts[type]||0)+1;
    }
    if (op === 'inventory') {
      console.info(JSON.stringify({prefix:PREFIX,count:keys.length,types:counts,valuesShown:false}));
    } else {
      const out = await open(resolve(fileName), 'wx', 0o600);
      const hash = createHash('sha256');
      const at = new Date().toISOString();
      let count = 0;
      try {
        await out.writeFile(JSON.stringify({schema:'voughtcord-redis-v1',prefix:PREFIX,at})+'\n');
        for (const key of keys) {
          const row = await readEntry(source,key);
          if (!row) continue;
          const line = JSON.stringify(row)+'\n';
          await out.writeFile(line);
          hash.update(line);
          count++;
        }
        await out.writeFile(JSON.stringify({count,sha256:hash.digest('hex')})+'\n');
      } finally { await out.close(); }
      console.info(JSON.stringify({file:resolve(fileName),records:count,types:counts,mode:'0600',secretsPrinted:false}));
    }
  } else {
    const snap = await load(fileName);
    if (op === 'import' && !apply) {
      console.info(JSON.stringify({dryRun:true,records:snap.rows.length,willOverwrite:false,message:'Add --apply after configuring TARGET_REDIS_URL and verifying destination is empty.'}));
    } else {
      if (!process.env.TARGET_REDIS_URL) throw new Error('TARGET_REDIS_URL required');
      if (process.env.TARGET_REDIS_URL === process.env.REDIS_URL && process.env.REDIS_URL) throw new Error('Source and target Redis URL must not match');
      const target = await connect(process.env.TARGET_REDIS_URL,'TARGET_REDIS_URL');
      try {
        if (op === 'import') {
          const existing = await keysWithPrefix(target);
          if (existing.length) throw new Error('Destination namespace NOT EMPTY ('+existing.length+' keys); no writes performed');
          const counts={written:0,expired:0};
          for(const row of snap.rows) counts[await place(target,row,snap.header.at)]++;
          console.info(JSON.stringify({applied:true,...counts,valuesShown:false}));
        } else {
          const counts={matched:0,expired:0,missing:0,mismatched:0};
          for (const row of snap.rows) {
            const elapsed = Date.now()-Date.parse(snap.header.at);
            if(row.pttl>=0 && row.pttl-elapsed<=0){counts.expired++;continue;}
            const current=await readEntry(target,row.key);
            if(!current){counts.missing++;continue;}
            if(fingerprint(current)===fingerprint(row)) counts.matched++;
            else counts.mismatched++;
          }
          console.info(JSON.stringify({...counts,valuesShown:false}));
          if(counts.missing||counts.mismatched) process.exitCode=1;
        }
      } finally { await target.quit(); }
    }
  }
} catch (error) {
  console.error('[voughtcord-redis-transfer]',String(error?.message||error).slice(0,400));
  process.exitCode=1;
} finally {
  if(source) await source.quit().catch(()=>{});
}
