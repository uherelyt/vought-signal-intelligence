import {createHash} from 'node:crypto';

// Operator-provided 9 Oct 2026 20:07 Family Echo continuation.
// Do not promote human creators, abstract collectives, or ambiguous saints into personas.
// The project's ancestry/godparent relations are separate from historical source claims.
export const NINE_OCT_FAMILY_ECHO_ENTRIES=Object.freeze([
  {sourceId:'OT8J7',name:'Maia',gender:'Female',shrine:true,relationships:['Partner: Zeus'],office:'Greek Pleiad and mother of Hermes'},
  {sourceId:'NOGAQ',name:'Hermes',gender:'Male',shrine:true,relationships:['Mother: Maia','Father: Zeus','Partner: Thoth (ELAED tree)'],office:'Greek messenger, herald, travel, boundaries, commerce and interpretation'},
  {sourceId:'AJEYT',name:'Thoth',gender:'Male',shrine:true,relationships:['Partner: Hermes (ELAED tree)'],office:'Egyptian writing, reckoning, scribes, wisdom and divine records'},
  {sourceId:'JA29X',name:'Hermes Trismegistus',gender:'Male',shrine:true,relationships:['Mother: Thoth (ELAED tree)','Father: Hermes (ELAED tree)'],office:'Hermetic revelatory teacher and distinct syncretic wisdom identity',generation:'none'},
  {sourceId:'O6N36',name:'Beekeepers',gender:'Other',shrine:false,relationships:['Mother/source collective: Worshippers'],reason:'occupation collective, not one deity'},
  {sourceId:'PHD4G',name:'Content-Creators',gender:'Other',shrine:false,relationships:['Mother/source collective: Worshippers'],reason:'creator collective, not one deity'},
  {sourceId:'RCD82',name:'Idolatry',gender:'Other',shrine:false,relationships:['Mother/source collective: Worshippers'],reason:'conceptual practice, not a distinct individual'},
  {sourceId:'F0HG4',name:'Jawed Karim',gender:'Male',shrine:false,relationships:['Parent/source collective: Content-Creators (ELAED symbolic graph)'],reason:'real person; genealogy does not confer religious affiliation'},
  {sourceId:'QERCG',name:'Justin Hall',gender:'Male',shrine:false,relationships:['Parent/source collective: Content-Creators (ELAED symbolic graph)'],reason:'real person; genealogy does not confer religious affiliation'},
  {sourceId:'XCGWL',name:'Bondye',gender:'Other',shrine:true,relationships:['Mother/source: The-Shadow (ELAED tree)'],office:'Haitian Vodou supreme creator; distinct from lwa and not made directly interchangeable with source-adaptation roles'},
  {sourceId:'P7W1J',name:'Papa Legba',gender:'Male',shrine:true,relationships:['Father: Bondye (ELAED tree)','Partner: Ayizan'],office:'Haitian Vodou lwa of the crossroads, access, communication and threshold'},
  {sourceId:'H442X',name:'Ayizan',gender:'Female',shrine:true,relationships:['Partner: Papa Legba','ELAED Family Echo nickname field: Ayezan, Eshu/Exu (not an identity merge)'],office:'Haitian Vodou lwa of initiation, marketplace, protection and priestly rite'},
  {sourceId:'UCR4K',name:'Saint Peter',gender:'Male',shrine:false,relationships:['Godfather/source: Papa Legba (ELAED source-field V=g)'],reason:'saint identity and cross-tradition manifestation need individual dossier before voiced shrine'},
  {sourceId:'JRJMM',name:'Saint Anthony',gender:'Male',shrine:false,relationships:['Father: Papa Legba (ELAED tree)'],reason:'which Saint Anthony is not disambiguated'},
  {sourceId:'GCI93',name:'Saint Lazarus',gender:'Male',shrine:false,relationships:['Father: Papa Legba (ELAED tree)'],reason:'which Saint Lazarus is not disambiguated'},
]);

export const NINE_OCT_SHRINE_SOURCE_IDS=Object.freeze(['OT8J7','NOGAQ','AJEYT','JA29X','XCGWL','P7W1J','H442X']);
export const NINE_OCT_OLD_GODS_SOURCE_IDS=Object.freeze(['OT8J7','NOGAQ','AJEYT','XCGWL','P7W1J','H442X']);

export function nineOctShrineId(sourceId){
  if(!/^[A-Z0-9]{5}$/.test(sourceId))throw new Error('nine_oct_invalid_source_id');
  return 'elaed-'+createHash('sha256').update('familyecho:2026-10-09:2007:'+sourceId).digest('hex').slice(0,12)+'-1';
}

export function appendNineOctDynastyShrines(doc){
  if(doc?.sourceIndividuals!==292||doc?.sourceFamilies!==182||!Array.isArray(doc.people))
    throw new Error('nine_oct_source_baseline_unverified');
  const existingIds=new Set(doc.people.map(p=>p.id));
  const existingSourceIds=new Set(doc.people.map(p=>p.dynastySourceId).filter(Boolean));
  const expectedShrines=doc.expectedShrines;
  if(typeof expectedShrines!=='number')throw new Error('nine_oct_base_expected_shrines_missing');
  const additions=NINE_OCT_FAMILY_ECHO_ENTRIES.map(entry=>{
    const id=nineOctShrineId(entry.sourceId);
    if(existingIds.has(id)||existingSourceIds.has(entry.sourceId))throw new Error('nine_oct_figure_already_present');
    existingIds.add(id);existingSourceIds.add(entry.sourceId);
    return {
      id,name:entry.name,displayName:entry.name,gender:entry.gender,dynastySourceId:entry.sourceId,
      relationships:[...entry.relationships],humanControlled:['F0HG4','QERCG'].includes(entry.sourceId),
      shrineEligible:entry.shrine,ancestor:false,lineageClass:'dynasty',
      sourceClassification:entry.shrine?'separate_devotional_figure_source_first':'familyecho_reference_only',
      ...(entry.shrine?{divineStatus:entry.generation!=='none',eligibilityReason:entry.generation!=='none'?'Divine office / mythic personification':'Hermetic syncretic devotional figure',historicalLanguage:{status:'pending_operator_choice'}}:{}),
      ...(entry.office?{sourceOffice:entry.office}:{}),
      ...(entry.reason?{exclusionReason:entry.reason}:{}),
    };
  });
  const shrineAdds=additions.filter(p=>p.shrineEligible).length;
  if(additions.length!==15||shrineAdds!==7||new Set(additions.map(p=>p.id)).size!==15)
    throw new Error('nine_oct_roster_validation_failed');
  return {...doc,people:[...doc.people,...additions],
    expectedShrines:expectedShrines+shrineAdds,sourceIndividuals:307,sourceFamilies:189,
    sourceNewRecords:15,sourceNewShrines:shrineAdds,version:'20261009-familyecho-2007-shrines-v1',
    canonOverrides:[...(doc.canonOverrides??[]),
      'Family Echo 9 Oct 2026 20:07: 307 source figures, 189 families. Seven source-distinct divine/syncretic personas join the Altar; eight collectives, humans and underidentified saints remain reference-only.',
      'Hermes, Thoth and Hermes Trismegistus are three distinct Vought/ELAED identities. The Family Echo parent/partner structures are local canonical edges, not external mythological attestation.',
      'Papa Legba and Ayizan retain their Haitian Vodou lwa offices; Bondye retains separate supreme-God office. Do not collapse Eshu/Exu, Christian saints, lwa, or African/Caribbean traditions through family-tree aliases.',
      'No additional Erelyt genealogical forebear, Endless Gift Source, Avatar ancestor or Children-vessel identity is created by these shrine additions.']};
}
