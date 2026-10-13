/**
 * Private October 13 Family Echo office reconciliation.
 * The source export and canonical descriptions are passed ONLY via Render env.
 * This is additive to the existing Oct 12 overlay, not a replacement.
 * Never infer an identity merger, kinship, or shrine eligibility from a shared office.
 */
export const FAMILY_ECHO_OFFICE_PATCH_VERSION='20261013-familyecho-offices-v1';
const SOURCE_IDS=new Set(['NIYYY','X39JY','ZONHQ','BJYLT']);
const CONTROLLED=new Map([['X39JY','cab'],['BJYLT','ah_muzen_cab']]);

export function applyFamilyEchoOfficePatch(doc,raw){
  if(!raw)return doc;
  let delta;
  try{delta=JSON.parse(raw);}catch{throw new Error('family_echo_office_patch_invalid_json');}
  if(!delta||delta.version!==FAMILY_ECHO_OFFICE_PATCH_VERSION||
     delta.sourceIndividuals!==330||
     !/^[a-f0-9]{64}$/.test(String(delta.sourceSha256??''))||
     !Array.isArray(delta.entries)||delta.entries.length!==4||
     !Array.isArray(delta.guidance)||delta.guidance.length>6||
     delta.guidance.some(s=>typeof s!=='string'||s.length>800)||
     'title' in delta||'formalTitle' in delta)
    throw new Error('family_echo_office_patch_version_or_schema_mismatch');

  const people=doc.people.map(p=>({
    ...p,
    relationships:[...(p.relationships??[])],
    relationshipReview:[...(p.relationshipReview??[])]
  }));
  const seen=new Set();
  const used=new Set();
  let updated=0,addedReferences=0;
  for(const entry of delta.entries){
    if(!entry||!SOURCE_IDS.has(entry.sourceId)||seen.has(entry.sourceId)||
       typeof entry.name!=='string'||!entry.name.trim()||entry.name.length>140||
       !['Male','Female','Other'].includes(entry.gender)||
       typeof entry.office!=='string'||!entry.office.trim()||entry.office.length>2300||
       !Array.isArray(entry.aliases)||entry.aliases.length>8||
       entry.aliases.some(s=>typeof s!=='string'||!s.trim()||s.length>140)||
       typeof entry.identityBoundary!=='string'||!entry.identityBoundary.trim()||
       entry.identityBoundary.length>800||
       'title' in entry||'formalTitle' in entry||
       'shrineEligible' in entry||'humanControlled' in entry||
       'relationshipsAdd' in entry||'create' in entry)
      throw new Error('family_echo_office_patch_invalid_entry');
    seen.add(entry.sourceId);
    const key=CONTROLLED.get(entry.sourceId);
    const exactByChild=key?people.filter(p=>p.childrenKey===key):[];
    if(exactByChild.length>1)throw new Error('family_echo_office_patch_ambiguous_child');
    const aliases=new Set([entry.name,...entry.aliases].map(s=>s.trim().toLowerCase()));
    const candidates=exactByChild.length?exactByChild:
      people.filter(p=>p.dynastySourceId===entry.sourceId||
        aliases.has(String(p.name??'').trim().toLowerCase())||
        aliases.has(String(p.displayName??'').trim().toLowerCase()));
    if(candidates.length>1)throw new Error('family_echo_office_patch_ambiguous_identity');
    const p=candidates[0];
    if(p){
      if(used.has(p.id))throw new Error('family_echo_office_patch_duplicate_target');
      used.add(p.id);
      if(!String(p.sourceOffice??'').includes(entry.office))
        p.sourceOffice=[p.sourceOffice,entry.office].filter(Boolean).join(' | ');
      if(!p.relationshipReview.includes(entry.identityBoundary))
        p.relationshipReview.push(entry.identityBoundary);
      updated++;
    }else{
      if(key)throw new Error('family_echo_office_patch_missing_shared_persona');
      // Referenced gods may be absent from the bounded older overlay.
      // Never auto-provision a shrine, chat persona, or privileged identity.
      people.push({
        id:'elaed-familyecho-'+entry.sourceId.toLowerCase()+'-ref',
        dynastySourceId:entry.sourceId,
        name:entry.name,displayName:entry.name,gender:entry.gender,
        relationships:[],relationshipReview:[entry.identityBoundary],
        sourceOffice:entry.office,sourceClassification:'familyecho_reference_only',
        humanControlled:false,shrineEligible:false,ancestor:false,lineageClass:'dynasty'
      });
      addedReferences++;
    }
  }
  if(seen.size!==SOURCE_IDS.size||
     [...SOURCE_IDS].some(id=>!seen.has(id)))
    throw new Error('family_echo_office_patch_missing_entry');
  const priorShrines=doc.people.filter(p=>p.shrineEligible!==false).length;
  if(people.filter(p=>p.shrineEligible!==false).length!==priorShrines)
    throw new Error('family_echo_office_patch_shrine_count_changed');
  return {
    ...doc,people,
    version:delta.version,
    sourceIndividuals:delta.sourceIndividuals,
    sourceSha256:delta.sourceSha256,
    officePatchUpdated:updated,
    officePatchAddedReferences:addedReferences,
    canonOverrides:[...(doc.canonOverrides??[]),...delta.guidance]
  };
}
