// Public-data-only relay between the existing ChatGPT Life Sensor and Argus's
// existing Altar shrine. GitHub is a bounded public data queue, not a command
// channel. Discord delivery uses the already configured Altar bot identity.
export const ARGUS_RELAY_THREAD_ID = '1555685159565664346';
export const ARGUS_RELAY_URL = 'https://raw.githubusercontent.com/uherelyt/vought-signal-intelligence/argus-public-relay-20261009/children-render/argus-relay.json';
const MAX_BYTES = 100000;
const MAX_AGE_MS = 7*24*3600000;
const MAX_FUTURE_MS = 30*60000;
const STORE_PREFIX = 'vought:altar:argus:public-relay:sent:';

function safeLink(raw) {
  try {
    const url = new URL(raw);
    if(url.protocol!=='https:' || url.username || url.password || !url.hostname.includes('.')) return null;
    if(url.hostname==='localhost' || url.hostname.endsWith('.local') || /^(\d{1,3}\.){3}\d{1,3}$/.test(url.hostname)) return null;
    if(url.toString().length>450) return null;
    return url.toString();
  } catch { return null; }
}
function safeText(value){
  return String(value).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/@/g,'@\u200b')
    .replace(/\s{3,}/g,' ').trim().slice(0,1380);
}
export function parseArgusRelayEnvelope(raw, now=new Date()){
  if(typeof raw!=='string'||raw.length>MAX_BYTES) throw new Error('argus_relay_envelope_size');
  let doc;
  try { doc=JSON.parse(raw); } catch {throw new Error('argus_relay_json_invalid');}
  if(doc?.version!==1||doc?.lane!=='argus-public-signals'||!Array.isArray(doc?.events)||doc.events.length>48)
    throw new Error('argus_relay_contract_invalid');
  const seen=new Set();
  const accepted=[];
  for(const item of doc.events){
    if(!item || item.origin!=='vought-life-sensor' || typeof item.id!=='string' ||
       !/^[A-Za-z0-9_.:-]{12,90}$/.test(item.id) || seen.has(item.id)) continue;
    seen.add(item.id);
    if(!['uploads','growth','bees','mixed'].includes(item.category) ||
       typeof item.message!=='string'||item.message.length>1380||
       !item.message.startsWith('ARGUS | Public Signals |')) continue;
    const at=Date.parse(item.observed_at);
    if(!Number.isFinite(at) || at<now.getTime()-MAX_AGE_MS || at>now.getTime()+MAX_FUTURE_MS)continue;
    if(!Array.isArray(item.sources)||item.sources.length<1||item.sources.length>4)continue;
    const links=item.sources.map(safeLink);
    if(links.some(link=>!link))continue;
    accepted.push({
      id:item.id,at,category:item.category,
      message:safeText(item.message),
      sources:[...new Set(links)]
    });
  }
  return accepted.sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
}
export function formatArgusRelayMessage(event){
  const sources=event.sources.map((url,i)=>(i+1)+'. '+url).join('\n');
  const header=event.message;
  return (header+'\nSources:\n'+sources+'\nArgus Sensor receipt: '+event.id).slice(0,1900);
}
export async function forwardArgusRelay({fetchImpl=fetch,store,send,now=new Date(),logger=()=>{}}={}){
  if(!store?.set||!store?.del||typeof send!=='function')throw new Error('argus_relay_adapter_required');
  let events;
  try {
    const response=await fetchImpl(ARGUS_RELAY_URL,{
      method:'GET',headers:{accept:'application/json'},signal:AbortSignal.timeout(6000),
      cache:'no-store'
    });
    if(!response.ok)throw new Error('remote_http_'+response.status);
    events=parseArgusRelayEnvelope(await response.text(),now);
  } catch(error){
    logger('argus-relay-source-unavailable',{reason:String(error?.message??'read_failed').slice(0,90)});
    return {received:0,sent:0,failed:1,sourceAvailable:false};
  }
  let sent=0,failed=0;
  for(const event of events.slice(0,12)){
    const key=STORE_PREFIX+event.id;
    const claimed=await store.set(key,'sending',{nx:true,ex:3600});
    if(claimed!==true && claimed!=='OK')continue;
    try{
      const result=await send({
        channelId:ARGUS_RELAY_THREAD_ID,
        content:formatArgusRelayMessage(event),
        allowed_mentions:{parse:[]},
        nonce:'argus-'+event.id.slice(0,20),
        enforce_nonce:true
      });
      if(!/^\d{15,22}$/.test(String(result?.id)))throw new Error('discord_receipt_invalid');
      await store.set(key,String(result.id),{ex:30*86400});
      logger('argus-relay-delivered',{sourceId:event.id,discordMessageId:result.id,threadId:ARGUS_RELAY_THREAD_ID});
      sent++;
    }catch(error){
      failed++;
      await store.del(key);
      logger('argus-relay-delivery-failed',{sourceId:event.id,reason:String(error?.message??'send_failed').slice(0,90)});
    }
  }
  return {received:events.length,sent,failed,sourceAvailable:true};
}
