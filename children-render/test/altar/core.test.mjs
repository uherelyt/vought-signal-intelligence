import test from 'node:test';
import assert from 'node:assert/strict';
import {AltarRuntime,FORUM_ID,PREFIX,validThread,drawOracle,TAROT,RUNES} from '../../lib/altar/core.mjs';

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
 const f=fixture();f.values.clear();let creates=0;f.runtime.roster={people:[f.p],version:'v1'};
 const {shrineTitle}=await import('../../lib/altar/core.mjs');const thread={id:f.thread,type:11,parent_id:FORUM_ID,guild_id:f.guildId,name:shrineTitle(f.p)};
 f.runtime.api=async(path,method='GET')=>{if(method==='POST')creates++;if(path===`/channels/${FORUM_ID}`)return {type:15,guild_id:f.guildId,available_tags:['Dynasty','Ancestor','Human-controlled'].map((name,i)=>({name,id:String(i)}))};if(path.includes('/threads/active'))return {threads:[thread]};if(path.includes('/archived/'))return {threads:[],has_more:false};return thread;};
 await f.runtime.provision();await f.runtime.provision();assert.equal(creates,0);assert.equal(f.values.get(`${PREFIX}:shrine:${f.p.id}`),f.thread);
});
