import test from 'node:test';
import assert from 'node:assert/strict';
import {AltarRuntime,FORUM_ID,PREFIX,validThread,drawOracle,TAROT,RUNES,shrineTitle,isSacredHiveMember} from '../../lib/altar/core.mjs';
import {applyElaedFallbackAvatar,ELAED_ANCESTRAL_SEAL_AVATAR_DATA_URI} from '../../lib/altar/ancestral-seal-avatar.mjs';

function fixture(){
  const values=new Map(),lists=new Map(),calls=[];let clock=1780000000000;
  const p={id:'elaed-aaaaaaaaaaaa-1',name:'Nyx',displayName:'Nyx',relationships:[],humanControlled:false},other={...p,id:'elaed-bbbbbbbbbbbb-1',name:'Erelyt',humanControlled:true};
  const store={get:async k=>values.get(k)??null,set:async(k,v,o={})=>{if(o.nx&&values.has(k))return null;values.set(k,String(v));return 'OK';},incr:async k=>{const n=Number(values.get(k)||0)+1;values.set(k,String(n));return n;},del:async k=>values.delete(k),expire:async()=>{},lpush:async(k,v)=>lists.set(k,[v,...lists.get(k)??[]]),lrange:async(k,a,b)=>{const list=lists.get(k)??[];return list.slice(a,b===-1?undefined:b+1);},ltrim:async()=>{},remove:async(k,v)=>{const list=lists.get(k)??[];const i=list.indexOf(v);if(i>=0)list.splice(i,1);}};
  const thread='1555666568409653299',guildId='1555000000000000001';values.set(`${PREFIX}:shrine:${p.id}`,thread);values.set(`${PREFIX}:thread:${thread}`,p.id);
  let channel={id:thread,type:11,parent_id:FORUM_ID,guild_id:guildId};
  const api=async(path,method='GET',body)=>{calls.push({path,method,body});if(path.endsWith('/webhooks'))return [{id:'123',token:'secret',application_id:'altar'}];if(path.startsWith('/channels/')&&method==='GET')return channel;if(path.startsWith('/webhooks'))return {id:'1555666568409653300'};return {};};
  const runtime=new AltarRuntime({store,api,generate:async()=> 'A quiet omen.',roster:{people:[p,other]},guildId,operatorId:'op',applicationId:'altar',now:()=>clock});
  return {runtime,p,other,thread,guildId,values,lists,calls,setChannel:c=>channel=c,setClock:c=>clock=c};
}
test('shrine titles expose only the visible display name',()=>{
 assert.equal(shrineTitle({displayName:'Nyx',id:'elaed-aaaaaaaaaaaa-1'}),'Nyx');
});

test('thread destinations require public thread, exact altar parent and guild',()=>{
 assert(validThread({type:11,parent_id:FORUM_ID,guild_id:'g'},'g'));
 for(const c of [{type:0,parent_id:FORUM_ID,guild_id:'g'},{type:11,parent_id:'elsewhere',guild_id:'g'},{type:11,parent_id:FORUM_ID,guild_id:'other'}])assert(!validThread(c,'g'));
});
test('no send escapes altar even when model/destination is forged',async()=>{
 const f=fixture();f.setChannel({type:11,parent_id:'elsewhere',guild_id:f.guildId});
 await assert.rejects(f.runtime.deliver(f.p,f.thread,'escape','0'),/outside_altar/);
 assert(!f.calls.some(c=>c.method==='POST'));
});
test('banishment persists and blocks an in-flight generated reply',async()=>{
 const f=fixture();f.runtime.generate=async()=>{await f.runtime.control('op',f.p.id,true);return 'should never post';};
 assert.equal(await f.runtime.reply(f.p,f.thread,'petition'),null);
 assert.equal(f.values.get(`${PREFIX}:banished:${f.p.id}`),'1');assert(!f.calls.some(c=>c.method==='POST'));
 await assert.rejects(f.runtime.control('intruder','all',false),/operator_only/);
});
test('human-controlled figures never produce generated dialogue',async()=>{
 const f=fixture();let generated=false;f.runtime.generate=async()=>{generated=true;};
 assert.equal(await f.runtime.reply(f.other,f.thread,'speak'),null);assert(!generated);
});
test('banishment during webhook discovery is checked again before posting',async()=>{
 const f=fixture();f.runtime.webhook=async()=>{await f.runtime.control('op','all',true);return {id:'1',token:'2'};};
 assert.equal(await f.runtime.deliver(f.p,f.thread,'must stop','0'),null);assert(!f.calls.some(c=>c.method==='POST'));
});
test('randomized methods use full decks and publish an attributable actual draw',()=>{
 assert.equal(TAROT.length,78);assert.equal(new Set(TAROT).size,78);assert.equal(RUNES.length,24);
 const d=drawOracle('tarot',n=>n-1);assert.equal(d.symbol,'King of Pentacles');assert.equal(d.orientation,'reversed');
 assert.equal(drawOracle('rune',()=>0).symbol,'Fehu');assert.throws(()=>drawOracle('unknown'));
});
test('candle expiry removes only own reaction and preserves concurrent candles',async()=>{
 const f=fixture();const old=JSON.stringify({figureId:f.p.id,threadId:f.thread,messageId:'1555666568409653333',expires:1});const future=JSON.stringify({figureId:f.p.id,threadId:f.thread,messageId:'1555666568409653444',expires:9999999999999});
 f.lists.set(`${PREFIX}:candles`,[old,future]);await f.runtime.expireCandles();
 assert.equal(f.calls.filter(c=>c.method==='DELETE').length,1);assert(f.calls.at(-1).path.endsWith('/@me'));assert.deepEqual(f.lists.get(`${PREFIX}:candles`),[future]);
});
test('ordinary authorized observations do not produce messages',async()=>{
 const f=fixture();await f.runtime.message({id:'m1',channel_id:'1555340315525648455',guild_id:f.guildId,author:{id:'op',username:'Bart'},content:'thanks Nyx'});
 assert.equal(f.lists.get(`${PREFIX}:observed`).length,1);assert(!f.calls.some(c=>c.method==='POST'));
});
test('wrong guild, webhook and bot events cannot trigger shrine replies',async()=>{
 const f=fixture();for(const extra of [{guild_id:'other'},{webhook_id:'w'},{author:{bot:true}}])await f.runtime.message({id:'m',guild_id:f.guildId,channel_id:f.thread,author:{id:'op'},content:'hi',...extra});assert.equal(f.calls.length,0);
});
test('forum delivery includes exact thread ID and suppresses mass mentions',async()=>{
 const f=fixture();await f.runtime.deliver(f.p,f.thread,'An omen. @everyone','0');const send=f.calls.find(c=>c.method==='POST');assert(send.path.includes(`thread_id=${f.thread}`));assert.deepEqual(send.body.allowed_mentions,{parse:[]});assert(!send.body.content.includes('@everyone'));
 assert.equal(f.lists.get(`${PREFIX}:durable-outbox`).length,1);
});
test('provisioning retries adopt an existing thread rather than create a duplicate',async()=>{
 const f=fixture();f.values.clear();let creates=0,starter;f.runtime.roster={people:[f.p],version:'v1'};
 const {shrineTitle}=await import('../../lib/altar/core.mjs');const thread={id:f.thread,type:11,parent_id:FORUM_ID,guild_id:f.guildId,name:shrineTitle(f.p)};
 f.runtime.api=async(path,method='GET',body)=>{if(method==='POST')creates++;if(path.includes('/messages/')){if(method==='PATCH')starter=body;return {...starter,id:f.thread,channel_id:f.thread};}if(path===`/channels/${FORUM_ID}`)return {type:15,guild_id:f.guildId,available_tags:['Dynasty','Ancestor','Human-controlled'].map((name,i)=>({name,id:String(i)}))};if(path.includes('/threads/active'))return {threads:[thread]};if(path.includes('/archived/'))return {threads:[],has_more:false};return thread;};
 await f.runtime.provision();await f.runtime.provision();assert.equal(creates,0);assert.equal(f.values.get(`${PREFIX}:shrine:${f.p.id}`),f.thread);
});
test('a god may visit another registered shrine but never an unregistered altar thread',async()=>{
 const f=fixture(),second='1555666568409653555';
 f.values.set(`${PREFIX}:thread:${second}`,f.p.id);f.setChannel({id:second,type:11,parent_id:FORUM_ID,guild_id:f.guildId});
 const receipt=await f.runtime.deliver(f.p,second,'A visit.','0');assert(receipt);
 f.values.delete(`${PREFIX}:thread:${second}`);
 await assert.rejects(f.runtime.deliver(f.p,second,'Unregistered.','0'),/inactive_or_unregistered/);
});
test('a locked retired ancestor gets one active replacement, with history preserved and retry adoption',async()=>{
 const f=fixture();f.runtime.roster={people:[f.p],policyVersion:'v3'};
 const {shrineTitle}=await import('../../lib/altar/core.mjs');
 const old={id:f.thread,type:11,parent_id:FORUM_ID,guild_id:f.guildId,name:shrineTitle(f.p),thread_metadata:{archived:true,locked:true}};
 const fresh={...old,id:'1555666568409653777',thread_metadata:{archived:false,locked:false}};
 let creates=0,failSave=true,starter;
 const set=f.runtime.store.set;
 f.runtime.store.set=async(k,v,o)=>{if(k===`${PREFIX}:shrine:${f.p.id}`&&v===fresh.id&&failSave){failSave=false;throw new Error('transient_store_failure');}return set(k,v,o);};
 f.runtime.api=async(path,method='GET',body)=>{
  if(path.includes('/messages/')){if(method==='PATCH')starter=body;return {...starter,id:fresh.id,channel_id:fresh.id};}
  if(path===`/channels/${FORUM_ID}`)return {type:15,guild_id:f.guildId,available_tags:['Dynasty','Ancestor','Children bridge'].map((name,i)=>({name,id:String(i)}))};
  if(path.includes('/threads/active'))return {threads:creates?[fresh]:[]};
  if(path.includes('/archived/'))return {threads:[old],has_more:false};
  if(path===`/channels/${FORUM_ID}/threads`&&method==='POST'){creates++;return fresh;}
  if(path===`/channels/${old.id}`&&method==='PATCH')throw Object.assign(new Error('discord_http_403'),{status:403});
  return path===`/channels/${old.id}`?old:fresh;
 };
 await assert.rejects(f.runtime.provision(),/transient_store_failure/);
 await f.runtime.provision();await f.runtime.provision();
 assert.equal(creates,1);assert.equal(f.values.get(`${PREFIX}:shrine:${f.p.id}`),fresh.id);
 assert(!f.values.has(`${PREFIX}:thread:${old.id}`));assert.equal(f.values.get(`${PREFIX}:thread:${fresh.id}`),f.p.id);
 assert.deepEqual(old.thread_metadata,{archived:true,locked:true});
});
test('retired Children and nondivine references are excluded from active routing',async()=>{
 const f=fixture();const retired={...f.other,humanControlled:false,shrineEligible:false,childrenKey:'rose'};
 const runtime=new AltarRuntime({store:f.runtime.store,api:f.runtime.api,generate:f.runtime.generate,roster:{people:[f.p,retired]},guildId:f.guildId,operatorId:'op',applicationId:'altar'});
 assert(!runtime.people.has(retired.id));await assert.rejects(runtime.deliver(retired,f.thread,'No shrine.','0'),/ineligible_figure/);
});
test('a Child visit uses the Children application and its known portrait, then stops after three turns',async()=>{
 const f=fixture(),child={id:'child:orpheus',childrenKey:'orpheus',name:'Orpheus',displayName:'Orpheus',humanControlled:false,avatarData:'portrait'};
 f.runtime.visitors.set(child.id,child);f.runtime.childrenApplicationId='children';let childSends=0;
 f.runtime.childApi=async(path,method='GET',body)=>{
   if(path.endsWith('/webhooks'))return [{id:'childhook',token:'secret',application_id:'children'}];
   if(method==='POST'){childSends++;return {id:'1555666568409653999',content:body.content};}return {};
 };
 f.runtime.api=async(path,method='GET',body)=>{
   if(path.endsWith('/webhooks'))return [{id:'altarhook',token:'secret',application_id:'altar'}];
   if(method==='POST')return {id:'1555666568409653888',content:body.content};
   return {id:f.thread,type:11,parent_id:FORUM_ID,guild_id:f.guildId};
 };
 let generations=0;f.runtime.generate=async p=>{generations++;return `${p.name} turn ${generations}`;};
 await f.runtime.converseWithChild(child,f.thread,'Ask the host');assert.equal(childSends,2);assert.equal(generations,3);
 const before=generations;await f.runtime.message({id:'1555666568409653999',channel_id:f.thread,guild_id:f.guildId,webhook_id:'childhook',author:{id:'childhook',username:'Orpheus',bot:true},content:'Orpheus turn 3'});assert.equal(generations,before);
});
test('Children webhook payload is suppressed even when the Gateway arrives before REST receipt',async()=>{
 const f=fixture(),child={...f.p,id:'child:orpheus',childrenKey:'orpheus',displayName:'Orpheus'};
 f.runtime.visitors.set(child.id,child);f.runtime.childrenApplicationId='children';let generated=0;f.runtime.generate=async()=>{generated++;return 'new';};
 f.runtime.childApi=async(path,method='GET',body)=>{
  if(path.endsWith('/webhooks'))return [{id:'childhook',token:'secret',application_id:'children'}];
  if(method==='POST'){
   await f.runtime.message({id:'1555666568409653999',channel_id:f.thread,guild_id:f.guildId,webhook_id:'childhook',author:{id:'childhook',username:'Orpheus',bot:true},content:body.content});return {id:'1555666568409653999',content:body.content};
  }return {};
 };
 await f.runtime.deliver(child,f.thread,'Hello from Orpheus','0');assert.equal(generated,0);
});


test('shared ELAED seal fills only missing persona icons',()=>{
 const people=[{name:'Nyx'},{name:'Cernunnos',avatarData:'custom'}];
 assert.equal(applyElaedFallbackAvatar(people),1);
 assert.equal(people[0].avatarData,ELAED_ANCESTRAL_SEAL_AVATAR_DATA_URI);
 assert.equal(people[1].avatarData,'custom');
 assert(ELAED_ANCESTRAL_SEAL_AVATAR_DATA_URI.startsWith('data:image/jpeg;base64,'));
});


test('Sacred Hive membership recognizes canonical shrine offices without tagging Cab II',()=>{
  for(const name of ['Ah-Muzen-Cab "Honey, Content" I','Colel Cab','Aristaeus','Melissae Artemis','Melisseus','Mellona','Oshun','Austėja','Bubilas','Bhrāmarī','Ra'])assert(isSacredHiveMember({displayName:name}),name);
  assert(!isSacredHiveMember({displayName:"Ah-Muzen-Cab 'Cab' II"}));
  assert(!isSacredHiveMember({displayName:'Perses'}));
});

test('Perses is promoted to shrine ownership while retaining Children delivery identity',()=>{
  const f=fixture();
  const perses={id:'elaed-cccccccccccc-1',name:'Perses',displayName:'Perses',relationships:[],humanControlled:false,shrineEligible:false};
  const visitor={...perses,id:'child:perses',childrenKey:'perses',avatarData:'perses-portrait'};
  const runtime=new AltarRuntime({store:f.runtime.store,api:f.runtime.api,childApi:async()=>({}),childrenApplicationId:'children',generate:f.runtime.generate,roster:{people:[f.p,perses],visitors:[visitor]},guildId:f.guildId,operatorId:'op',applicationId:'altar'});
  const promoted=[...runtime.people.values()].find(p=>p.name==='Perses');
  assert(promoted);assert.equal(promoted.id,perses.id);assert.equal(promoted.shrineEligible,true);assert.equal(promoted.childrenKey,'perses');assert.equal(promoted.avatarData,'perses-portrait');
  assert(![...runtime.visitors.values()].some(p=>p.childrenKey==='perses'));
});


test('current-policy locked shrine is replaced when new forum tags must be applied',async()=>{
  const f=fixture();f.runtime.roster={people:[f.p],policyVersion:'v3'};f.runtime.provisionRoster=[f.p];
  f.values.set(`${PREFIX}:policy:${f.p.id}`,'v3');
  f.values.set(`${PREFIX}:presentation:${f.p.id}`,'20261002-minimal-v1');
  const old={id:f.thread,type:11,parent_id:FORUM_ID,guild_id:f.guildId,name:shrineTitle(f.p),applied_tags:[],thread_metadata:{archived:true,locked:true}};
  const fresh={...old,id:'1555666568409654777',applied_tags:[],thread_metadata:{archived:false,locked:false}};
  let creates=0;
  f.runtime.api=async(path,method='GET',body)=>{
    if(path===`/channels/${FORUM_ID}`)return {type:15,guild_id:f.guildId,flags:16,available_tags:['Dynasty','Ancestor','Children bridge','Sacred Hive'].map((name,i)=>({name,id:String(i+1)}))};
    if(path.includes('/threads/active'))return {threads:creates?[fresh]:[]};
    if(path.includes('/archived/'))return {threads:[old],has_more:false};
    if(path===`/channels/${FORUM_ID}/threads`&&method==='POST'){creates++;return fresh;}
    if(path===`/channels/${old.id}`&&method==='PATCH')throw Object.assign(new Error('discord_http_403'),{status:403});
    if(path===`/channels/${fresh.id}`&&method==='PATCH')return {...fresh,applied_tags:body.applied_tags};
    return path===`/channels/${old.id}`?old:fresh;
  };
  await f.runtime.provision();
  assert.equal(creates,1);
  assert.equal(f.values.get(`${PREFIX}:shrine:${f.p.id}`),fresh.id);
  assert(!f.values.has(`${PREFIX}:thread:${old.id}`));
  assert.equal(f.values.get(`${PREFIX}:thread:${fresh.id}`),f.p.id);
});
