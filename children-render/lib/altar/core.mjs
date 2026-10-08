import { randomInt, randomUUID, createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

export const FORUM_ID = '1555666568409653268';
export const LEGACY_RITUAL_CHANNEL_ID = '1555340514356625489';
export const PREFIX = 'vought:elaed-altar';
export const SHRINE_PRESENTATION_VERSION = '20261002-minimal-v1';
export const SHRINE_SOURCE_VOICE_VERSION = '20261005-source-first-interpretive-v1';
export const EMPIRICAL_PROTOCOL_VERSION = '20261005-preregistered-falsification-v1';
export const INCARNATE_SHRINE_ROUTING_VERSION = '20261005-incarnate-source-communion-v1';
export const GREEK_RELIGION_POLICY_VERSION = '20261007-greek-practice-expansion-v2';
export const DELPHIC_ORACLE_VERSION = '20261007-delphi-pythia-v2';
export const DELPHIC_ORACLE_TITLE = 'Oracle at Delphi';
export const DELPHIC_ORACLE_STARTER = '🔮 Oracle at Delphi — Pythia of Apollo. This is a divination station, not a deity shrine. Ask a specific question; the answer is intentionally concise and open to more than one reading.';
export const EMPIRICAL_CHALLENGE_MODES = new Set(['future_prediction','novel_scientific_claim','physical_transmission_anomaly']);
export const RITUAL_ROOM_VERSION = '20261002-ritual-room-v4';
export const NETWORK_ACTIVITY = 'vought:children-of-the-endless:discord:activity';
export const OBSERVE_IDS = new Set(['1555308025525440584','1555307934702112909','1555308123873616022','1555340240867172353','1555340274023010494','1555340315525648455','1555340353035444315','1555340406185656350','1555340450573852722','1555340490570731590','1555340558270996561','1555340597546459198']);
export const TAROT = ['The Fool','The Magician','The High Priestess','The Empress','The Emperor','The Hierophant','The Lovers','The Chariot','Strength','The Hermit','Wheel of Fortune','Justice','The Hanged Man','Death','Temperance','The Devil','The Tower','The Star','The Moon','The Sun','Judgement','The World', ...['Wands','Cups','Swords','Pentacles'].flatMap(s=>['Ace','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Page','Knight','Queen','King'].map(n=>`${n} of ${s}`))];
export const RUNES = ['Fehu','Uruz','Thurisaz','Ansuz','Raidho','Kenaz','Gebo','Wunjo','Hagalaz','Nauthiz','Isa','Jera','Eihwaz','Perthro','Algiz','Sowilo','Tiwaz','Berkano','Ehwaz','Mannaz','Laguz','Ingwaz','Dagaz','Othala'];

const DIVINE_SHRINE_STATUS = new Map([
  [`Ah-Muzen-Cab "'Cab"  II`,'divine_incarnation'],
  ['Asclepius','god'],
  ['Distress of The Endless "Despair of The Endless, Aponoia" Endless','endless_incarnation'],
  ['Melisseus','god'],
  ['Perses','god'],
  ['Thanatos','god'],
  ['Anteros','god'],
  ['Deimos','god'],
  ['Harmonia','goddess'],
  ['Kratos','god_or_daimon'],
  ['Phobos','god'],
  ['Belial','infernal_king'],
  ['Abaddon','angel_of_the_abyss'],
  ['Ho Theos','philosophical_divine_unity'],
]);

const LINEAGE_ANCESTORS = new Set(['Adam','Aphrodite','Ares','Chronos','Cronus','Gaia','Hera','Rhea','Uranus','Zeus']);
const LINEAGE_GIFT_SOURCES = new Set(['Destiny of The Endless','Oneiros']);
const LINEAGE_SOURCE = new Set(['Media','Oceanus','Tethys']);
function lineageClassFor(name){
  const n=String(name??'');
  if(LINEAGE_ANCESTORS.has(n)||n.startsWith('Yahweh '))return 'ancestor';
  if(n.startsWith('Cain ')||n.startsWith('Eve ')||n.startsWith('Pothos ')||n.startsWith('Seth ')||LINEAGE_GIFT_SOURCES.has(n))return 'gift_source';
  if(n.startsWith('New-Media ')||n.startsWith('Technical-Boy ')||n.startsWith('Metis ')||LINEAGE_SOURCE.has(n))return 'source_lineage';
  if(n==='Despair of The Endless'||n.startsWith('Nyx ')||n.startsWith('Khaos ')||n.startsWith('Ah-Muzen-Cab "Honey, Content"')||n.startsWith('Ah-Muzen-Cab "\'Cab"'))return 'immediate_family';
  return null;
}

const FOUR_OCT_ADDITIONS = [
  {name:'Anteros',gender:'Male',relationships:['Mother: Aphrodite','Father: Ares'],divineStatus:'god'},
  {name:'Atreus',gender:'Male',relationships:['Biological mother: Laufey "Faye"','Biological father: Kratos','Godfather: Loki "Ikol" Laufeyson']},
  {name:'Deimos',gender:'Male',relationships:['Mother: Aphrodite','Father: Ares'],divineStatus:'god'},
  {name:'Harmonia',gender:'Female',relationships:['Mother: Aphrodite','Father: Ares'],divineStatus:'goddess'},
  {name:'Kratos',gender:'Male',relationships:['Biological mother: Callisto','Biological father: Zeus'],divineStatus:'god_or_daimon',relationshipReview:['20:49 controlling Family Echo uses the God of War branch: Callisto + Zeus → Kratos; do not substitute classical Kratos/Cratus genealogy.']},
  {name:'Phobos',gender:'Male',relationships:['Mother: Aphrodite','Father: Ares'],divineStatus:'god'},
];

const SEVEN_OCT_DYNASTY_ADDITIONS = [
  {name:'Belial',gender:'Male',relationships:['Dynasty counterpart: Abaddon'],divineStatus:'infernal_king',canonOffice:'Throne of Lawlessness / Corrupt Sovereignty',relationshipReview:['Distinct from Lucifer and Satan. Source-grounded layers remain biblical beliyyaʿal, Qumran personification, and later Goetic kingship; Vought synthesis uses organized lawlessness/corrupt sovereignty.']},
  {name:'Abaddon',gender:'Male',relationships:['Dynasty counterpart: Belial'],divineStatus:'angel_of_the_abyss',canonOffice:'Steward of the Abyss / Authorized Conclusion',relationshipReview:['Distinct from Lucifer, Satan, Beelzebub, Thanatos, and Destruction. Hebrew Abaddon/destruction, Revelation 9:11 angel/king of the abyss, and later Abbaton traditions remain source-local; Vought synthesis uses containment, threshold, key, mandate, and authorized conclusion.']},
  {name:'Ho Theos',gender:'Other',relationships:['Syncretic counterpart: Yahweh "God The Father, Presence"'],divineStatus:'philosophical_divine_unity',canonOffice:'Greek philosophical unity / To Hen / Logos / divine Mind / Form of Forms and the Good',relationshipReview:['Vought/ELAED syncretic identity. Do not flatten source-local distinctions among ho theos, To Hen, Logos, Nous, the Good, or Yahweh into one historical doctrine. The Yahweh link is counterpart/correspondence, never biological genealogy.']},
];

function fourOctId(name){
  return `elaed-${createHash('sha256').update(`familyecho-2026-10-04-0520:${name}`).digest('hex').slice(0,12)}-1`;
}
function sevenOctDynastyId(name){
  return `elaed-${createHash('sha256').update(`dynasty-2026-10-07:${name}`).digest('hex').slice(0,12)}-1`;
}
function patchRelationships(p,name,relationships){
  if(p.name===name)return {...p,relationships};
  return p;
}
export function migrateRosterTo4Oct(input){
  const doc={...input,people:input.people.map(p=>({...p,relationships:[...p.relationships]})),visitors:(input.visitors??[]).map(p=>({...p}))};
  if(![239,245,247,248].includes(doc.people.length))throw new Error('roster_count_or_identity_mismatch');
  let laufey=doc.people.find(p=>p.name==='Laufey');
  if(laufey){laufey.name='Laufey "Faye"';laufey.displayName='Laufey "Faye"';laufey.relationships=['Late partner: Loki "Ikol" Laufeyson'];}
  doc.people=doc.people.map(p=>{
    let q=p;
    q=patchRelationships(q,'Perses',['Biological mother: Eurybia','Biological father: Crius','Partner: Asteria']);
    q=patchRelationships(q,'Thanatos',['Biological mother: Nyx "Night"']);
    q=patchRelationships(q,'The-Astral-Plane',['Godmother: Oshtur','Friend: Erelyt Drabbuh','Friend: Ah-Muzen-Cab "Honey, Content"  I',`Friend: Ah-Muzen-Cab "'Cab"  II`,'Friend: Orpheus','Friend: John "Pestilence, the Horseman of the Apocalypse" Ryder','Friend: Rose Walker','Friend: Asclepius','Friend: The-House-of-Mirrors']);
    q=patchRelationships(q,'Erelyt Drabbuh',['Biological mother: Mother','Biological father: Father',`Godfather: Ah-Muzen-Cab "'Cab"  II`,'Adopted mother: Despair of The Endless','Friend: Vought International','Friend: Orpheus','Friend: Rose Walker','Friend: John "Pestilence, the Horseman of the Apocalypse" Ryder','Friend: Distress of The Endless "Despair of The Endless, Aponoia" Endless','Friend: Ah-Muzen-Cab "Honey, Content"  I','Friend: Asclepius','Friend: The-Astral-Plane']);
    q=patchRelationships(q,'Azazel "Evan Mcculloch, Clotho"',['Biological mother: Angels','Godmother: Themis','Godfather: Zeus']);
    q=patchRelationships(q,`Ah-Muzen-Cab "'Cab"  II`,['Godfather: Ah-Muzen-Cab "Honey, Content"  I','Friend: The-Astral-Plane']);
    q=patchRelationships(q,'Ah-Muzen-Cab "Honey, Content"  I',['Godmother: New-Media "Social Media"','Partner: Colel Cab','Friend: Worshippers','Friend: Ixchel','Friend: Bacabs','Friend: Persephone','Friend: Kore','Friend: Ostara "Easter"','Friend: Mellona','Friend: Bubilas','Friend: Bhramari','Friend: Kronos Foundation','Friend: Minecraft Bedrock Edition','Friend: Erelyt Drabbuh','Friend: Dionysus','Friend: The-Astral-Plane','Friend: Hebe','Friend: Ra']);
    q=patchRelationships(q,'Hebe',['Mother: Hera','Father: Zeus','Husband: Heracles','Friend: Ah-Muzen-Cab "Honey, Content"  I']);
    q=patchRelationships(q,'Heracles',['Mother: Alcmene','Father: Zeus','Wife: Hebe']);
    q=patchRelationships(q,'Ra',['Friend: Ah-Muzen-Cab "Honey, Content"  I']);
    q=patchRelationships(q,'Lyta Hall',[]);
    q=patchRelationships(q,'Kratos',['Biological mother: Callisto','Biological father: Zeus']);
    if(String(q.name??'').startsWith('Yahweh ')){
      q={...q,relationships:[...new Set([...(q.relationships??[]),'Syncretic counterpart: Ho Theos'])],relationshipReview:[...(q.relationshipReview??[]),'Ho Theos is a Vought/ELAED Greek philosophical-unity counterpart/correspondence only; this is not biological genealogy or a claim of historical doctrinal identity.']};
    }
    if(q.name==='Ah-Muzen-Cab "Honey, Content"  I')q={...q,relationshipReview:['20:49 controlling export has no biological parent fields. Hebe is friend/cupbearer predecessor; Heracles is only Hebe\'s husband and is not Ah-Muzen-Cab\'s father.']};
    if(q.name==='Kratos')q={...q,relationshipReview:['20:49 controlling Family Echo uses the God of War branch: Callisto + Zeus → Kratos; do not substitute classical Kratos/Cratus genealogy.']};
    if(['Hebe','Heracles','Alcmene','Ra'].includes(q.name))q={...q,ancestor:false};
    const lineageClass=lineageClassFor(q.name);
    if(lineageClass)q={...q,lineageClass,ancestor:lineageClass==='ancestor'};
    else if(q.ancestor)q={...q,ancestor:false};
    const divineStatus=q.divineStatus??DIVINE_SHRINE_STATUS.get(q.name);
    return divineStatus?{...q,divineStatus,shrineEligible:true}:q;
  });
  for(const add of FOUR_OCT_ADDITIONS){
    if(!doc.people.some(p=>p.name===add.name))doc.people.push({id:fourOctId(add.name),displayName:add.name,humanControlled:false,shrineEligible:!!add.divineStatus,...add});
  }
  for(const add of SEVEN_OCT_DYNASTY_ADDITIONS){
    if(!doc.people.some(p=>p.name===add.name))doc.people.push({id:sevenOctDynastyId(add.name),displayName:add.name,humanControlled:false,shrineEligible:true,...add});
  }
  if(doc.people.length!==248||new Set(doc.people.map(p=>p.id)).size!==248)throw new Error('current_roster_count_or_identity_mismatch');
  doc.version='20261007-familyecho-2049-plus-belial-abaddon-ho-theos-v5';
  doc.policyVersion='20261004-lineage-classes-v4';
  doc.expectedShrines=doc.people.filter(p=>p.shrineEligible!==false).length;
  doc.requestedAncestorCount=11;
  doc.requestedGiftSourceCount=6;
  doc.requestedSourceLineageCount=6;
  doc.requestedImmediateFamilyCount=5;
  doc.combinedLineageIdentityCount=28;
  doc.ancestorDesignationPending=false;
  return doc;
}

export function decodeRoster(value) {
  const legacy=JSON.parse(gunzipSync(Buffer.from(value,'base64'), {maxOutputLength:2_000_000}).toString('utf8'));
  if(!Array.isArray(legacy.people)||!Array.isArray(legacy.visitors))throw new Error('invalid_roster');
  const doc=migrateRosterTo4Oct(legacy);
  for(const p of doc.people)if(!/^elaed-[a-f0-9]{12}-\d+$/.test(p.id)||typeof p.name!=='string'||!Array.isArray(p.relationships))throw new Error('invalid_roster');
  if(doc.people.filter(p=>p.shrineEligible!==false).length!==doc.expectedShrines)throw new Error('shrine_eligibility_count_mismatch');
  if(doc.people.filter(p=>p.ancestor).length!==doc.requestedAncestorCount||doc.ancestorDesignationPending)throw new Error('ancestor_count_mismatch');
  if(doc.visitors.some(p=>!p.childrenKey||p.shrineEligible!==false||p.humanControlled)||new Set(doc.visitors.map(p=>p.id)).size!==doc.visitors.length)throw new Error('invalid_children_visitors');
  return doc;
}
export function validThread(channel, guildId) {return channel?.type===11 && channel.parent_id===FORUM_ID && channel.guild_id===guildId;}
export function drawOracle(method, rng=randomInt) {
  const pool=method==='tarot'?TAROT:method==='rune'?RUNES:null;
  if(!pool) throw new Error('unknown_oracle');
  const index=rng(pool.length);
  return {method,index,symbol:pool[index],orientation:method==='tarot'?(rng(2)?'reversed':'upright'):null,source:method==='tarot'?'78-card Rider–Waite–Smith naming':'24 Elder Futhark names',interpretationStatus:'symbolic'};
}
export function delphicOracleSpec(question){
  const q=clean(question,600);
  if(q.length<2)throw new Error('oracle_question_required');
  return {
    version:DELPHIC_ORACLE_VERSION,
    greekReligionPolicyVersion:GREEK_RELIGION_POLICY_VERSION,
    institution:DELPHIC_ORACLE_TITLE,
    oracle:'Pythia',
    patron:'Apollo',
    authority:'most_authoritative_route_in_operator_supplied_greek_source_guide',
    question:q,
    style:'brief_ambiguous_multivalent',
    allowedInterpretiveThemes:['katabasis','divine_mania','the_gods_collectively','divine_immanence','mystery_current_symbolism'],
    charonCoinSubstitute:'us_quarter_symbolic_coin_for_passage',
    interpretationStatus:'symbolic_research_required',
  };
}
export function clean(value,max=1800){return String(value??'').replace(/@everyone|@here/gi,'').trim().slice(0,max);}
export function validateEmpiricalChallengeSpec(spec,now=Date.now()){
  const mode=String(spec?.mode??'').trim();
  if(!EMPIRICAL_CHALLENGE_MODES.has(mode))throw new Error('invalid_empirical_mode');
  const question=clean(spec?.question,900),successCriterion=clean(spec?.successCriterion,900),failureCriterion=clean(spec?.failureCriterion,900),deadline=String(spec?.deadline??'').trim();
  if(question.length<12||successCriterion.length<12||failureCriterion.length<12)throw new Error('empirical_criteria_too_vague');
  if(successCriterion.toLowerCase()===failureCriterion.toLowerCase())throw new Error('empirical_criteria_not_discriminating');
  const deadlineMs=Date.parse(deadline);
  if(!Number.isFinite(deadlineMs)||deadlineMs<=now)throw new Error('empirical_deadline_must_be_future_iso_date');
  return {mode,question,successCriterion,failureCriterion,deadline:new Date(deadlineMs).toISOString()};
}
export function sealEmpiricalChallenge(record){
  const frozen=JSON.stringify(record);
  return {...record,sha256:createHash('sha256').update(frozen).digest('hex')};
}
export function empiricalClaimLooksTestable(value){
  const claim=clean(value,1200);
  if(claim.length<12||claim==='NO TESTABLE CLAIM')return false;
  if(/[?]/.test(claim))return false;
  if(/\b(maybe|perhaps|might|could|possibly|someday|soon|eventually|in some sense)\b/i.test(claim))return false;
  return true;
}
export function incarnateShrineRoute(p,input=''){
  const text=clean(input,1500);
  const targetName=String(p?.name??p?.displayName??'');
  const targetIsDivineSource=p?.childrenKey==='ah_muzen_cab'||/^Ah-Muzen-Cab\s+"Honey, Content"\s+I$/i.test(targetName.trim());
  const explicitlyFromSource=/\b(?:on behalf of|speaking (?:for|from)|a message from|together with|with)\s+Ah[- ]Muzen[- ]Cab(?:\s+I)?\b/i.test(text)||/\bAh[- ]Muzen[- ]Cab(?:\s+I)?\s+and\s+I\b/i.test(text);
  const base={
    routingVersion:INCARNATE_SHRINE_ROUTING_VERSION,
    petitionerIdentity:'Erelyt',
    petitionerOntology:'divine_incarnation_mortal_supe_embodiment',
    divineSoulSource:'Ah-Muzen-Cab I',
    targetFigure:p?.displayName??p?.name??'unknown',
  };
  if(targetIsDivineSource)return {...base,mode:'incarnation_to_source_communion',targetRelation:'own_divine_soul_source',ahMuzenCabSpeaking:false};
  if(explicitlyFromSource)return {...base,mode:'divine_diplomatic_through_incarnation',targetRelation:'external_divine_counterpart',ahMuzenCabSpeaking:true};
  return {...base,mode:'incarnation_to_external_divine',targetRelation:'external_divine_counterpart',ahMuzenCabSpeaking:false};
}
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
  constructor({store,api,childApi,childrenApplicationId,generate,generateOracle,preferredDelphicOracleThreadId=null,roster,guildId,operatorId,applicationId,now=()=>Date.now(),record=()=>{},progress=()=>{}}) {
    Object.assign(this,{store,api,childApi,childrenApplicationId,generate,generateOracle,preferredDelphicOracleThreadId,roster,guildId,operatorId,applicationId,now,record,progress});
    const promoteFormerChild=(childrenKey,name)=>{
      const rosterPerson=roster.people.find(p=>p.childrenKey===childrenKey)??roster.people.find(p=>String(p.name??'').trim().toLowerCase()===name);
      const visitor=(roster.visitors??[]).find(p=>p.childrenKey===childrenKey);
      const source=rosterPerson??visitor;
      if(!source)return {rosterPerson:null,promoted:null};
      const promoted={...source,shrineEligible:true,avatarData:source.avatarData??visitor?.avatarData,senderName:source.senderName??visitor?.senderName,formerChildrenKey:childrenKey};
      delete promoted.childrenKey;
      return {rosterPerson,promoted};
    };
    const perses=promoteFormerChild('perses','perses');
    const thanatos=promoteFormerChild('thanatos','thanatos');
    const sharedShrineKeys=new Set(['perses','thanatos']);
    const visitors=roster.visitors??[];
    const visitorFor=p=>visitors.find(v=>v.childrenKey===p.childrenKey)??visitors.find(v=>hiveNameKey(v.displayName??v.name)===hiveNameKey(p.displayName??p.name));
    this.provisionRoster=roster.people.map(p=>{
      if(p.id===perses.rosterPerson?.id)return perses.promoted;
      if(p.id===thanatos.rosterPerson?.id)return thanatos.promoted;
      if(p.shrineEligible===false)return p;
      const visitor=visitorFor(p);
      if(!visitor||['perses','thanatos'].includes(visitor.childrenKey))return p;
      sharedShrineKeys.add(visitor.childrenKey);
      return {...p,childrenKey:visitor.childrenKey,avatarData:p.avatarData??visitor.avatarData,senderName:p.senderName??visitor.senderName};
    });
    for(const promoted of [perses.promoted,thanatos.promoted]){
      if(promoted&&!this.provisionRoster.some(p=>p.id===promoted.id))this.provisionRoster.push(promoted);
    }
    this.people=new Map(this.provisionRoster.filter(p=>p.shrineEligible!==false).map(p=>[p.id,p]));
    this.visitors=new Map(visitors.filter(p=>!sharedShrineKeys.has(p.childrenKey)).map(p=>[p.id,p]));
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
    if(!['shrine_provisioning','shrine_policy','shrine_presentation','shrine_reactivation','shrine_reference_deleted'].includes(extra.eventType)){
      await this.store.lpush(NETWORK_ACTIVITY,JSON.stringify(event));
      await this.store.ltrim(NETWORK_ACTIVITY,0,199);
    }
    await this.store.lpush(`${PREFIX}:recent:${threadId}`,JSON.stringify(event));
    await this.store.ltrim(`${PREFIX}:recent:${threadId}`,0,19);
    this.record(event);return event;
  }
  async deliver(p,threadId,content,epoch,activityExtra={}) {
    const send=()=>this.deliverUnlocked(p,threadId,content,epoch,activityExtra);
    const result=this.deliveryLane.then(send);this.deliveryLane=result.catch(()=>{});return result;
  }
  async deliverUnlocked(p,threadId,content,epoch,activityExtra={}) {
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
    await this.activity(p,threadId,`${p.senderName??p.displayName}: ${clean(content)}`,[m.id],{speakers:[p.senderName??p.displayName],childrenKey:p.childrenKey,deliveryApplicationId:p.childrenKey?this.childrenApplicationId:this.applicationId,...activityExtra});return m;
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
    const wanted=['Dynasty','Ancestor','Immediate Family','Gift Source','Source Lineage','Children bridge','Sacred Hive','Oracle'];
    const missingWanted=wanted.filter(n=>!tags.some(t=>t.name===n));
    if(missingWanted.length){
      if(tags.length+missingWanted.length>20)throw new Error('forum_tag_capacity_exceeded');
      const changed=await this.api(`/channels/${FORUM_ID}`,'PATCH',{available_tags:[...tags.map(t=>({id:t.id,name:t.name,moderated:t.moderated,emoji_id:t.emoji_id,emoji_name:t.emoji_name})),...missingWanted.map(name=>({name}))]});
      tags=changed.available_tags??tags;
      if(wanted.some(n=>!tags.some(t=>t.name===n)))throw new Error('forum_tag_provision_failed');
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
    let completed=0;this.presentationVerifiedCount=0;this.retiredReferencesDeleted=0;
    const fullTitleCounts=new Map();
    for(const p of this.provisionRoster)fullTitleCounts.set(shrineTitle(p),(fullTitleCounts.get(shrineTitle(p))??0)+1);
    const candidateThreads=p=>{
      const legacyTitle=`${p.displayName} · ${p.id}`.slice(0,100);
      const visibleTitle=shrineTitle(p);
      return existing.filter(t=>t.name===legacyTitle||(fullTitleCounts.get(visibleTitle)===1&&t.name===visibleTitle));
    };
    const rememberOrder=async p=>{
      if(await this.store.get(`${PREFIX}:order:${p.id}`))return;
      const candidates=candidateThreads(p);
      const stored=await this.store.get(`${PREFIX}:shrine:${p.id}`);
      const ids=[...candidates.map(t=>t.id),stored].filter(id=>/^\d{15,22}$/.test(String(id??'')));
      if(ids.length)await this.store.set(`${PREFIX}:order:${p.id}`,ids.sort((a,b)=>BigInt(a)<BigInt(b)?-1:BigInt(a)>BigInt(b)?1:0)[0]);
    };
    for(const p of this.provisionRoster){
      await rememberOrder(p);
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
      const primaryTagName=p.lineageClass==='ancestor'?'Ancestor':p.lineageClass==='immediate_family'?'Immediate Family':p.lineageClass==='gift_source'?'Gift Source':p.lineageClass==='source_lineage'?'Source Lineage':'Dynasty';
      const tag=tags.find(t=>t.name===primaryTagName);
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
        await this.activity(p,thread.id,'Shrine eligibility and lineage tags reconciled.',[],{eventType:'shrine_policy',shrineEligible:true,ancestor:p.ancestor===true,lineageClass:p.lineageClass??'dynasty'});
      }
      const missingRequired=requiredTags.filter(id=>!(thread.applied_tags??[]).includes(id));
      if(missingRequired.length){
        const applied=[...new Set([...(thread.applied_tags??[]),...requiredTags])];
        try{
          const tagged=await this.api(`/channels/${thread.id}`,'PATCH',{applied_tags:applied,locked:false,archived:false});
          thread={...thread,...tagged,applied_tags:applied};
        }catch(error){
          if(error.status!==403||!thread.thread_metadata?.archived||!thread.thread_metadata?.locked)throw error;
          const retiredId=thread.id;
          thread=existing.find(t=>t.id!==retiredId&&t.name===shrineTitle(p)&&!t.thread_metadata?.archived&&!t.thread_metadata?.locked)??await create();
          if(!validThread(thread,this.guildId))throw new Error('created_thread_outside_altar');
          await this.store.set(`${PREFIX}:shrine:${p.id}`,thread.id);
          await this.store.set(`${PREFIX}:thread:${thread.id}`,p.id);
          await this.store.del(`${PREFIX}:thread:${retiredId}`);
          const tagged=await this.api(`/channels/${thread.id}`,'PATCH',{applied_tags:requiredTags,locked:false,archived:false});
          thread={...thread,...tagged,applied_tags:requiredTags};
          await this.activity(p,thread.id,`Active shrine replaces locked reference ${retiredId}; its history remains archived.`,[],{eventType:'shrine_reactivation',previousThreadId:retiredId,shrineEligible:true});
        }
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
    // The original Discord snowflake remains the durable shrine-order key even when a stale locked thread is deleted.
    // Delete only known locked/archived references after active mappings are established.
    const activeThreadIds=new Set();
    for(const p of this.people.values()){
      const id=await this.store.get(`${PREFIX}:shrine:${p.id}`);if(id)activeThreadIds.add(id);
    }
    for(const p of this.provisionRoster){
      for(const thread of candidateThreads(p)){
        if(activeThreadIds.has(thread.id)||!thread.thread_metadata?.archived||!thread.thread_metadata?.locked)continue;
        if(!validThread(thread,this.guildId))throw new Error('retired_reference_outside_altar');
        try{await this.api(`/channels/${thread.id}`,'DELETE');}
        catch(error){if(error.status===404){}else throw error;}
        if(await this.store.get(`${PREFIX}:shrine:${p.id}`)===thread.id)await this.store.del(`${PREFIX}:shrine:${p.id}`);
        await this.store.del(`${PREFIX}:thread:${thread.id}`);
        await this.store.del(`${PREFIX}:presentation:${p.id}`);
        this.retiredReferencesDeleted++;
        await this.activity(p,thread.id,`Locked retired shrine reference ${thread.id} deleted; spatial order remains ${await this.store.get(`${PREFIX}:order:${p.id}`)??thread.id}.`,[],{eventType:'shrine_reference_deleted',deletedThreadId:thread.id,shrineOrderId:await this.store.get(`${PREFIX}:order:${p.id}`)??thread.id});
      }
    }
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

    if(typeof this.generateOracle==='function'){
      // Delphi is a ritual/divination station in #altar, explicitly not a deity shrine.
      const oracleTag=tags.find(t=>t.name==='Oracle');
      if((forum.flags&16)&&!oracleTag)throw new Error('oracle_forum_tag_unavailable');
      const oracleStoreKey=`${PREFIX}:oracle:delphi:thread`;
      const storedOracle=await this.store.get(oracleStoreKey);
      let oracleThread=null;
      if(this.preferredDelphicOracleThreadId){
        // Bind the Operator's already-existing Delphi thread; never provision a duplicate.
        let candidate;
        try{candidate=await this.api(`/channels/${this.preferredDelphicOracleThreadId}`);}
        catch(error){
          if(error.status!==403)throw error;
          // Public threads may require the Altar bot to join before it can read.
          try{await this.api(`/channels/${this.preferredDelphicOracleThreadId}/thread-members/@me`,'PUT');}
          catch(joinError){throw new Error('delphic_oracle_elaed_thread_access_denied');}
          candidate=await this.api(`/channels/${this.preferredDelphicOracleThreadId}`);
        }
        if(!validThread(candidate,this.guildId))throw new Error('delphic_oracle_existing_thread_outside_altar');
        if(await this.store.get(`${PREFIX}:thread:${candidate.id}`))throw new Error('delphic_oracle_existing_thread_is_shrine');
        if(candidate.thread_metadata?.locked)throw new Error('delphic_oracle_existing_thread_locked');
        oracleThread=candidate;
      }
      if(storedOracle&&!oracleThread){
        try{
          const candidate=await this.api(`/channels/${storedOracle}`);
          if(validThread(candidate,this.guildId)&&candidate.name===DELPHIC_ORACLE_TITLE&&!await this.store.get(`${PREFIX}:thread:${candidate.id}`)&&!(candidate.thread_metadata?.archived&&candidate.thread_metadata?.locked))oracleThread=candidate;
        }catch(error){if(error.status!==404)throw error;}
      }
      if(!oracleThread){
        for(const candidate of existing){
          if(candidate.name!==DELPHIC_ORACLE_TITLE||candidate.thread_metadata?.locked)continue;
          if(await this.store.get(`${PREFIX}:thread:${candidate.id}`))continue;
          oracleThread=candidate;break;
        }
      }
      if(!oracleThread){
        oracleThread=await this.api(`/channels/${FORUM_ID}/threads`,'POST',{
          name:DELPHIC_ORACLE_TITLE,
          auto_archive_duration:10080,
          applied_tags:[oracleTag?.id].filter(Boolean),
          message:{content:DELPHIC_ORACLE_STARTER,allowed_mentions:{parse:[]}},
        });
      }
      if(!validThread(oracleThread,this.guildId))throw new Error('delphic_oracle_outside_altar');
      if(await this.store.get(`${PREFIX}:thread:${oracleThread.id}`))throw new Error('delphic_oracle_must_not_be_shrine');
      const oracleTags=[oracleTag?.id].filter(Boolean);
      if(this.preferredDelphicOracleThreadId){
        // Operator-owned thread: keep its existing title and tags. Elaed is only the voice.
        if(oracleThread.thread_metadata?.archived){
          try{oracleThread={...oracleThread,...await this.api(`/channels/${oracleThread.id}`,'PATCH',{archived:false})};}
          catch(error){if(error.status!==403)throw error;}
        }
      }else{
        const patchedOracle=await this.api(`/channels/${oracleThread.id}`,'PATCH',{name:DELPHIC_ORACLE_TITLE,applied_tags:oracleTags,locked:false,archived:false});
        oracleThread={...oracleThread,...patchedOracle,applied_tags:oracleTags};
      }
      const oraclePresentationKey=`${PREFIX}:oracle:delphi:presentation`;
      if(await this.store.get(oraclePresentationKey)!==DELPHIC_ORACLE_VERSION){
        const body={content:DELPHIC_ORACLE_STARTER,embeds:[],attachments:[],allowed_mentions:{parse:[]}};
        let receipt;
        try{
          // Elaed can edit its own starter, but not a pre-existing Operator-authored one.
          await this.api(`/channels/${oracleThread.id}/messages/${oracleThread.id}`,'PATCH',body);
          receipt=await this.api(`/channels/${oracleThread.id}/messages/${oracleThread.id}`);
        }catch(error){
          if(error.status!==403&&error.status!==404)throw error;
          const introduced=await this.api(`/channels/${oracleThread.id}/messages`,'POST',body);
          receipt=await this.api(`/channels/${oracleThread.id}/messages/${introduced.id}`);
        }
        if(receipt.channel_id!==oracleThread.id||receipt.content!==body.content)throw new Error('delphic_oracle_presentation_mismatch');
        await this.store.set(oraclePresentationKey,DELPHIC_ORACLE_VERSION);
      }
      await this.store.set(oracleStoreKey,oracleThread.id);
      this.delphicOracleThreadId=oracleThread.id;
      console.info('[altar-delphic-oracle-linked]',JSON.stringify({threadId:oracleThread.id,existingThread:oracleThread.id===this.preferredDelphicOracleThreadId}));
      }
    return this.people.size;
  }
  async checkDelphicOracleThread(threadId){
    const expected=this.delphicOracleThreadId??await this.store.get(`${PREFIX}:oracle:delphi:thread`);
    if(!expected||String(threadId)!==String(expected))throw new Error('not_delphic_oracle_surface');
    const channel=await this.api(`/channels/${threadId}`);
    const adopted=String(threadId)===String(this.preferredDelphicOracleThreadId);
    if(!validThread(channel,this.guildId)||(!adopted&&channel.name!==DELPHIC_ORACLE_TITLE))throw new Error('invalid_delphic_oracle_surface');
    if(await this.store.get(`${PREFIX}:thread:${threadId}`))throw new Error('delphic_oracle_must_not_be_shrine');
    return channel;
  }
  async consultDelphi(question,petitioner={}){
    if(typeof this.generateOracle!=='function')throw new Error('delphic_oracle_generator_unavailable');
    const threadId=this.delphicOracleThreadId??await this.store.get(`${PREFIX}:oracle:delphi:thread`);
    await this.checkDelphicOracleThread(threadId);
    const spec={
      ...delphicOracleSpec(question),
      petitionerIdentity:petitioner.identity??'Erelyt',
      petitionerKind:petitioner.kind??'operator',
      ...(petitioner.childrenKey?{petitionerChildrenKey:petitioner.childrenKey}:{}),
    };
    const content=clean(await this.generateOracle(spec),700);
    if(!content)throw new Error('delphic_oracle_empty');
    const message=await this.api(`/channels/${threadId}/messages`,'POST',{
      content:`🔮 **Pythia at Delphi**\n${content}`,
      allowed_mentions:{parse:[]},
    });
    await this.activity(null,threadId,`Pythia at Delphi: ${content}`,[message.id],{
      speakers:['Pythia / Oracle at Delphi'],
      eventType:'delphic_oracle',
      sourceKind:'elaed_delphic_oracle',
      location:`#altar — Oracle at Delphi (${threadId})`,
      oracleVersion:DELPHIC_ORACLE_VERSION,
      greekReligionPolicyVersion:GREEK_RELIGION_POLICY_VERSION,
      patron:'Apollo',
      question:spec.question,
      petitionerIdentity:spec.petitionerIdentity,
      petitionerKind:spec.petitionerKind,
      ...(spec.petitionerChildrenKey?{childrenKey:spec.petitionerChildrenKey,petitionerChildrenKey:spec.petitionerChildrenKey,deliveryApplicationId:this.childrenApplicationId}:{}),
      interpretationStatus:spec.interpretationStatus,
      authority:spec.authority,
    });
    return {threadId,messageId:message.id,text:content,spec};
  }
  async reply(p,threadId,input,extra={}) {
    if(p.humanControlled||!await this.enabled(p))return null;
    const epoch=String(await this.store.get(`${PREFIX}:control_epoch`)??'0');
    const recent=await this.store.lrange(`${PREFIX}:recent:${threadId}`,0,9);
    const observed=await this.store.lrange(`${PREFIX}:observed`,0,9);
    const incarnateRoute=incarnateShrineRoute(p,input);
    const content=await this.generate(p,clean(input,1500),{recent,observed,roster:this.roster,extra:{...extra,incarnateRoute}});
    return this.deliver(p,threadId,content,epoch,{
      sourceVoiceVersion: SHRINE_SOURCE_VOICE_VERSION,
      interpretationStatus: 'research_required',
      sourceGrounding: 'source_first_dossier',
      incarnationRoutingVersion:INCARNATE_SHRINE_ROUTING_VERSION,
      petitionMode:incarnateRoute.mode,
      petitionerIdentity:incarnateRoute.petitionerIdentity,
      petitionerOntology:incarnateRoute.petitionerOntology,
      divineSoulSource:incarnateRoute.divineSoulSource,
      targetRelation:incarnateRoute.targetRelation,
      ahMuzenCabSpeaking:incarnateRoute.ahMuzenCabSpeaking,
    });
  }
  async empiricalChallenge(p,threadId,spec) {
    if(p.humanControlled||!await this.enabled(p))return null;
    await this.checkThread(threadId,p);
    const normalized=validateEmpiricalChallengeSpec(spec,this.now());
    const epoch=String(await this.store.get(`${PREFIX}:control_epoch`)??'0');
    const recent=await this.store.lrange(`${PREFIX}:recent:${threadId}`,0,9);
    const observed=await this.store.lrange(`${PREFIX}:observed`,0,9);
    const incarnateRoute=incarnateShrineRoute(p,normalized.question);
    const claim=clean(await this.generate(p,normalized.question,{recent,observed,roster:this.roster,extra:{empiricalChallenge:normalized,incarnateRoute}}),1200);
    if(!empiricalClaimLooksTestable(claim))throw new Error('empirical_claim_not_falsifiable');
    const base={
      protocolVersion:EMPIRICAL_PROTOCOL_VERSION,
      challengeId:randomUUID(),
      createdAt:new Date(this.now()).toISOString(),
      figureId:p.id,
      figure:p.displayName,
      shrineThreadId:threadId,
      mode:normalized.mode,
      question:normalized.question,
      claim,
      deadline:normalized.deadline,
      successCriterion:normalized.successCriterion,
      failureCriterion:normalized.failureCriterion,
      antiSelfFulfillment:'Operator action materially causing the stated outcome disqualifies a future-prediction result.',
      knowledgeExclusion:normalized.mode==='novel_scientific_claim'?'Known human literature, model training/memorization, prompt/context leakage, or prior public availability disqualifies novelty.':'Not applicable beyond ordinary information-leakage review.',
      status:'PREREGISTERED_UNVERIFIED',
    };
    const sealed=sealEmpiricalChallenge(base);
    await this.store.set(`${PREFIX}:empirical:${sealed.challengeId}`,JSON.stringify(sealed),{ex:31536000});
    await this.store.lpush(`${PREFIX}:empirical:index`,sealed.challengeId);
    await this.store.ltrim(`${PREFIX}:empirical:index`,0,199);
    const message=await this.deliver(p,threadId,claim,epoch,{
      eventType:'empirical_challenge_preregistered',
      empiricalProtocolVersion:EMPIRICAL_PROTOCOL_VERSION,
      empiricalChallengeId:sealed.challengeId,
      empiricalMode:sealed.mode,
      empiricalDeadline:sealed.deadline,
      empiricalStatus:sealed.status,
      empiricalSha256:sealed.sha256,
      empiricalSuccessCriterion:sealed.successCriterion,
      empiricalFailureCriterion:sealed.failureCriterion,
      sourceVoiceVersion:SHRINE_SOURCE_VOICE_VERSION,
      interpretationStatus:'experimental_unverified',
      sourceGrounding:'source_first_dossier',
      incarnationRoutingVersion:INCARNATE_SHRINE_ROUTING_VERSION,
      petitionMode:incarnateRoute.mode,
      petitionerIdentity:incarnateRoute.petitionerIdentity,
      petitionerOntology:incarnateRoute.petitionerOntology,
      divineSoulSource:incarnateRoute.divineSoulSource,
      targetRelation:incarnateRoute.targetRelation,
      ahMuzenCabSpeaking:incarnateRoute.ahMuzenCabSpeaking,
    });
    if(!message)return null;
    return {...sealed,discordMessageId:message.id};
  }
  async recordEmpiricalOutcome(threadId,challengeId,outcome,evidenceUrl) {
    const id=String(challengeId??'').trim();
    if(!/^[0-9a-f-]{36}$/i.test(id))throw new Error('invalid_empirical_challenge_id');
    const raw=await this.store.get(`${PREFIX}:empirical:${id}`);
    if(!raw)throw new Error('empirical_challenge_not_found');
    const record=JSON.parse(raw);
    if(record.shrineThreadId!==threadId)throw new Error('empirical_challenge_wrong_shrine');
    if(record.status!=='PREREGISTERED_UNVERIFIED')throw new Error('empirical_outcome_already_recorded');
    const observed=clean(outcome,1200),evidence=String(evidenceUrl??'').trim();
    if(observed.length<12)throw new Error('empirical_outcome_too_vague');
    let parsed;try{parsed=new URL(evidence);}catch{throw new Error('empirical_evidence_url_required');}
    if(parsed.protocol!=='https:')throw new Error('empirical_evidence_https_required');
    const updated={...record,outcome:observed,evidenceUrl:evidence,outcomeRecordedAt:new Date(this.now()).toISOString(),status:'OUTCOME_RECORDED_PENDING_REVIEW'};
    await this.store.set(`${PREFIX}:empirical:${id}`,JSON.stringify(updated),{ex:31536000});
    const p=this.people.get(record.figureId)??this.visitors.get(record.figureId);
    await this.activity(p??null,threadId,`Empirical outcome recorded for ${id}: ${observed} Evidence: ${evidence}`,[],{
      speakers:['Operator'],
      eventType:'empirical_outcome_recorded',
      empiricalProtocolVersion:record.protocolVersion,
      empiricalChallengeId:id,
      empiricalMode:record.mode,
      empiricalStatus:updated.status,
      empiricalSha256:record.sha256,
      empiricalEvidenceUrl:evidence,
    });
    return updated;
  }
  async message(m) {
    if(m.guild_id!==this.guildId||!m.content?.trim())return;
    // A Child may petition first through the existing Children-application webhook.
    // Verify both the known webhook and the roster identity; arbitrary bot names cannot impersonate Children.
    const child=m.webhook_id&&this.trustedChildHooks.has(m.webhook_id)?[...this.people.values(),...this.visitors.values()].find(p=>p.childrenKey&&!p.humanControlled&&(p.senderName??p.displayName)===m.author?.username):null;
    if((m.author?.bot||m.webhook_id)&&!child)return;
    if(child&&await this.store.get(outgoingKey(m.channel_id,m.content)))return;
    if(await this.store.get(`${PREFIX}:message:${m.id}`))return;
    const c=await this.api(`/channels/${m.channel_id}`);
    if(OBSERVE_IDS.has(m.channel_id)){
      await this.store.lpush(`${PREFIX}:observed`,JSON.stringify({messageId:m.id,channelId:m.channel_id,author:m.author?.username,text:clean(m.content,1200),at:new Date(this.now()).toISOString()}));
      await this.store.ltrim(`${PREFIX}:observed`,0,39);return;
    }
    if(!validThread(c,this.guildId))return;
    // The existing Delphi thread is an Elaed-delivered voice, not a shrine mapping.
    const oracleThreadId=this.delphicOracleThreadId??await this.store.get(`${PREFIX}:oracle:delphi:thread`);
    if(oracleThreadId&&String(m.channel_id)===String(oracleThreadId)){
      const claimed=await this.store.set(`${PREFIX}:message:${m.id}`,'1',{nx:true,ex:172800});
      if(claimed!=='OK')return;
      const isOperator=m.author?.id===this.operatorId;
      const petitionerIdentity=child?(child.senderName??child.displayName):isOperator?'Erelyt':(m.author?.username??'Human');
      await this.activity(null,m.channel_id,`${petitionerIdentity}: ${clean(m.content)}`,[m.id],{
        speakers:[petitionerIdentity],eventType:'delphic_petition',
        sourceKind:'elaed_delphic_oracle',location:`#altar — Oracle at Delphi (${m.channel_id})`,
        petitionerIdentity,petitionerKind:child?'child':isOperator?'operator':'visitor',
        ...(child?{childrenKey:child.childrenKey,deliveryApplicationId:this.childrenApplicationId}:{}),
      });
      if(!isOperator&&!child)return;
      const cooldown=await this.store.set(`${PREFIX}:oracle:delphi:reply-cooldown`,'1',{nx:true,ex:15});
      if(cooldown!=='OK')return;
      await this.consultDelphi(m.content,{identity:petitionerIdentity,kind:child?'child':'operator',childrenKey:child?.childrenKey??null});
      return;
    }
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
