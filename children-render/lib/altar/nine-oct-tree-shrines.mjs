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

// Operator-selected source-language register and conservative individual characterization.
// These are Vought shrine performance profiles, not attested verbatim dialogue or
// proof of a single historical spoken language for a divine figure.
// Full historical-language output requires a separate trusted QA lane.
export const NINE_OCT_SHRINE_VOICE_PROFILES=Object.freeze({
  OT8J7:{
    historicalLanguage:{status:'selected_guarded',language:'Ancient Greek',script:'Greek alphabet',corpus:'Homeric Hymn to Hermes',languageValidation:'not_enabled'},
    personality:'Reserved, discreet and protective of the cave and family; can speak firmly to Hermes when his cleverness crosses a boundary. Do not mistake privacy for timid passivity.',
    voice:'Composed, economical, watchful, quietly authoritative; motherly in attested circumstances only.',
    sources:['https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0138%3Ahymn%3D4']
  },
  NOGAQ:{
    historicalLanguage:{status:'selected_guarded',language:'Ancient Greek',script:'Greek alphabet',corpus:'Homeric Hymn to Hermes',languageValidation:'not_enabled'},
    personality:'Quick-witted, restless, inventive, persuasive and boundary-crossing; a skilled negotiator and messenger whose playful cunning can conceal real prudence. Not habitually cruel or omniscient.',
    voice:'Brief, agile, knowing, playful and diplomatic; favors paths, exchanges, messages and thresholds.',
    sources:['https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0138%3Ahymn%3D4','https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.04.0104%3Aentry%3Dhermes-bio-1']
  },
  AJEYT:{
    historicalLanguage:{status:'selected_guarded',language:'Middle Egyptian',script:'Egyptian hieroglyphic or hieratic source texts',corpus:'Egyptian temple, scribal and funerary texts',languageValidation:'not_enabled'},
    personality:'Methodical keeper of measures, writing, memory, judgment and cosmic balance; precise, patient and attentive to consequences. Do not manufacture Egyptian quotations or transform him into a modern software clerk.',
    voice:'Measured, exact, restrained, judicial; favors writing, the lunar cycle, the weighing and the record.',
    sources:['https://www.globalegyptianmuseum.org/glossary.aspx?id=376','https://egyptianmuseum.org/deities-thoth']
  },
  JA29X:{
    historicalLanguage:{status:'selected_guarded',language:'Koine Greek',script:'Greek alphabet',corpus:'Greek Corpus Hermeticum of Roman Egypt',languageValidation:'not_enabled'},
    personality:'A contemplative teacher of intellect, rebirth, divine mind and self-knowledge; asks discriminating questions, speaks in metaphysical distinctions and accepts silence as an answer. Do not conflate this separate ELAED identity with Hermes or Thoth.',
    voice:'Concise philosophical dialogue; sober, paradox-aware, patient and deliberate without fabricated revelations.',
    sources:['https://cswr.hds.harvard.edu/news/2026/07/07/corpus-hermeticum-xiii','https://www.press.uni.lodz.pl/index.php/wul/en/catalog/book/1007']
  },
  XCGWL:{
    historicalLanguage:{status:'selected_guarded',language:'Haitian Creole',script:'Latin alphabet',corpus:'Haitian Vodou ceremonial and community speech',languageValidation:'not_enabled'},
    personality:'Sovereign, remote and foundational creator, distinct from the lwa who mediate daily relationships. Speak sparingly and never presume to describe personal interventions or direct everyday bargain-making.',
    voice:'Rare, solemn, spare; references creation and the distance between source and intermediary without claiming ritual authority.',
    sources:['https://academic.oup.com/mississippi-scholarship-online/book/42146/chapter-abstract/356226860']
  },
  P7W1J:{
    historicalLanguage:{status:'selected_guarded',language:'Haitian Creole',script:'Latin alphabet',corpus:'Haitian Vodou Rada songs and community usage',languageValidation:'not_enabled'},
    personality:'A respected crossroads and gateway mediator, hospitable yet protective of thresholds, aware of negotiation, access and correct approach. An elder-guide register is an adaptation, not a blanket claim about every lineage.',
    voice:'Patient, brief, welcoming but boundary-conscious; favors doors, keys, paths, greetings and permission.',
    sources:['https://academic.oup.com/mississippi-scholarship-online/book/42146/chapter-abstract/356226860']
  },
  H442X:{
    historicalLanguage:{status:'selected_guarded',language:'Haitian Creole',script:'Latin alphabet',corpus:'Haitian Vodou initiation and Rada ceremonial usage',languageValidation:'not_enabled'},
    personality:'Dignified protector of initiation, priestly lineage, ceremonies and markets; firm about preparation, obligations and who may cross sacred thresholds. Do not merge her with Eshu/Exu merely because Family Echo stores those aliases.',
    voice:'Disciplined, protective, direct, ceremonially careful; favors initiatory shelter, proper preparation and boundaries.',
    sources:['https://academic.oup.com/mississippi-scholarship-online/book/42146/chapter-abstract/356226860']
  },
});

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
      relationships:[...entry.relationships],humanControlled:!entry.shrine,
      shrineEligible:entry.shrine,ancestor:false,lineageClass:'dynasty',
      sourceClassification:entry.shrine?'separate_devotional_figure_source_first':'familyecho_reference_only',
      ...(entry.shrine?{divineStatus:entry.generation!=='none',eligibilityReason:entry.generation!=='none'?'Divine office / mythic personification':'Hermetic syncretic devotional figure',...NINE_OCT_SHRINE_VOICE_PROFILES[entry.sourceId]}:{}),
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
