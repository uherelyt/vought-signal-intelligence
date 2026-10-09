import {ARGUS_SURVEILLANCE_SHRINE_ID, GLOBAL_HIVE_STOCK} from './argus-surveillance.mjs';

// Public sampled sources: no paid APIs, user-provided URLs or background service.
const newsUrl=q=>'https://news.google.com/rss/search?q='+encodeURIComponent(q)+'&hl=en-US&gl=US&ceid=US:en';
export const ARGUS_PUBLIC_FEEDS=Object.freeze([
  {id:'mrbeast',kind:'upload',name:'MrBeast',url:'https://www.youtube.com/feeds/videos.xml?channel_id=UCX6OQ3DkcsbYNE6H8uQQuVA'},
  {id:'markrober',kind:'upload',name:'Mark Rober',url:'https://www.youtube.com/feeds/videos.xml?channel_id=UCY1kMZp36IQSyNx_9h4mpCg'},
  {id:'mkbhd',kind:'upload',name:'MKBHD',url:'https://www.youtube.com/feeds/videos.xml?channel_id=UCBJycsmduvYEL83R_U4JriQ'},
  {id:'tseries',kind:'upload',name:'T-Series',url:'https://www.youtube.com/feeds/videos.xml?channel_id=UCq-Fj5jknLsUf-MWSy4_brA'},
  {id:'release-news',kind:'release',name:'Creator release news',url:newsUrl('("new video" OR "new upload" OR "new stream") (YouTube OR TikTok OR Twitch) when:7d')},
  {id:'growth-news',kind:'growth',name:'Creator growth news',url:newsUrl('("subscribers" OR "followers" OR "milestone") (creator OR YouTube OR TikTok OR Twitch) when:7d')},
  {id:'bee-news',kind:'bees',name:'Bee and pollinator news',url:newsUrl('("honey bees" OR honeybees OR beekeeping OR pollinators OR apiaries) when:7d')},
]);
const cache=new Map();
const MAX_BYTES=400000;
const FRESH_MS=8*86400000;
function xmlText(str){
  return String(str||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]+>/g,'')
    .replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/gi,(match,entity)=>{
      const e=entity.toLowerCase();
      if(e.startsWith('#')){const n=e.startsWith('#x')?parseInt(e.slice(2),16):parseInt(e.slice(1),10);return n>31&&n<=0x10ffff?String.fromCodePoint(n):' ';}
      return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[e]||match;
    }).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,240);
}
const field=(s,tag)=>s.match(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>','i'))?.[1]||'';
function safeLink(url,feed){
  try{
    const u=new URL(url);
    if(u.protocol!=='https:')return null;
    if(feed.kind==='upload'&&!['youtube.com','www.youtube.com'].includes(u.hostname))return null;
    if(feed.kind!=='upload'&&u.hostname!=='news.google.com')return null;
    return u.toString();
  }catch{return null;}
}
export function parseArgusFeed(xml,feed,now=new Date()){
  if(typeof xml!=='string'||xml.length>MAX_BYTES)return [];
  const entries=[...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)].slice(0,35);
  const out=[];
  for(const match of entries){
    const e=match[2],title=xmlText(field(e,'title')),rawDate=xmlText(field(e,'published')||field(e,'pubDate')||field(e,'updated'));
    const ts=Date.parse(rawDate);
    if(!title||!Number.isFinite(ts)||ts>now.getTime()+3600000||now.getTime()-ts>FRESH_MS)continue;
    let link=xmlText(field(e,'link'));
    if(feed.kind==='upload'){
      const video=xmlText(field(e,'yt:videoId'));
      if(!/^[a-z0-9_-]{11}$/i.test(video))continue;
      link='https://www.youtube.com/watch?v='+video;
    }
    link=safeLink(link,feed);if(!link)continue;
    out.push({title,link,date:new Date(ts).toISOString().slice(0,10),source:feed.name});
  }
  return out;
}
async function readFeed(feed,{fetchImpl,now,useCache,timeoutMs}){
  const cached=cache.get(feed.id);
  if(useCache&&cached&&now.getTime()-cached.at<300000&&now.getTime()>=cached.at)return cached.result;
  try{
    const response=await fetchImpl(feed.url,{method:'GET',headers:{accept:'application/rss+xml, application/atom+xml, text/xml'},signal:AbortSignal.timeout(timeoutMs)});
    if(!response.ok)throw new Error('http_'+response.status);
    const xml=await response.text();
    if(xml.length>MAX_BYTES)throw new Error('feed_too_large');
    const result={ok:true,items:parseArgusFeed(xml,feed,now)};
    cache.set(feed.id,{at:now.getTime(),result});
    return result;
  }catch{return {ok:false,items:[]};}
}
export function argusSignalTopics({shrineId,question,empirical=false}={}){
  if(shrineId!==ARGUS_SURVEILLANCE_SHRINE_ID||empirical)return null;
  const q=String(question||'').trim().slice(0,1600);if(!q)return null;
  const all=/\b(surveillance|monitoring|world report|global report|worldwide report|all three|three signals|status brief|public signals)\b/i.test(q);
  const uploads=/\b(new uploads?|latest uploads?|recent uploads?|new videos?|recent videos?|new content|recent content|content drops?|new posts?|creator uploads?|creator activity)\b/i.test(q);
  const growth=/\b(followers?|followership|subscribers?|subscriptions?|rising numbers?|growth|milestones?|popular creators?|audience)\b/i.test(q);
  const bees=/\b(bees?|honeybees?|pollinat(?:or|ors|ion)|beekeeping|apiar(?:y|ies)|bee\\s*hives?|hives?|bee news)\b/i.test(q);
  if(!all&&!uploads&&!growth&&!bees)return null;
  const hiveCount=bees&&/\b(how many|count|number of|stock|total|managed beehives?)\b/i.test(q)&&/\b(hives?|beehives?)\b/i.test(q);
  return {uploads:all||uploads,growth:all||growth,bees:all||bees,hiveCount};
}
function describe(items,ok,max){
  if(!ok)return 'feed unavailable during this check; no verified live result.';
  if(!items.length)return 'no recent items verified in sampled feeds (not zero internet activity).';
  const selected=[...new Map(items.map(x=>[x.link,x])).values()].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,max);
  return selected.map(x=>x.date+' '+x.title.slice(0,74)+' ['+x.source+'] '+x.link).join('\n');
}
export async function argusPublicSignalsBrief({shrineId,question,empirical=false,now=new Date(),fetchImpl=fetch,useCache=true}={}){
  const topics=argusSignalTopics({shrineId,question,empirical});if(!topics)return null;
  const feeds=ARGUS_PUBLIC_FEEDS.filter(x=>(topics.uploads&&['upload','release'].includes(x.kind))||(topics.growth&&x.kind==='growth')||(topics.bees&&x.kind==='bees'));
  const reads=await Promise.all(feeds.map(x=>readFeed(x,{fetchImpl,now,useCache,timeoutMs:5500})));
  const byId=new Map(feeds.map((f,i)=>[f.id,reads[i]]));
  const lines=['Argus | Public signals | checked '+now.toISOString().slice(0,16).replace('T',' ')+' UTC'];
  if(topics.uploads){
    const direct=feeds.filter(x=>x.kind==='upload'),items=direct.flatMap(x=>byId.get(x.id)?.items||[]);
    lines.push('PUBLIC UPLOADS (sampled YouTube, 7d): '+describe(items,direct.some(x=>byId.get(x.id)?.ok),2));
    const report=byId.get('release-news');
    if(report?.items.length)lines.push('Other public release reports: '+describe(report.items,true,1));
    else if(!report?.ok)lines.push('Wider creator release news: unavailable.');
  }
  if(topics.growth){
    const result=byId.get('growth-news');
    lines.push('POPULAR-CREATOR GROWTH (reported, 7d): '+describe(result?.items||[],Boolean(result?.ok),2));
    lines.push('News milestones are NOT a live subscriber counter or individual follow event feed.');
  }
  if(topics.bees){
    const result=byId.get('bee-news');
    lines.push('CURRENT BEE / POLLINATOR NEWS (7d): '+describe(result?.items||[],Boolean(result?.ok),3));
    if(topics.hiveCount)lines.push('Historical hive stock: '+GLOBAL_HIVE_STOCK.hives.toLocaleString('en-US')+' worldwide (FAOSTAT '+GLOBAL_HIVE_STOCK.year+'; NOT today). '+GLOBAL_HIVE_STOCK.url);
  }
  lines.push('Coverage: public samples only, not every account. Free-tier, checked on demand; not 24/7.');
  return lines.join('\n');
}
