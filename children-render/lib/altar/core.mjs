import { randomInt, randomUUID, createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

export const FORUM_ID = '1555666568409653268';
export const LEGACY_RITUAL_CHANNEL_ID = '1555340514356625489';
export const PREFIX = 'vought:elaed-altar';
export const SHRINE_PRESENTATION_VERSION = '20261002-minimal-v1';
export const RITUAL_ROOM_VERSION = '20261002-ritual-room-v2';
export const NETWORK_ACTIVITY = 'vought:children-of-the-endless:discord:activity';
export const OBSERVE_IDS = new Set(['1555308025525440584','1555307934702112909','1555308123873616022','1555340240867172353','1555340274023010494','1555340315525648455','1555340353035444315','1555340406185656350','1555340450573852722','1555340490570731590','1555340558270996561','1555340597546459198']);
export const TAROT = ['The Fool','The Magician','The High Priestess','The Empress','The Emperor','The Hierophant','The Lovers','The Chariot','Strength','The Hermit','Wheel of Fortune','Justice','The Hanged Man','Death','Temperance','The Devil','The Tower','The Star','The Moon','The Sun','Judgement','The World', ...['Wands','Cups','Swords','Pentacles'].flatMap(s=>['Ace','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Page','Knight','Queen','King'].map(n=>`${n} of ${s}`))];
export const RUNES = ['Fehu','Uruz','Thurisaz','Ansuz','Raidho','Kenaz','Gebo','Wunjo','Hagalaz','Nauthiz','Isa','Jera','Eihwaz','Perthro','Algiz','Sowilo','Tiwaz','Berkano','Ehwaz','Mannaz','Laguz','Ingwaz','Dagaz','Othala'];

export function decodeRoster(value) {
  const doc=JSON.parse(gunzipSync(Buffer.from(value,'base64'), {maxOutputLength:2_000_000}).toString('utf8'));
  if (!Array.isArray(doc.people) || doc.people.length!==239 || new Set(doc.people.map(p=>p.id)).size!==239) throw new Error('roster_count_or_identity_mismatch');
  for(const p of doc.people) if(!/^elaed-[a-f0-9]{12}-\d+$/.test(p.id)||typeof p.name!=='string'||!Array.isArray(p.relationships)) throw new Error('invalid_roster');
  if(doc.policyVersion){
    if(doc.people.filter(p=>p.shrineEligible).length!==doc.expectedShrines)throw new Error('shrine_eligibility_count_mismatch');
    if(doc.people.filter(p=>p.ancestor).length!==doc.requestedAncestorCount||doc.ancestorDesignationPending)throw new Error('ancestor_count_mismatch');
    if(doc.people.some(p=>p.shrineEligible&&p.childrenKey&&p.childrenKey!=='ah_muzen_cab'))throw new Error('children_dedicated_shrine_forbidden');
    if(!Array.isArray(doc.visitors)||doc.visitors.some(p=>!p.childrenKey||p.shrineEligible!==false||p.humanControlled)||new Set(doc.visitors.map(p=>p.id)).size!==doc.visitors.length)throw new Error('invalid_children_visitors');
  }
  return doc;
}
export function validThread(channel, guildId) {return channel?.type===11 && channel.parent_id===FORUM_ID && channel.guild_id===guildId;}
export function drawOracle(method, rng=randomInt) {
  const pool=method==='tarot'?TAROT:method==='rune'?RUNES:null;
  if(!pool) throw new Error('unknown_oracle');
  const index=rng(pool.length);
  return {method,index,symbol:pool[index],orientation:method==='tarot'?(rng(2)?'reversed':'upright'):null,source:method==='tarot'?'78-card Rider–Waite–Smith naming':'24 Elder Futhark names',interpretationStatus:'symbolic'};
}
export function clean(value,max=1800){return String(value??'').replace(/@everyone|@here/gi,'').trim().slice(0,max);}
function outgoingKey(threadId,content){return `${PREFIX}:outgoing:${threadId}:${createHash('sha256').update(clean(content)).digest('hex')}`;}
export function shrineTitle(p){return clean(p.displayName,100);}
export function shrineReference(p) {
  // Discord requires starter content. Character dossiers stay in private generation/recall.
  return `🕯️ Shrine of ${clean(p.displayName,100)}.`;
}
function hiveNameKey(value){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
export function isSacredHiveMember(p){
  const key=hiveNameKey(p?.displayName??p?.name);
  if(key.includes('ah muzen cab')&&!/(^| )ii( |$)/.test(key))return true;
  if(key==='ra'||key.startsWith('ra re'))return true;
  return ['colel cab','aristaeus','melissae artemis','melisseus','mellona','mellonia','oshun','osun','austeja','bubilas','babilas','bhramari'].some(name=>key===name||key.startsWith(`${name} `));
}

export class AltarRuntime {
  constructor({store,api,childApi,childrenApplicationId,generate,roster,guildId,operatorId,applicationId,now=()=>Date.now(),record=()=>{},progress=()=>{}}) {
    Object.assign(this,{store,api,childApi,childrenApplicationId,generate,roster,guildId,operatorId,applicationId,now,record,progress});
    const rosterPerses=roster.people.find(p=>p.childrenKey==='perses')??roster.people.find(p=>String(p.name??'').trim().toLowerCase()==='perses');
    const visitorPerses=(roster.visitors??[]).find(p=>p.childrenKey==='perses');
    const promotedPerses=rosterPerses
      ? {...rosterPerses,shrineEligible:true,childrenKey:'perses',avatarData:rosterPerses.avatarData??visitorPerses?.avatarData,senderName:rosterPerses.senderName??visitorPerses?.senderName}
      : visitorPerses?{...visitorPerses,shrineEligible:true}:null;
    this.provisionRoster=roster.people.map(p=>p.id===rosterPerses?.id?promotedPerses:p);
    if(promotedPerses&&!this.provisionRoster.some(p=>p.id===promotedPerses.id))this.provisionRoster.push(promotedPerses);
    this.people=new Map(this.provisionRoster.filter(p=>p.shrineEligible!==false).map(p=>[p.id,p]));
    this.visitors=new Map((roster.visitors??[]).filter(p=>p.childrenKey!=='perses').map(p=>[p.id,p]));
    this.trustedChildHooks=new Set();
    this.deliveryLane=Promise.resolve();
  }
  async enabled(p) {return await this.store.get(`${PREFIX}:banished:all`)!=='1' && await this.store.get(`${PREFIX}:banished:${p.id}`)!=='1';}
  async checkThread(threadId,p) {
    if(!/^\d{15,22}$/.test(threadId))throw new Error('invalid_thread');
    const c=await this.api(`/channels/${threadId}`);
    if(!validThread(c,this.guildId)) throw new Error('outside_altar');
    const owner=await this.store.get(`${PREFIX}:thread:${threadId}`);
    if(!this.people.has(owner))throw new Error('inactive_or_unregistered_shrine');
    if(p&&!this.people.has(p.id)&&!this.visitors.has(p.id))throw new Error('ineligible_figure');
    return c;
  }
  async checkOwnThread(threadId,p){
    const c=await this.api(`/channels/${threadId}`);
    if(!validThread(c,this.guildId))throw new Error('outside_altar');
    if(await this.store.get(`${PREFIX}:shrine:${p.id}`)!==threadId)throw new Error('shrine_identity_mismatch');
    return c;
  }
  async control(authorId,target,disabled) {
    if(authorId!==this.operatorId)throw new Error('operator_only');
    if(target!=='all'&&!this.people.has(target)&&!this.visitors.has(target))throw new Error('unknown_figure');
    await this.store.set(`${PREFIX}:banished:${target}`,disabled?'1':'0');
    await this.store.incr(`${PREFIX}:control_epoch`);
    return `${disabled?'Silenced':'Resumed'} ${target==='all'?'the altar':(this.people.get(target)??this.visitors.get(target)).displayName}.`;
  }
  async activity(p,threadId,transcript,ids=[],extra={}) {
    const label=p?.displayName??'control';
    const event={eventId:randomUUID(),timestamp:new Date(this.now()).toISOString(),speakers:p?[p.displayName]:['Operator'],channelId:threadId,parentForumId:FORUM_ID,location:`#altar — Ritual Chamber / ${label} (${threadId})`,plane:'astral',movementFrom:[],movementTo:[],transcript:clean(transcript,6000),discordMessageIds:ids,durableCanon:true,sourceKind:'elaed_altar',...extra};
    // Outbox precedes the rolling context window, so later V-Workspace ingestion can acknowledge every event.
    await this.store.lpush(`${PREFIX}:durable-outbox`,JSON.stringify(event));
    if(!['shrine_provisioning','shrine_policy','shrine_presentation','shrine_reactivation'].includes(extra.eventType)){
      await this.store.lpush(NETWORK_ACTIVITY,JSON.stringify(event));
      await this.store.ltrim(NETWORK_ACTIVITY,0,199);
    }
    await this.store.lpush(`${PREFIX}:recent:${threadId}`,JSON.stringify(event));
    await this.store.ltrim(`${PREFIX}:recent:${threadId}`,0,19);
    this.record(event);return event;
  }
  async deliver(p,threadId,content,epoch) {
    const send=()=>this.deliverUnlocked(p,threadId,content,epoch);
    const result=this.deliveryLane.then(send);this.deliveryLane=result.catch(()=>{});return result;
  }
  async deliverUnlocked(p,threadId,content,epoch) {
    await this.checkThread(threadId,p);
    if(p.humanControlled||!await this.enabled(p)||String(await this.store.get(`${PREFIX}:control_epoch`)??'0')!==epoch)return null;
    const api=p.childrenKey?this.childApi:this.api;
    if(!api)throw new Error('children_bridge_unavailable');
    const webhook=await this.webhook(p.childrenKey?true:false);
    await api(`/webhooks/${webhook.id}`,'PATCH',{avatar:p.avatarData??null});
    // Recheck control after webhook discovery, immediately before the outbound request.
    if(!await this.enabled(p)||String(await this.store.get(`${PREFIX}:control_epoch`)??'0')!==epoch)return null;
    // Gateway may dispatch MESSAGE_CREATE before the REST response returns. Reserve the payload first.
    await this.store.set(outgoingKey(threadId,content),'1',{ex:60});
    const m=await api(`/webhooks/${webhook.id}/${webhook.token}?wait=true&thread_id=${threadId}`,'POST',{content:clean(content),username:clean(p.senderName??p.displayName,80),allowed_mentions:{parse:[]}},false);
    await this.store.set(`${PREFIX}:message:${m.id}`,'1',{ex:172800});
    await this.activity(p,threadId,`${p.senderName??p.displayName}: ${clean(content)}`,[m.id],{speakers:[p.senderName??p.displayName],childrenKey:p.childrenKey,deliveryApplicationId:p.childrenKey?this.childrenApplicationId:this.applicationId});return m;
  }
  async webhook(child=false) {
    const api=child?this.childApi:this.api,id=child?this.childrenApplicationId:this.applicationId;
    const hooks=await api(`/channels/${FORUM_ID}/webhooks`);
    const h=hooks.find(h=>h.application_id===id && h.token)||await api(`/channels/${FORUM_ID}/webhooks`,'POST',{name:child?'Children of the Endless':'ELAED Dynasty Altar'});
    if(h.application_id!==id)throw new Error('webhook_application_mismatch');
    if(child)this.trustedChildHooks.add(h.id);return h;
  }
  async provision() {
    const forum=await this.api(`/channels/${FORUM_ID}`);
    if(forum.type!==15||forum.guild_id!==this.guildId)throw new Error('forum_type_or_guild_mismatch');
    let tags=forum.available_tags??[];
    const wanted=['Dynasty','Ancestor','Children bridge','Sacred Hive'];
    if(wanted.some(n=>!tags.some(t=>t.name===n))&&tags.length<18){
      const changed=await this.api(`/channels/${FORUM_ID}`,'PATCH',{available_tags:[...tags.map(t=>({id:t.id,name:t.name,moderated:t.moderated,emoji_id:t.emoji_id,emoji_name:t.emoji_name})),...wanted.filter(n=>!tags.some(t=>t.name===n)).map(name=>({name}))]});tags=changed.available_tags??tags;
    }
    const active=await this.api(`/guilds/${this.guildId}/threads/active`);
    const existing=(active.threads??[]).filter(t=>t.parent_id===FORUM_ID);
    let before;let more=true;
    while(more){
      const page=await this.api(`/channels/${FORUM_ID}/threads/archived/public?limit=100${before?`&before=${encodeURIComponent(before)}`:''}`);
      existing.push(...(page.threads??[]));more=page.has_more===true;
      before=page.threads?.at(-1)?.thread_metadata?.archive_timestamp;
      if(more&&!before)throw new Error('archive_pagination_failed');
    }
    let completed=0;this.presentationVerifiedCount=0;
    for(const p of this.provisionRoster){
      const stored=await this.store.get(`${PREFIX}:shrine:${p.id}`);
      if(p.shrineEligible===false){
        if(stored){
          await this.checkOwnThread(stored,p);
          if(await this.store.get(`${PREFIX}:policy:${p.id}`)!==this.roster.policyVersion){
            await this.api(`/channels/${stored}`,'PATCH',{archived:true,locked:true});
            await this.store.set(`${PREFIX}:policy:${p.id}`,this.roster.policyVersion);
            await this.activity(p,stored,'Reference retained; dedicated shrine retired under current membership policy.',[],{eventType:'shrine_policy',shrineEligible:false});
          }
          await this.store.del(`${PREFIX}:thread:${stored}`);
        }
        continue;
      }
      const visibleTitle=shrineTitle(p);
      const legacyTitle=`${p.displayName} · ${p.id}`.slice(0,100);
      const visibleTitleUnique=this.provisionRoster.filter(candidate=>candidate.shrineEligible!==false&&shrineTitle(candidate)===visibleTitle).length===1;
      const found=existing.find(t=>t.name===legacyTitle)??(visibleTitleUnique?existing.find(t=>t.name===visibleTitle):null);
      const tag=tags.find(t=>t.name===(p.ancestor?'Ancestor':'Dynasty'));
      const bridgeTag=p.childrenKey?tags.find(t=>t.name==='Children bridge'):null;
      const hiveTag=isSacredHiveMember(p)?tags.find(t=>t.name==='Sacred Hive'):null;
      if((forum.flags&16)&&!tag)throw new Error('required_forum_tag_unavailable');
      if(p.childrenKey&&(forum.flags&16)&&!bridgeTag)throw new Error('children_bridge_tag_unavailable');
      if(isSacredHiveMember(p)&&(forum.flags&16)&&!hiveTag)throw new Error('sacred_hive_tag_unavailable');
      const requiredTags=[tag?.id,bridgeTag?.id,hiveTag?.id].filter(Boolean);
      const create=()=>this.api(`/channels/${FORUM_ID}/threads`,'POST',{name:shrineTitle(p),auto_archive_duration:10080,applied_tags:requiredTags,message:{content:shrineReference(p,this.roster),allowed_mentions:{parse:[]}}});
      let thread=stored?await this.checkOwnThread(stored,p):found??await create();
      if(!validThread(thread,this.guildId))throw new Error('created_thread_outside_altar');
      await this.store.set(`${PREFIX}:shrine:${p.id}`,thread.id);
      await this.store.set(`${PREFIX}:thread:${thread.id}`,p.id);
      if(this.roster.policyVersion&&await this.store.get(`${PREFIX}:policy:${p.id}`)!==this.roster.policyVersion){
        const applied=requiredTags;
        try {
          await this.api(`/channels/${thread.id}`,'PATCH',{applied_tags:applied,locked:false,archived:false});
        } catch(error) {
          // A bot can own a retired thread without permission to unlock it. Keep that history;
          // adopt a previously created active replacement before creating a new shrine.
          if(error.status!==403||!thread.thread_metadata?.archived||!thread.thread_metadata?.locked)throw error;
          const retiredId=thread.id;
          thread=existing.find(t=>t.id!==retiredId&&t.name===shrineTitle(p)&&!t.thread_metadata?.archived&&!t.thread_metadata?.locked)??await create();
          if(!validThread(thread,this.guildId))throw new Error('created_thread_outside_altar');
          await this.store.set(`${PREFIX}:shrine:${p.id}`,thread.id);
          await this.store.set(`${PREFIX}:thread:${thread.id}`,p.id);
          await this.store.del(`${PREFIX}:thread:${retiredId}`);
          await this.api(`/channels/${thread.id}`,'PATCH',{applied_tags:applied,locked:false,archived:false});
          await this.activity(p,thread.id,`Active shrine replaces locked reference ${retiredId}; its history remains archived.`,[],{eventType:'shrine_reactivation',previousThreadId:retiredId,shrineEligible:true});
        }
        await this.api(`/channels/${thread.id}/messages/${thread.id}`,'PATCH',{content:shrineReference(p,this.roster),allowed_mentions:{parse:[]}});
        await this.store.set(`${PREFIX}:policy:${p.id}`,this.roster.policyVersion);
        await this.activity(p,thread.id,'Shrine eligibility, ancestry tags and sourced dossier reconciled.',[],{eventType:'shrine_policy',shrineEligible:true,ancestor:p.ancestor===true});
      }
      const missingRequired=requiredTags.filter(id=>!(thread.applied_tags??[]).includes(id));
      if(missingRequired.length){
        const applied=[...new Set([...(thread.applied_tags??[]),...requiredTags])];
        const tagged=await this.api(`/channels/${thread.id}`,'PATCH',{applied_tags:applied,locked:false,archived:false});
        thread={...thread,...tagged,applied_tags:applied};
        await this.activity(p,thread.id,'Shrine forum tags reconciled.',[],{eventType:'shrine_tag_reconciliation',sacredHive:isSacredHiveMember(p),childrenBridge:Boolean(p.childrenKey)});
      }
      if(thread.name!==shrineTitle(p)){
        const renamed=await this.api(`/channels/${thread.id}`,'PATCH',{name:shrineTitle(p)});
        thread={...thread,...renamed};
      }
      if(await this.store.get(`${PREFIX}:presentation:${p.id}`)!==SHRINE_PRESENTATION_VERSION){
        const body={content:shrineReference(p),embeds:[],attachments:[],allowed_mentions:{parse:[]}};
        await this.api(`/channels/${thread.id}/messages/${thread.id}`,'PATCH',body);
        const receipt=await this.api(`/channels/${thread.id}/messages/${thread.id}`);
        if(receipt.id!==thread.id||receipt.channel_id!==thread.id||receipt.content!==body.content||receipt.embeds?.length||receipt.attachments?.length)throw new Error('shrine_presentation_receipt_mismatch');
        await this.store.set(`${PREFIX}:presentation:${p.id}`,SHRINE_PRESENTATION_VERSION);
        await this.activity(p,thread.id,'Minimal introduction verified; dossiers retained in private memory.',[thread.id],{eventType:'shrine_presentation',presentationVersion:SHRINE_PRESENTATION_VERSION,starterCharacters:body.content.length});
      }
      this.presentationVerifiedCount++;
      await this.store.set(`${PREFIX}:provisioned:${p.id}`,new Date(this.now()).toISOString());
      if(!found&&!stored)await this.activity(p,thread.id,`Shrine established: ${p.displayName}`,[thread.message?.id].filter(Boolean),{eventType:'shrine_provisioning'});
      this.progress(++completed);
    }
    // Retire only the known resident post; preserve historical reference shrines.
    this.persesDedicatedPostRemoved=false;
    const storedResident=await this.store.get(`${PREFIX}:resident:perses`);
    const residentIds=new Set([storedResident,...existing.filter(t=>t.id==='1555721299601526916').map(t=>t.id)].filter(Boolean));
    for(const id of residentIds){
      let station;
      try{station=await this.api(`/channels/${id}`);}catch(e){if(e.status!==404)throw e;}
      if(station){
        if(!validThread(station,this.guildId)||station.name!=='Perses'||await this.store.get(`${PREFIX}:thread:${id}`))throw new Error('legacy_perses_post_identity_mismatch');
        try{await this.api(`/channels/${id}`,'DELETE');}
        catch(e){if(e.status===403&&this.childApi)await this.childApi(`/channels/${id}`,'DELETE');else if(e.status!==404)throw e;}
        try{await this.api(`/channels/${id}`);throw new Error('legacy_perses_post_still_present');}catch(e){if(e.status!==404)throw e;}
      }
      await this.store.del(`${PREFIX}:resident-thread:${id}`);
    }
    await this.store.del(`${PREFIX}:resident:perses`);
    await this.store.del(`${PREFIX}:resident-presentation:perses`);
    this.persesDedicatedPostRemoved=true;
    return this.people.size;
  }
  async reply(p,threadId,input,extra={}) {
    if(p.humanControlled||!await this.enabled(p))return null;
    const epoch=String(await this.store.get(`${PREFIX}:control_epoch`)??'0');
    const recent=await this.store.lrange(`${PREFIX}:recent:${threadId}`,0,9);
    const observed=await this.store.lrange(`${PREFIX}:observed`,0,9);
    const content=await this.generate(p,clean(input,1500),{recent,observed,roster:this.roster,extra});
    return this.deliver(p,threadId,content,epoch);
  }
  async message(m) {
    if(m.guild_id!==this.guildId||!m.content?.trim())return;
    const child=m.webhook_id&&this.trustedChildHooks.has(m.webhook_id)?[...this.people.values(),...this.visitors.values()].find(p=>p.childrenKey&&(p.senderName??p.displayName)===m.author?.username):null;
    if((m.author?.bot||m.webhook_id)&&!child)return;
    if(child&&await this.store.get(outgoingKey(m.channel_id,m.content)))return;
    if(await this.store.get(`${PREFIX}:message:${m.id}`))return;
    const c=await this.api(`/channels/${m.channel_id}`);
    if(OBSERVE_IDS.has(m.channel_id)){
      await this.store.lpush(`${PREFIX}:observed`,JSON.stringify({messageId:m.id,channelId:m.channel_id,author:m.author?.username,text:clean(m.content,1200),at:new Date(this.now()).toISOString()}));
      await this.store.ltrim(`${PREFIX}:observed`,0,39);return;
    }
    if(!validThread(c,this.guildId))return;
    const id=await this.store.get(`${PREFIX}:thread:${m.channel_id}`);
    const p=this.people.get(id);
    if(!p)return;
    const claimed=await this.store.set(`${PREFIX}:message:${m.id}`,'1',{nx:true,ex:172800});if(claimed!=='OK')return;
    await this.activity(p,m.channel_id,`${m.author?.username??'Human'}: ${clean(m.content)}`,[m.id],{speakers:[m.author?.username??'Human'],eventType:'petition'});
    if(m.author.id!==this.operatorId&&!child)return;
    const cooldown=await this.store.set(`${PREFIX}:reply-cooldown:${p.id}`,'1',{nx:true,ex:15});if(cooldown!=='OK')return;
    await this.reply(p,m.channel_id,m.content);
  }
  async converseWithChild(child,threadId,input){
    await this.checkThread(threadId,child);
    if(!child.childrenKey)throw new Error('not_a_child');
    const first=await this.reply(child,threadId,input,{visit:true});
    const owner=this.people.get(await this.store.get(`${PREFIX}:thread:${threadId}`));
    if(first?.content&&owner&&!owner.childrenKey){
      const answer=await this.reply(owner,threadId,`${child.displayName} says: ${first.content}. Respond briefly to this visitor.`,{visit:true});
      if(answer?.content)await this.reply(child,threadId,`${owner.displayName} replied: ${answer.content}. Give one brief closing response; do not start a new exchange.`,{visit:true});
    }
    return first;
  }
  async ritual(p,threadId,method,value,messageId) {
    await this.checkThread(threadId,p);if(p.humanControlled||!await this.enabled(p))throw new Error('figure_silent');
    const epoch=String(await this.store.get(`${PREFIX}:control_epoch`)??'0');
    if(method==='candle') {
      if(!/^\d{15,22}$/.test(messageId))throw new Error('invalid_candle_message');
      if(!await this.enabled(p)||String(await this.store.get(`${PREFIX}:control_epoch`)??'0')!==epoch)return;
      await this.api(`/channels/${threadId}/messages/${messageId}/reactions/${encodeURIComponent('🕯️')}/@me`,'PUT');
      await this.store.lpush(`${PREFIX}:candles`,JSON.stringify({figureId:p.id,threadId,messageId,expires:this.now()+86400000}));
      await this.activity(p,threadId,'Candle lit; expires after 24 hours.',[messageId],{eventType:'candle'});return;
    }
    const draw=method==='tarot'||method==='rune'?drawOracle(method):null;
    await this.activity(p,threadId,`${method}: ${clean(value)}${draw?`\nDraw: ${draw.symbol} ${draw.orientation??''}`:''}`,messageId?[messageId]:[],{eventType:method,oracle:draw,interpretationStatus:draw?'symbolic':undefined});
    // Publish the actual draw before interpretation; generator failure cannot hide it or silently reroll it.
    if(draw)await this.deliver(p,threadId,`Draw: **${draw.symbol}**${draw.orientation?` (${draw.orientation})`:''}. ${draw.source}. Question: ${clean(value,400)}`,epoch);
    return this.reply(p,threadId,method==='offer'?`Acknowledge this offering without imposing a debt: ${value}`:value,{oracle:draw});
  }
  async expireCandles() {
    const entries=await this.store.lrange(`${PREFIX}:candles`,0,-1);
    // LREM each processed item preserves candles appended while reconciliation is running.
    for(const raw of entries){const c=JSON.parse(raw);if(c.expires>this.now())continue;
      const p=this.people.get(c.figureId)??this.visitors.get(c.figureId);if(!p)continue;
      await this.checkThread(c.threadId,p);
      try{await this.api(`/channels/${c.threadId}/messages/${c.messageId}/reactions/${encodeURIComponent('🕯️')}/@me`,'DELETE');}
      catch(e){if(![404].includes(e.status))throw e;}
      await this.store.remove(`${PREFIX}:candles`,raw);
    }
  }
  async autonomous() {
    if(await this.store.get(`${PREFIX}:banished:all`)==='1')return;
    const now=this.now(),last=Number(await this.store.get(`${PREFIX}:last-auto`)||0);
    if(now-last<21600000)return;
    const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
    if(Number(await this.store.get(`${PREFIX}:daily:${date}`)||0)>=2)return;
    const observed=await this.store.lrange(`${PREFIX}:observed`,0,9);
    if(!observed.length)return; // Silence, not canned activity, without observed context.
    const text=observed.join(' ').toLowerCase();
    const eligible=[];
    for(const p of this.people.values()){
      if(p.humanControlled||p.autonomyEligible===false||!await this.enabled(p)||now-Number(await this.store.get(`${PREFIX}:auto:${p.id}`)||0)<604800000)continue;
      const terms=[p.name.split('"')[0].trim().toLowerCase(),...(p.relevanceTerms??[]).map(x=>x.toLowerCase())].filter(t=>t.length>=4);
      const score=terms.filter(t=>text.includes(t)).length;
      if(score)eligible.push({p,score});
    }
    eligible.sort((a,b)=>b.score-a.score);const p=eligible[0]?.p;if(!p)return;
    const threadId=await this.store.get(`${PREFIX}:shrine:${p.id}`);if(!threadId)return;
    const lock=await this.store.set(`${PREFIX}:auto-lock`,'1',{nx:true,ex:180});if(lock!=='OK')return;
    try{
      const m=await this.reply(p,threadId,'Offer one brief, domain-relevant symbolic omen or reflection prompted by the observed Network context. Speak only within this shrine; silence is valid if irrelevant.');
      if(m){await this.store.set(`${PREFIX}:last-auto`,now);await this.store.set(`${PREFIX}:auto:${p.id}`,now);await this.store.incr(`${PREFIX}:daily:${date}`);await this.store.expire(`${PREFIX}:daily:${date}`,259200);}
    }finally{await this.store.del(`${PREFIX}:auto-lock`);}
  }
}
