import { randomInt, randomUUID } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

export const FORUM_ID = '1555666568409653268';
export const PREFIX = 'vought:elaed-altar';
export const NETWORK_ACTIVITY = 'vought:children-of-the-endless:discord:activity';
export const OBSERVE_IDS = new Set(['1555308025525440584','1555307934702112909','1555308123873616022','1555340240867172353','1555340274023010494','1555340315525648455','1555340353035444315','1555340406185656350','1555340450573852722','1555340490570731590','1555340514356625489','1555340558270996561','1555340597546459198']);
export const TAROT = ['The Fool','The Magician','The High Priestess','The Empress','The Emperor','The Hierophant','The Lovers','The Chariot','Strength','The Hermit','Wheel of Fortune','Justice','The Hanged Man','Death','Temperance','The Devil','The Tower','The Star','The Moon','The Sun','Judgement','The World', ...['Wands','Cups','Swords','Pentacles'].flatMap(s=>['Ace','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Page','Knight','Queen','King'].map(n=>`${n} of ${s}`))];
export const RUNES = ['Fehu','Uruz','Thurisaz','Ansuz','Raidho','Kenaz','Gebo','Wunjo','Hagalaz','Nauthiz','Isa','Jera','Eihwaz','Perthro','Algiz','Sowilo','Tiwaz','Berkano','Ehwaz','Mannaz','Laguz','Ingwaz','Dagaz','Othala'];

export function decodeRoster(value) {
  const doc=JSON.parse(gunzipSync(Buffer.from(value,'base64'), {maxOutputLength:2_000_000}).toString('utf8'));
  if (!Array.isArray(doc.people) || doc.people.length!==239 || new Set(doc.people.map(p=>p.id)).size!==239) throw new Error('roster_count_or_identity_mismatch');
  for(const p of doc.people) if(!/^elaed-[a-f0-9]{12}-\d+$/.test(p.id)||typeof p.name!=='string'||!Array.isArray(p.relationships)) throw new Error('invalid_roster');
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
export function shrineTitle(p){return `${p.displayName} · ${p.id}`.slice(0,100);}
export function shrineReference(p,doc) {
  const rel=p.relationships.filter(r=>!((/Khaos|Demiurge/.test(p.name))&&r.kind==='Ex-partner'&&/Khaos|Demiurge/.test(r.targetName)));
  return clean(`🕯️ **${p.displayName}**\nELAED shrine | ${doc.version}\n${p.humanControlled?'Human-controlled identity: this application will not speak for this person.':'Quiet dynasty presence; address this shrine to invoke its figure.'}\n\n**Recorded relationships**\n${rel.slice(0,12).map(r=>`${r.kind}: ${r.targetName}${r.ambiguous?' (same-name identity unresolved)':''}`).join('\n')||'No explicit relationships supplied.'}\n\nCanon: ${p.canonSource}\nGodparent fields mean manifestation-source links. Do not infer biological ancestry from them.\n\nLeave gratitude, a petition, dream recall, or an offering here. /offer, /candle, /tarot and /rune operate in this shrine. Omens remain symbolic. /banish and /resume are Operator controls.\nPortraits, domain detail, correspondences, hymns, cherished objects and offering preferences await sourced dossier entries where absent. No invented heirlooms or personal memories.\n\nRegistry: ${p.id}`,1950);
}

export class AltarRuntime {
  constructor({store,api,generate,roster,guildId,operatorId,applicationId,now=()=>Date.now(),record=()=>{},progress=()=>{}}) {
    Object.assign(this,{store,api,generate,roster,guildId,operatorId,applicationId,now,record,progress});
    this.people=new Map(roster.people.map(p=>[p.id,p]));
  }
  async enabled(p) {return await this.store.get(`${PREFIX}:banished:all`)!=='1' && await this.store.get(`${PREFIX}:banished:${p.id}`)!=='1';}
  async checkThread(threadId,p) {
    if(!/^\d{15,22}$/.test(threadId))throw new Error('invalid_thread');
    const c=await this.api(`/channels/${threadId}`);
    if(!validThread(c,this.guildId)) throw new Error('outside_altar');
    if(p && await this.store.get(`${PREFIX}:shrine:${p.id}`)!==threadId)throw new Error('shrine_identity_mismatch');
    return c;
  }
  async control(authorId,target,disabled) {
    if(authorId!==this.operatorId)throw new Error('operator_only');
    if(target!=='all'&&!this.people.has(target))throw new Error('unknown_figure');
    await this.store.set(`${PREFIX}:banished:${target}`,disabled?'1':'0');
    await this.store.incr(`${PREFIX}:control_epoch`);
    return `${disabled?'Silenced':'Resumed'} ${target==='all'?'the altar':this.people.get(target).displayName}.`;
  }
  async activity(p,threadId,transcript,ids=[],extra={}) {
    const event={eventId:randomUUID(),timestamp:new Date(this.now()).toISOString(),speakers:p?[p.displayName]:['Operator'],channelId:threadId,parentForumId:FORUM_ID,location:`#altar — Dynasty Altar / ${p?.displayName??'control'} (${threadId})`,plane:'material',movementFrom:[],movementTo:[],transcript:clean(transcript,6000),discordMessageIds:ids,durableCanon:true,sourceKind:'elaed_altar',...extra};
    // Outbox precedes the rolling context window, so later V-Workspace ingestion can acknowledge every event.
    await this.store.lpush(`${PREFIX}:durable-outbox`,JSON.stringify(event));
    await this.store.lpush(NETWORK_ACTIVITY,JSON.stringify(event));
    await this.store.ltrim(NETWORK_ACTIVITY,0,199);
    await this.store.lpush(`${PREFIX}:recent:${threadId}`,JSON.stringify(event));
    await this.store.ltrim(`${PREFIX}:recent:${threadId}`,0,19);
    this.record(event);return event;
  }
  async deliver(p,threadId,content,epoch) {
    await this.checkThread(threadId,p);
    if(p.humanControlled||!await this.enabled(p)||String(await this.store.get(`${PREFIX}:control_epoch`)??'0')!==epoch)return null;
    const webhook=await this.webhook();
    if(p.avatarData)await this.api(`/webhooks/${webhook.id}`,'PATCH',{avatar:p.avatarData});
    // Recheck control after webhook discovery, immediately before the outbound request.
    if(!await this.enabled(p)||String(await this.store.get(`${PREFIX}:control_epoch`)??'0')!==epoch)return null;
    const m=await this.api(`/webhooks/${webhook.id}/${webhook.token}?wait=true&thread_id=${threadId}`,'POST',{content:clean(content),username:clean(p.displayName,80),allowed_mentions:{parse:[]}},false);
    await this.activity(p,threadId,`${p.displayName}: ${clean(content)}`,[m.id]);return m;
  }
  async webhook() {
    const hooks=await this.api(`/channels/${FORUM_ID}/webhooks`);
    return hooks.find(h=>h.application_id===this.applicationId && h.token)||await this.api(`/channels/${FORUM_ID}/webhooks`,'POST',{name:'ELAED Dynasty Altar'});
  }
  async provision() {
    const forum=await this.api(`/channels/${FORUM_ID}`);
    if(forum.type!==15||forum.guild_id!==this.guildId)throw new Error('forum_type_or_guild_mismatch');
    let tags=forum.available_tags??[];
    const wanted=['Dynasty','Ancestor','Human-controlled'];
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
    let completed=0;
    for(const p of this.roster.people){
      const stored=await this.store.get(`${PREFIX}:shrine:${p.id}`);
      if(stored){await this.checkThread(stored,p);this.progress(++completed);continue;}
      const found=existing.find(t=>t.name===shrineTitle(p));
      const tag=tags.find(t=>t.name===(p.humanControlled?'Human-controlled':p.ancestor?'Ancestor':'Dynasty'));
      if((forum.flags&16)&&!tag)throw new Error('required_forum_tag_unavailable');
      const thread=found??await this.api(`/channels/${FORUM_ID}/threads`,'POST',{name:shrineTitle(p),auto_archive_duration:10080,applied_tags:tag?[tag.id]:[],message:{content:shrineReference(p,this.roster),allowed_mentions:{parse:[]}}});
      if(!validThread(thread,this.guildId))throw new Error('created_thread_outside_altar');
      await this.store.set(`${PREFIX}:shrine:${p.id}`,thread.id);
      await this.store.set(`${PREFIX}:thread:${thread.id}`,p.id);
      await this.store.set(`${PREFIX}:provisioned:${p.id}`,new Date(this.now()).toISOString());
      if(!found)await this.activity(p,thread.id,`Shrine established: ${p.displayName}`,[thread.message?.id].filter(Boolean),{eventType:'shrine_provisioning'});
      this.progress(++completed);
    }
    return this.roster.people.length;
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
    if(m.guild_id!==this.guildId||m.author?.bot||m.webhook_id||!m.content?.trim())return;
    const c=await this.api(`/channels/${m.channel_id}`);
    if(OBSERVE_IDS.has(m.channel_id)){
      await this.store.lpush(`${PREFIX}:observed`,JSON.stringify({messageId:m.id,channelId:m.channel_id,author:m.author?.username,text:clean(m.content,1200),at:new Date(this.now()).toISOString()}));
      await this.store.ltrim(`${PREFIX}:observed`,0,39);return;
    }
    if(!validThread(c,this.guildId))return;
    const id=await this.store.get(`${PREFIX}:thread:${m.channel_id}`),p=this.people.get(id);
    if(!p)return;
    const claimed=await this.store.set(`${PREFIX}:message:${m.id}`,'1',{nx:true,ex:172800});if(claimed!=='OK')return;
    await this.activity(p,m.channel_id,`${m.author?.username??'Human'}: ${clean(m.content)}`,[m.id],{speakers:[m.author?.username??'Human'],eventType:'petition'});
    if(m.author.id!==this.operatorId)return;
    const cooldown=await this.store.set(`${PREFIX}:reply-cooldown:${p.id}`,'1',{nx:true,ex:15});if(cooldown!=='OK')return;
    await this.reply(p,m.channel_id,m.content);
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
      const p=this.people.get(c.figureId);if(!p)continue;
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
    for(const p of this.roster.people){
      if(p.humanControlled||!await this.enabled(p)||now-Number(await this.store.get(`${PREFIX}:auto:${p.id}`)||0)<604800000)continue;
      const terms=p.name.toLowerCase().replace(/[^a-z ]/g,' ').split(/\s+/).filter(t=>t.length>=5&&!['endless','father','mother','other'].includes(t));
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
