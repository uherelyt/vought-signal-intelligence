import { decodeRoster } from './core.mjs';

let cachedValue,cachedRoster;
const normalized=value=>String(value??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

// Private runtime data also informs Children conversations. No genealogy or dossiers are compiled into public source.
export function formatAltarCanonMemory(query,roster){
  const text=` ${normalized(query)} `;
  const blocks=[];
  if(/\baltar\b|\bshrines?\b|\bancestors?\b|\bgenealogy\b|\blineage\b/.test(text)){
    blocks.push(`Current altar policy ${roster.policyVersion}: the full tree has ${roster.people.length} identities; ${roster.expectedShrines} eligible god/ancestor shrines are active. Children visit without dedicated shrines, except Ah-Muzen-Cab I's explicit shared identity. Gods may visit other registered altar threads; the altar application never delivers to ordinary Hero Channels. Devotional Child visits do not silently relocate their established ship stations.`);
  }
  if(/\bancestors?\b|\bgenealogy\b|\blineage\b/.test(text)){
    blocks.push(`Erelyt's combined lineage has ${roster.people.filter(p=>p.ancestor).length} named ancestors: ${roster.ancestorDefinition}\nNamed ancestors: ${roster.people.filter(p=>p.ancestor).map(p=>p.name).join('; ')}. Cab II is an ancestor in the registry but a Child visitor without a dedicated shrine. Repeated unnamed Mother/Father and external ML3QN links remain unresolved. Source: https://app.notion.com/p/3eda85000edc812a8082e2b69b950429`);
  }
  const matched=roster.people.filter(p=>p.dossier).map(p=>{
    const full=normalized(p.name),primary=normalized(p.name.split('"')[0]);
    const score=text.includes(` ${full} `)?full.length+100:primary.length>=4&&text.includes(` ${primary} `)?primary.length:0;
    return {p,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,3);
  for(const {p} of matched){
    const d=p.dossier;
    blocks.push(`${p.name}: ${p.ancestor?'combined-lineage ancestor; ':''}${p.shrineEligible?'eligible shrine':'Child visitor, no dedicated shrine'}.\nSourced concerns: ${d.domains}.\n${d.personality?`Established Children personality: ${d.personality}\n`:''}Voice direction: ${d.performanceDirection}. ${d.personalityBasis}\n${d.ultimateDream?`Established aspiration: ${d.ultimateDream}\n`:''}Continuity: ${d.sourceStatus}. Local source: ${d.canonSource}; external sources: ${(d.sources??[]).map(s=>s.url).join(', ')||'unresolved; do not invent a source match'}.`);
  }
  return blocks.length?`[Current private altar canon; sourced concerns and adaptations remain distinct]\n${blocks.join('\n\n')}`:'';
}

export function renderAltarCanonMemory(query,env=process.env){
  if(env.ALTAR_ENABLED!=='true'||!env.ALTAR_ROSTER_GZIP_BASE64)return '';
  const value=env.ALTAR_ROSTER_GZIP_BASE64;
  if(value!==cachedValue){
    cachedValue=value;cachedRoster=null;
    try{cachedRoster=decodeRoster(value);}catch{/* The altar health reports invalid data; Children must not invent it. */}
  }
  return cachedRoster?.policyVersion?formatAltarCanonMemory(query,cachedRoster):'';
}
