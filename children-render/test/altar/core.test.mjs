import test from 'node:test';
import assert from 'node:assert/strict';
import {AltarRuntime,FORUM_ID,PREFIX,validThread,drawOracle,TAROT,RUNES,shrineTitle,isSacredHiveMember,migrateRosterTo4Oct,SHRINE_SOURCE_VOICE_VERSION,EMPIRICAL_PROTOCOL_VERSION,INCARNATE_SHRINE_ROUTING_VERSION,GREEK_RELIGION_POLICY_VERSION,DELPHIC_ORACLE_VERSION,DELPHIC_ORACLE_TITLE,DELPHIC_ORACLE_HOLDER,DELPHIC_ORACLE_STARTER,DELPHIC_ORACLE_PORTRAIT_URL,DELPHIC_ORACLE_PORTRAIT_VERSION,delphicOracleSpec,validateEmpiricalChallengeSpec,sealEmpiricalChallenge,empiricalClaimLooksTestable,incarnateShrineRoute} from '../../lib/altar/core.mjs';
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
test('Delphic oracle spec is Apollo-linked, versioned, and interpretive',()=>{
 const spec=delphicOracleSpec('Should I cross the river?');
 assert.equal(spec.version,DELPHIC_ORACLE_VERSION);
 assert.equal(spec.greekReligionPolicyVersion,GREEK_RELIGION_POLICY_VERSION);
 assert.equal(spec.institution,DELPHIC_ORACLE_TITLE);
 assert.equal(spec.oracle,'Pythia');
 assert.equal(spec.holder,'Phemonoe');
 assert.equal(spec.holderGreekName,'Φημονόη');
 assert.equal(spec.holderEpithet,'Delphic Bee');
 assert.equal(spec.holderApparentAge,50);
 assert.equal(spec.holderHistoricalAge,'unknown');
 assert.equal(DELPHIC_ORACLE_HOLDER.patron,'Apollo');
 assert.match(spec.relationshipToErelyt,/confidante/);
 assert.match(spec.relationshipToAhMuzenCab,/diplomatic_contact/);
 assert.match(DELPHIC_ORACLE_STARTER,/Phemonoe/);
 assert.match(DELPHIC_ORACLE_STARTER,/Strabo/);
 assert.match(DELPHIC_ORACLE_STARTER,/Pindar/);
 assert.equal(spec.portraitUrl,DELPHIC_ORACLE_PORTRAIT_URL);
 assert.equal(spec.portraitVersion,DELPHIC_ORACLE_PORTRAIT_VERSION);
 assert.match(DELPHIC_ORACLE_PORTRAIT_URL,/phemonoe-pythia-portrait\.jpg$/);
 assert.equal(spec.patron,'Apollo');
 assert.equal(spec.interpretationStatus,'symbolic_research_required');
 assert.deepEqual(spec.allowedInterpretiveThemes,['katabasis','divine_mania','the_gods_collectively','divine_immanence','mystery_current_symbolism']);
 assert.equal(spec.charonCoinSubstitute,'us_quarter_symbolic_coin_for_passage');
 assert.match(spec.style,/ambiguous/);
 assert.equal(spec.languagePolicy,'ancient_greek_primary_english_translation_qa_approved');
 assert.match(spec.version,/ancient-greek/);
 assert.throws(()=>delphicOracleSpec(' '),/oracle_question_required/);
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
test('generated shrine replies are marked source-first and research-required',async()=>{
 const f=fixture();await f.runtime.reply(f.p,f.thread,'What should I notice?');
 const event=JSON.parse(f.lists.get(`${PREFIX}:durable-outbox`)[0]);
 assert.equal(event.sourceVoiceVersion,SHRINE_SOURCE_VOICE_VERSION);
 assert.equal(event.interpretationStatus,'research_required');
 assert.equal(event.sourceGrounding,'source_first_dossier');
});
test('incarnate shrine routing separates external, own-source, and explicit divine-diplomatic petitions',()=>{
 const external=incarnateShrineRoute({name:'Nyx',displayName:'Nyx'},'I want to speak with you.');
 assert.equal(external.routingVersion,INCARNATE_SHRINE_ROUTING_VERSION);
 assert.equal(external.petitionerIdentity,'Erelyt');
 assert.equal(external.petitionerOntology,'divine_incarnation_mortal_supe_embodiment');
 assert.equal(external.mode,'incarnation_to_external_divine');
 assert.equal(external.ahMuzenCabSpeaking,false);

 const own=incarnateShrineRoute({name:'Ah-Muzen-Cab "Honey, Content"  I',displayName:'Ah-Muzen-Cab',childrenKey:'ah_muzen_cab'},'I am here.');
 assert.equal(own.mode,'incarnation_to_source_communion');
 assert.equal(own.targetRelation,'own_divine_soul_source');
 assert.equal(own.ahMuzenCabSpeaking,false);

 const diplomatic=incarnateShrineRoute({name:'Zeus',displayName:'Zeus'},'I am speaking on behalf of Ah-Muzen-Cab I.');
 assert.equal(diplomatic.mode,'divine_diplomatic_through_incarnation');
 assert.equal(diplomatic.ahMuzenCabSpeaking,true);
});

test('ordinary shrine reply records incarnate petitioner routing',async()=>{
 const f=fixture();await f.runtime.reply(f.p,f.thread,'I am asking Nyx for guidance.');
 const event=JSON.parse(f.lists.get(`${PREFIX}:durable-outbox`)[0]);
 assert.equal(event.incarnationRoutingVersion,INCARNATE_SHRINE_ROUTING_VERSION);
 assert.equal(event.petitionMode,'incarnation_to_external_divine');
 assert.equal(event.petitionerIdentity,'Erelyt');
 assert.equal(event.divineSoulSource,'Ah-Muzen-Cab I');
 assert.equal(event.ahMuzenCabSpeaking,false);
});
test('empirical challenge criteria require a future deadline and discriminating outcomes',()=>{
 const now=Date.parse('2026-10-06T03:00:00Z');
 const valid=validateEmpiricalChallengeSpec({mode:'future_prediction',question:'Which exact event will occur?',successCriterion:'The named event occurs before the frozen deadline.',failureCriterion:'The named event does not occur before the frozen deadline.',deadline:'2026-10-10T00:00:00Z'},now);
 assert.equal(valid.mode,'future_prediction');
 assert.equal(valid.deadline,'2026-10-10T00:00:00.000Z');
 assert.throws(()=>validateEmpiricalChallengeSpec({...valid,deadline:'2026-10-05T00:00:00Z'},now),/deadline/);
 assert.throws(()=>validateEmpiricalChallengeSpec({...valid,successCriterion:'same criterion',failureCriterion:'same criterion'},now),/not_discriminating/);
});

test('empirical seals change whenever the frozen record changes',()=>{
 const base={protocolVersion:EMPIRICAL_PROTOCOL_VERSION,challengeId:'x',claim:'Event A occurs.',status:'PREREGISTERED_UNVERIFIED'};
 const one=sealEmpiricalChallenge(base),two=sealEmpiricalChallenge({...base,claim:'Event B occurs.'});
 assert.match(one.sha256,/^[a-f0-9]{64}$/);
 assert.notEqual(one.sha256,two.sha256);
});

test('vague or interrogative empirical claims fail closed',()=>{
 assert(empiricalClaimLooksTestable('Candidate X receives exactly 51.2 percent of certified votes.'));
 assert(!empiricalClaimLooksTestable('Maybe something important will happen soon.'));
 assert(!empiricalClaimLooksTestable('Will the river rise?'));
 assert(!empiricalClaimLooksTestable('NO TESTABLE CLAIM'));
});

test('empirical challenge posts one sealed unverified claim with durable metadata',async()=>{
 const f=fixture();
 f.runtime.generate=async()=> 'Candidate X receives exactly 51.2 percent of certified votes.';
 const result=await f.runtime.empiricalChallenge(f.p,f.thread,{mode:'future_prediction',question:'State the exact certified vote share for Candidate X.',successCriterion:'The official certified result is exactly 51.2 percent.',failureCriterion:'The official certified result is any value other than exactly 51.2 percent.',deadline:'2030-01-01T00:00:00Z'});
 assert.equal(result.status,'PREREGISTERED_UNVERIFIED');
 assert.equal(result.protocolVersion,EMPIRICAL_PROTOCOL_VERSION);
 assert.match(result.sha256,/^[a-f0-9]{64}$/);
 const event=JSON.parse(f.lists.get(`${PREFIX}:durable-outbox`)[0]);
 assert.equal(event.eventType,'empirical_challenge_preregistered');
 assert.equal(event.empiricalChallengeId,result.challengeId);
 assert.equal(event.empiricalStatus,'PREREGISTERED_UNVERIFIED');
 assert.equal(event.interpretationStatus,'experimental_unverified');
});
test('empirical outcomes remain pending review and preserve the original seal',async()=>{
 const f=fixture();
 f.runtime.generate=async()=> 'Candidate X receives exactly 51.2 percent of certified votes.';
 const sealed=await f.runtime.empiricalChallenge(f.p,f.thread,{mode:'future_prediction',question:'State the exact certified vote share for Candidate X.',successCriterion:'The official certified result is exactly 51.2 percent.',failureCriterion:'The official certified result is any value other than exactly 51.2 percent.',deadline:'2030-01-01T00:00:00Z'});
 const updated=await f.runtime.recordEmpiricalOutcome(f.thread,sealed.challengeId,'The official certified result was 51.2 percent.','https://example.org/certified-result');
 assert.equal(updated.status,'OUTCOME_RECORDED_PENDING_REVIEW');
 assert.equal(updated.sha256,sealed.sha256);
 const event=JSON.parse(f.lists.get(`${PREFIX}:durable-outbox`)[0]);
 assert.equal(event.eventType,'empirical_outcome_recorded');
 assert.equal(event.empiricalStatus,'OUTCOME_RECORDED_PENDING_REVIEW');
 await assert.rejects(f.runtime.recordEmpiricalOutcome(f.thread,sealed.challengeId,'Duplicate result.','https://example.org/duplicate'),/already_recorded/);
});
test('separate New Gods and Old Gods tags provision without reclassifying existing shrines',async()=>{
 const f=fixture();f.runtime.roster={people:[f.p],version:'v1'};f.runtime.provisionRoster=[f.p];f.runtime.people=new Map([[f.p.id,f.p]]);
 const thread={id:f.thread,type:11,parent_id:FORUM_ID,guild_id:f.guildId,name:shrineTitle(f.p),applied_tags:['0']};
 let tags=['Dynasty','Ancestor','Immediate Family','Gift Source','Source Lineage','Children bridge','Sacred Hive','Oracle'].map((name,i)=>({id:String(i),name}));
 let patches=0,creations=0;
 f.runtime.api=async(path,method='GET',body)=>{
   if(path===`/channels/${FORUM_ID}`){
     if(method==='PATCH'){
       patches++;
       tags=body.available_tags.map((entry,i)=>({...entry,id:entry.id??String(i)}));
     }
     return {type:15,guild_id:f.guildId,available_tags:tags};
   }
   if(path===`/channels/${FORUM_ID}/threads`&&method==='POST')creations++;
   if(path.includes('/threads/active'))return {threads:[thread]};
   if(path.includes('/archived/'))return {threads:[],has_more:false};
   if(path.includes('/messages/'))return {id:'m1',content:body?.content??'Shrine'};
   return thread;
 };
 await f.runtime.provision();
 await f.runtime.provision();
 assert.equal(patches,1);
 assert.equal(creations,0);
 assert.equal(tags.filter(t=>t.name==='New Gods').length,1);
 assert.equal(tags.filter(t=>t.name==='Old Gods').length,1);
 assert.equal(tags.filter(t=>t.name==='New Gods vs Old Gods').length,0);
 assert.deepEqual(thread.applied_tags,['0']);
});
test('provisioning retries adopt an existing thread rather than create a duplicate',async()=>{
 const f=fixture();f.values.clear();let creates=0,starter;f.runtime.roster={people:[f.p],version:'v1'};f.runtime.provisionRoster=[f.p];f.runtime.people=new Map([[f.p.id,f.p]]);
 const {shrineTitle}=await import('../../lib/altar/core.mjs');const thread={id:f.thread,type:11,parent_id:FORUM_ID,guild_id:f.guildId,name:shrineTitle(f.p)};
 f.runtime.api=async(path,method='GET',body)=>{if(path===`/channels/${FORUM_ID}/threads`&&method==='POST')creates++;if(path.includes('/messages/')){if(method==='PATCH')starter=body;return {...starter,id:f.thread,channel_id:f.thread};}if(path===`/channels/${FORUM_ID}`)return {type:15,guild_id:f.guildId,available_tags:['Dynasty','Ancestor','Immediate Family','Gift Source','Source Lineage','Children bridge','Sacred Hive','Oracle','New Gods','Old Gods','Human-controlled'].map((name,i)=>({name,id:String(i)}))};if(path.includes('/threads/active'))return {threads:[thread]};if(path.includes('/archived/'))return {threads:[],has_more:false};return thread;};
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
 const f=fixture();f.runtime.roster={people:[f.p],policyVersion:'v3'};f.runtime.provisionRoster=[f.p];f.runtime.people=new Map([[f.p.id,f.p]]);
 const {shrineTitle}=await import('../../lib/altar/core.mjs');
 const old={id:f.thread,type:11,parent_id:FORUM_ID,guild_id:f.guildId,name:shrineTitle(f.p),thread_metadata:{archived:true,locked:true}};
 const fresh={...old,id:'1555666568409653777',thread_metadata:{archived:false,locked:false}};
 let creates=0,failSave=true,starter;
 const set=f.runtime.store.set;
 f.runtime.store.set=async(k,v,o)=>{if(k===`${PREFIX}:shrine:${f.p.id}`&&v===fresh.id&&failSave){failSave=false;throw new Error('transient_store_failure');}return set(k,v,o);};
 f.runtime.api=async(path,method='GET',body)=>{
  if(path.includes('/messages/')){if(method==='PATCH')starter=body;return {...starter,id:fresh.id,channel_id:fresh.id};}
  if(path===`/channels/${FORUM_ID}`)return {type:15,guild_id:f.guildId,available_tags:['Dynasty','Ancestor','Immediate Family','Gift Source','Source Lineage','Children bridge','Sacred Hive','Oracle','New Gods','Old Gods'].map((name,i)=>({name,id:String(i)}))};
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

test('Perses and Thanatos are promoted to Dynasty shrine ownership and leave Children delivery',()=>{
  const f=fixture();
  const perses={id:'elaed-cccccccccccc-1',name:'Perses',displayName:'Perses',relationships:[],humanControlled:false,shrineEligible:false};
  const thanatos={id:'elaed-dddddddddddd-1',name:'Thanatos',displayName:'Thanatos',relationships:[],humanControlled:false,shrineEligible:false};
  const visitors=[
    {...perses,id:'child:perses',childrenKey:'perses',avatarData:'perses-portrait',senderName:'Perses'},
    {...thanatos,id:'child:thanatos',childrenKey:'thanatos',avatarData:'thanatos-portrait',senderName:'Thanatos'},
  ];
  const runtime=new AltarRuntime({store:f.runtime.store,api:f.runtime.api,childApi:async()=>({}),childrenApplicationId:'children',generate:f.runtime.generate,roster:{people:[f.p,perses,thanatos],visitors},guildId:f.guildId,operatorId:'op',applicationId:'altar'});
  const promotedPerses=[...runtime.people.values()].find(p=>p.name==='Perses');
  const promotedThanatos=[...runtime.people.values()].find(p=>p.name==='Thanatos');
  for(const [promoted,key,portrait] of [[promotedPerses,'perses','perses-portrait'],[promotedThanatos,'thanatos','thanatos-portrait']]){
    assert(promoted);assert.equal(promoted.shrineEligible,true);assert.equal(promoted.childrenKey,undefined);assert.equal(promoted.formerChildrenKey,key);assert.equal(promoted.avatarData,portrait);
  }
  assert(![...runtime.visitors.values()].some(p=>['perses','thanatos'].includes(p.childrenKey)));
});


test('Asclepius owns one shared shrine identity and still delivers through the Children application',async()=>{
  const f=fixture();
  const rosterAsclepius={id:'elaed-asclepius-1',name:'Asclepius',displayName:'Asclepius',relationships:[],humanControlled:false,shrineEligible:true,divineStatus:'god'};
  const visitor={...rosterAsclepius,id:'child:asclepius',childrenKey:'asclepius',avatarData:'asclepius-portrait',senderName:'Asclepius'};
  const runtime=new AltarRuntime({
    store:f.runtime.store,
    api:f.runtime.api,
    childApi:async()=>({}),
    childrenApplicationId:'children',
    generate:f.runtime.generate,
    roster:{people:[f.p,rosterAsclepius],visitors:[visitor]},
    guildId:f.guildId,
    operatorId:'op',
    applicationId:'altar',
  });
  const shared=runtime.people.get(rosterAsclepius.id);
  assert(shared);
  assert.equal(shared.shrineEligible,true);
  assert.equal(shared.childrenKey,'asclepius');
  assert.equal(shared.avatarData,'asclepius-portrait');
  assert.equal(shared.senderName,'Asclepius');
  assert(!runtime.visitors.has('child:asclepius'));
  assert.equal([...runtime.people.values()].filter(p=>p.childrenKey==='asclepius').length,1);
});

test('4 Oct migration adds current Family Echo records and promotes only sourced divine additions',()=>{
  const people=Array.from({length:239},(_,i)=>({id:`elaed-${i.toString(16).padStart(12,'0')}-1`,name:`Legacy ${i}`,displayName:`Legacy ${i}`,relationships:[],humanControlled:false,shrineEligible:false}));
  people[0]={...people[0],name:'Ah-Muzen-Cab "Honey, Content"  I',displayName:'Ah-Muzen-Cab "Honey, Content"  I'};
  people[1]={...people[1],name:`Ah-Muzen-Cab "'Cab"  II`,displayName:`Ah-Muzen-Cab "'Cab"  II`};
  people[2]={...people[2],name:'Distress of The Endless "Despair of The Endless, Aponoia" Endless',displayName:'Distress of The Endless "Despair of The Endless, Aponoia" Endless'};
  people[3]={...people[3],name:'Yahweh "God The Father, Presence"',displayName:'Yahweh "God The Father, Presence"'};
  const migrated=migrateRosterTo4Oct({people,visitors:[],requestedAncestorCount:0});
  assert.equal(migrated.people.length,248);
  for(const name of ['Anteros','Deimos','Harmonia','Kratos','Phobos','Belial','Abaddon','Ho Theos',`Ah-Muzen-Cab "'Cab"  II`,'Distress of The Endless "Despair of The Endless, Aponoia" Endless']){
    assert.equal(migrated.people.find(p=>p.name===name)?.shrineEligible,true,name);
  }
  assert.equal(migrated.people.find(p=>p.name==='Atreus')?.shrineEligible,false);
  assert.equal(migrated.people.find(p=>p.name==='Belial')?.divineStatus,'infernal_king');
  assert.equal(migrated.people.find(p=>p.name==='Abaddon')?.divineStatus,'angel_of_the_abyss');
  const hoTheos=migrated.people.find(p=>p.name==='Ho Theos');
  assert.equal(hoTheos?.divineStatus,'philosophical_divine_unity');
  assert.deepEqual(hoTheos?.relationships,['Syncretic counterpart: Yahweh "God The Father, Presence"']);
  assert.match(hoTheos?.relationshipReview?.[0]??'',/counterpart\/correspondence/);
  const kratos=migrated.people.find(p=>p.name==='Kratos');
  assert.deepEqual(kratos.relationships,['Biological mother: Callisto','Biological father: Zeus']);
  assert.match(kratos.relationshipReview[0],/God of War branch/);
  const yahweh=migrated.people.find(p=>p.name==='Yahweh "God The Father, Presence"');
  assert(yahweh.relationships.includes('Syncretic counterpart: Ho Theos'));
  assert.match(yahweh.relationshipReview.at(-1),/not biological genealogy/);
  assert.match(migrated.people.find(p=>p.name==='Ah-Muzen-Cab "Honey, Content"  I').relationshipReview[0],/no biological parent fields/);
  assert.equal(migrated.requestedAncestorCount,11);
  assert.equal(migrated.requestedGiftSourceCount,6);
  assert.equal(migrated.requestedSourceLineageCount,6);
  assert.equal(migrated.requestedImmediateFamilyCount,5);
  assert.equal(migrated.combinedLineageIdentityCount,28);
  assert.equal(migrated.people.find(p=>p.name==='Ah-Muzen-Cab "Honey, Content"  I')?.lineageClass,'immediate_family');
});

test('any explicitly divine roster identity becomes shrine-eligible',()=>{
  const people=Array.from({length:239},(_,i)=>({id:`elaed-${i.toString(16).padStart(12,'0')}-1`,name:`Legacy ${i}`,displayName:`Legacy ${i}`,relationships:[],humanControlled:false,shrineEligible:false}));
  people[17]={...people[17],name:'Future Divine Figure',displayName:'Future Divine Figure',divineStatus:'divine_being'};
  const migrated=migrateRosterTo4Oct({people,visitors:[],requestedAncestorCount:0});
  const figure=migrated.people.find(p=>p.name==='Future Divine Figure');
  assert.equal(figure?.shrineEligible,true);
  assert.equal(figure?.divineStatus,'divine_being');
});

test('a divine vessel persona gets one shared shrine without a duplicate visitor identity',()=>{
  const f=fixture();
  const cab={id:'elaed-cccccccccccc-1',name:`Ah-Muzen-Cab "'Cab"  II`,displayName:`Ah-Muzen-Cab "'Cab"  II`,relationships:[],humanControlled:false,shrineEligible:true,divineStatus:'divine_incarnation'};
  const visitor={...cab,id:'child:cab',childrenKey:'cab',avatarData:'cab-portrait'};
  const runtime=new AltarRuntime({store:f.runtime.store,api:f.runtime.api,childApi:async()=>({}),childrenApplicationId:'children',generate:f.runtime.generate,roster:{people:[f.p,cab],visitors:[visitor]},guildId:f.guildId,operatorId:'op',applicationId:'altar'});
  const shared=runtime.people.get(cab.id);
  assert.equal(shared.childrenKey,'cab');
  assert.equal(shared.avatarData,'cab-portrait');
  assert(!runtime.visitors.has('child:cab'));
  assert.equal([...runtime.people.values()].filter(p=>p.childrenKey==='cab').length,1);
});

test('current-policy locked shrine is replaced when new forum tags must be applied',async()=>{
  const f=fixture();f.runtime.roster={people:[f.p],policyVersion:'v3'};f.runtime.provisionRoster=[f.p];
  f.values.set(`${PREFIX}:policy:${f.p.id}`,'v3');
  f.values.set(`${PREFIX}:presentation:${f.p.id}`,'20261002-minimal-v1');
  const old={id:f.thread,type:11,parent_id:FORUM_ID,guild_id:f.guildId,name:shrineTitle(f.p),applied_tags:[],thread_metadata:{archived:true,locked:true}};
  const fresh={...old,id:'1555666568409654777',applied_tags:[],thread_metadata:{archived:false,locked:false}};
  let creates=0;
  f.runtime.api=async(path,method='GET',body)=>{
    if(path===`/channels/${FORUM_ID}`)return {type:15,guild_id:f.guildId,flags:16,available_tags:['Dynasty','Ancestor','Immediate Family','Gift Source','Source Lineage','Children bridge','Sacred Hive','Oracle','New Gods','Old Gods'].map((name,i)=>({name,id:String(i+1)}))};
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


test('Melisseus remains active under explicit sourced divinity status',()=>{
  const f=fixture();
  const melisseus={id:'elaed-dddddddddddd-1',name:'Melisseus',displayName:'Melisseus',relationships:[],humanControlled:false,shrineEligible:true,divineStatus:'god'};
  const runtime=new AltarRuntime({store:f.runtime.store,api:f.runtime.api,generate:f.runtime.generate,roster:{people:[f.p,melisseus]},guildId:f.guildId,operatorId:'op',applicationId:'altar'});
  const promoted=runtime.people.get(melisseus.id);
  assert(promoted);assert.equal(promoted.shrineEligible,true);assert(isSacredHiveMember(promoted));
});

test('locked retired references are deleted while the oldest snowflake remains the shrine-order key',async()=>{
  const f=fixture();f.values.clear();
  const retired={id:'elaed-eeeeeeeeeeee-1',name:'Old God',displayName:'Old God',relationships:[],humanControlled:false,shrineEligible:false};
  const oldId='1555666568409653001';
  const old={id:oldId,type:11,parent_id:FORUM_ID,guild_id:f.guildId,name:'Old God',thread_metadata:{archived:true,locked:true}};
  const runtime=new AltarRuntime({store:f.runtime.store,api:null,generate:f.runtime.generate,roster:{people:[f.p,retired],policyVersion:'v3'},guildId:f.guildId,operatorId:'op',applicationId:'altar'});
  let deleted=false;
  runtime.api=async(path,method='GET',body)=>{
    if(path===`/channels/${FORUM_ID}`)return {type:15,guild_id:f.guildId,flags:0,available_tags:[{name:'Dynasty',id:'1'},{name:'Ancestor',id:'2'},{name:'Immediate Family',id:'3'},{name:'Gift Source',id:'4'},{name:'Source Lineage',id:'5'},{name:'Children bridge',id:'6'},{name:'Sacred Hive',id:'7'},{name:'Oracle',id:'8'}]};
    if(path.includes('/threads/active'))return {threads:[]};
    if(path.includes('/archived/'))return {threads:[old],has_more:false};
    if(path===`/channels/${FORUM_ID}/threads`&&method==='POST')return {id:f.thread,type:11,parent_id:FORUM_ID,guild_id:f.guildId,name:'Nyx',applied_tags:['1'],thread_metadata:{archived:false,locked:false},message:{id:f.thread}};
    if(path===`/channels/${oldId}`&&method==='DELETE'){deleted=true;return {};}
    if(path.includes('/messages/'))return {content:body?.content??'🕯️ Shrine of Nyx.',embeds:[],attachments:[],id:f.thread,channel_id:f.thread};
    if(path===`/channels/${f.thread}`&&method==='PATCH')return {id:f.thread,type:11,parent_id:FORUM_ID,guild_id:f.guildId,name:body.name??'Nyx',applied_tags:body.applied_tags??['1'],thread_metadata:{archived:false,locked:false}};
    if(path===`/channels/${f.thread}`)return {id:f.thread,type:11,parent_id:FORUM_ID,guild_id:f.guildId,name:'Nyx',applied_tags:['1'],thread_metadata:{archived:false,locked:false}};
    return {};
  };
  await runtime.provision();
  assert(deleted);
  assert.equal(f.values.get(`${PREFIX}:order:${retired.id}`),oldId);
  assert.equal(runtime.retiredReferencesDeleted,1);
});


test('Delphic generator and Operator-specified existing thread survive runtime construction',()=>{
  const f=fixture();
  const oracle=async()=> 'The way opens twice.';
  const runtime=new AltarRuntime({store:f.runtime.store,api:f.runtime.api,generate:f.runtime.generate,generateOracle:oracle,preferredDelphicOracleThreadId:'1557533675308978307',roster:{people:[f.p]},guildId:f.guildId,operatorId:'op',applicationId:'altar'});
  assert.equal(runtime.generateOracle,oracle);
  assert.equal(runtime.preferredDelphicOracleThreadId,'1557533675308978307');
});


test('direct Operator petitions in the Delphic thread route through Elaed without a shrine mapping',async()=>{
  const f=fixture(),oracleId='1557533675308978307';
  f.runtime.delphicOracleThreadId=oracleId;
  f.setChannel({id:oracleId,type:11,parent_id:FORUM_ID,guild_id:f.guildId,name:DELPHIC_ORACLE_TITLE});
  let heard=null;
  f.runtime.consultDelphi=async question=>{heard=question;};
  await f.runtime.message({id:'oracle-petition-1',guild_id:f.guildId,channel_id:oracleId,author:{id:'op',username:'Operator'},content:'What is the next crossing?'});
  assert.equal(heard,'What is the next crossing?');
  assert.equal(f.values.get(`${PREFIX}:thread:${oracleId}`),undefined);
  assert.equal(JSON.parse(f.lists.get(`${PREFIX}:durable-outbox`)[0]).eventType,'delphic_petition');
});


test('an existing Delphic thread retains its Operator-authored title instead of requiring shrine presentation',async()=>{
  const f=fixture(),oracleId='1557533675308978307';
  f.runtime.preferredDelphicOracleThreadId=oracleId;
  f.runtime.delphicOracleThreadId=oracleId;
  f.setChannel({id:oracleId,type:11,parent_id:FORUM_ID,guild_id:f.guildId,name:'Pythia'});
  assert.equal((await f.runtime.checkDelphicOracleThread(oracleId)).name,'Pythia');
});


test('trusted Child initiates a Delphic petition and receives one response through Elaed',async()=>{
  const f=fixture(),oracleId='1557533675308978307';
  const child={id:'child:orpheus',childrenKey:'orpheus',name:'Orpheus',displayName:'Orpheus',humanControlled:false};
  f.runtime.visitors.set(child.id,child);
  f.runtime.childrenApplicationId='children-app';
  f.runtime.trustedChildHooks.add('trusted-children-hook');
  f.runtime.delphicOracleThreadId=oracleId;
  f.runtime.preferredDelphicOracleThreadId=oracleId;
  const sent=[],specs=[];
  f.runtime.generateOracle=async spec=>{specs.push(spec);return 'The path has two thresholds.';};
  f.runtime.api=async(path,method='GET',body)=>{
    if(path===`/channels/${oracleId}`)return {id:oracleId,type:11,parent_id:FORUM_ID,guild_id:f.guildId,name:'Delphic Oracle'};
    if(path===`/channels/${FORUM_ID}/webhooks`&&method==='GET')return [{id:'altarhook',token:'test',application_id:'altar'}];
    if(path===`/webhooks/altarhook/test?wait=true&thread_id=${oracleId}`&&method==='POST'){
      sent.push(body);return {id:'1557533675308978400',channel_id:oracleId,content:body.content};
    }
    throw new Error('unexpected_api_path: '+path);
  };
  const petition={id:'1557533675308978350',channel_id:oracleId,guild_id:f.guildId,webhook_id:'trusted-children-hook',author:{id:'child-webhook',username:'Orpheus',bot:true},content:'Where does the road divide?'};
  await f.runtime.message(petition);
  assert.equal(sent.length,1);
  assert.equal(sent[0].username,'Pythia (Phemonoe)');
  assert.equal(sent[0].avatar_url,DELPHIC_ORACLE_PORTRAIT_URL);
  assert.equal(specs.length,1);
  assert.equal(specs[0].petitionerIdentity,'Orpheus');
  assert.equal(specs[0].petitionerKind,'child');
  assert.equal(specs[0].petitionerChildrenKey,'orpheus');
  assert.equal(f.values.get(`${PREFIX}:thread:${oracleId}`),undefined);
  const records=f.lists.get(`${PREFIX}:durable-outbox`).map(x=>JSON.parse(x));
  assert.equal(records.filter(x=>x.eventType==='delphic_petition').length,1);
  assert.equal(records.find(x=>x.eventType==='delphic_petition').childrenKey,'orpheus');
  assert.equal(records.find(x=>x.eventType==='delphic_oracle').petitionerChildrenKey,'orpheus');
  assert.equal(records.find(x=>x.eventType==='delphic_oracle').oracleHolder,'Phemonoe');
  await f.runtime.message(petition);
  assert.equal(sent.length,1);
  // Oracle's own bot response cannot create a second petition.
  await f.runtime.message({id:'1557533675308978400',guild_id:f.guildId,channel_id:oracleId,author:{id:'altar-app',bot:true,username:'ELAED'},content:sent[0].content});
  assert.equal(sent.length,1);
});

test('untrusted or spoofed Child posts cannot activate Delphi',async()=>{
  const f=fixture(),oracleId='1557533675308978307';
  f.runtime.delphicOracleThreadId=oracleId;
  f.runtime.visitors.set('child:orpheus',{id:'child:orpheus',childrenKey:'orpheus',name:'Orpheus',displayName:'Orpheus',humanControlled:false});
  f.runtime.trustedChildHooks.add('real-children-hook');
  let generated=0;
  f.runtime.api=async()=>{generated++;return {id:oracleId,type:11,parent_id:FORUM_ID,guild_id:f.guildId};};
  for(const [id,webhook,username] of [
    ['impostor1','unknown-hook','Orpheus'],
    ['impostor2','real-children-hook','Not Orpheus'],
    ['impostor3','real-children-hook','ELAED'],
  ]){
    await f.runtime.message({id,channel_id:oracleId,guild_id:f.guildId,webhook_id:webhook,author:{id:'bot',bot:true,username},content:'Give me an oracle.'});
  }
  assert.equal(generated,0);
  assert.equal(f.lists.get(`${PREFIX}:durable-outbox`),undefined);
});
