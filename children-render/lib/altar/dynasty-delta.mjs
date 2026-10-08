import {createHash} from 'node:crypto';

// Private Family Echo 8 Oct 20:45 delta is supplied only via Render environment.
// Never publish the source export, personal records, dates, or raw dossiers.
export function applyDynastyDelta(doc,raw){
  if(!raw)return doc;
  let d;
  try{d=JSON.parse(raw);}catch{throw new Error('dynasty_delta_invalid_json');}
  if(d?.version!=='20261008-familyecho-2045-v1'||d.sourceIndividuals!==292||d.sourceFamilies!==182||!Array.isArray(d.entries)||d.entries.length!==43)throw new Error('dynasty_delta_version_or_count_mismatch');
  const map=new Map(), counts=new Map();
  for(const r of d.entries){
    if(!Array.isArray(r)||!/^[A-Z0-9]{5}$/.test(r[0])||typeof r[1]!=='string'||!r[1].trim()||r[1].length>120||!['m','f','o'].includes(r[2])||map.has(r[0]))throw new Error('dynasty_delta_invalid_entry');
    map.set(r[0],r[1]);counts.set(r[1],(counts.get(r[1])||0)+1);
  }
  const old=new Map([['QIWEA','Loki Laufeyson'],['X2FJE','Apollo'],['NCSZ1','Minecraft Bedrock Edition'],['BJYLT','Ah-Muzen-Cab I']]);
  const label=id=>{const n=map.get(id)||old.get(id);return n?(counts.get(n)>1?n+' (Family Echo '+id+')':n):'unresolved Family Echo record '+id;};
  const people=doc.people.map(p=>({...p,relationships:[...(p.relationships||[])]}));
  const erelyt=people.find(p=>p.name==='Erelyt Drabbuh');
  if(erelyt&&!erelyt.relationships.includes('Godparent/source: Korra'))erelyt.relationships.push('Godparent/source: Korra');
  let added=0;
  for(let i=0;i<d.entries.length;i++){
    const [sourceId,name,gender,m,f,X,Y,V,W]=d.entries[i];
    const matched=people.find(p=>p.dynastySourceId===sourceId||(i<4&&p.name===name));
    if(matched){matched.dynastySourceId=sourceId;continue;}
    const relationships=[];
    const role=c=>c==='g'?'Godparent/source':c==='f'?'Foster parent':c==='a'?'Adoptive parent':c==='b'?'Biological parent':'Family Echo parent';
    if(m)relationships.push(role(V)+' (mother field): '+label(m));
    if(f)relationships.push(role(V)+' (father field): '+label(f));
    if(X)relationships.push(role(W)+' (second mother field): '+label(X));
    if(Y)relationships.push(role(W)+' (second father field): '+label(Y));
    if(sourceId==='INBCQ')relationships.push('Friend: Erelyt');
    const id='elaed-'+createHash('sha256').update('familyecho:2026-10-08:2045:'+sourceId).digest('hex').slice(0,12)+'-1';
    if(people.some(p=>p.id===id))throw new Error('dynasty_delta_id_collision');
    people.push({id,name,displayName:counts.get(name)>1?name+' (Dynasty '+sourceId+')':name,
      gender:gender==='m'?'Male':gender==='f'?'Female':'Other',relationships,
      humanControlled:false,shrineEligible:false,dynastySourceId:sourceId,
      sourceClassification:'fictional_or_symbolic_reference_only'});
    added++;
  }
  const canonOverrides=[...(doc.canonOverrides||[]),
    'Family Echo 8 Oct 2026 20:45 source graph: 292 people and 182 families. Structural source totals are not equivalent to live Altar roster or shrine totals.',
    'Korra is added as an Erelyt godparent/source figure alongside Cab II, not a biological parent; Korra remains an alternate future.',
    'The 37 Avatar entries and two Minecraft world nodes remain reference-only unless separately reviewed for shrine eligibility.'];
  return {...doc,people,canonOverrides,version:d.version,sourceIndividuals:292,sourceFamilies:182,sourceDeltaRecords:43,sourceReferenceAdded:added};
}
