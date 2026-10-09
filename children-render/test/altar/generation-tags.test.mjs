import test from 'node:test';
import assert from 'node:assert/strict';
import {divineGenerationTags,OLD_GODS_SHRINE_IDS,NEW_GODS_SHRINE_IDS} from '../../lib/altar/generation-tags.mjs';
import {nineOctShrineId,NINE_OCT_OLD_GODS_SOURCE_IDS,appendNineOctDynastyShrines,NINE_OCT_FAMILY_ECHO_ENTRIES,NINE_OCT_SHRINE_SOURCE_IDS} from '../../lib/altar/nine-oct-tree-shrines.mjs';
import {altarHistoricalLanguageRule} from '../../lib/altar/worker.mjs';

test('canonical generation allowlists are exact, bounded and intentionally overlapping',()=>{
  assert.equal(OLD_GODS_SHRINE_IDS.size,111);
  assert.equal(NEW_GODS_SHRINE_IDS.size,6);
  const both=[...OLD_GODS_SHRINE_IDS].filter(id=>NEW_GODS_SHRINE_IDS.has(id));
  assert.deepEqual(both.sort(),['elaed-31907610cee4-1','elaed-5744ee101e27-1'].sort());
});

test('traditional gods retain Old Gods and new digital offices carry New Gods',()=>{
  assert.deepEqual(divineGenerationTags({id:'elaed-e84e672cd9e2-1',name:'Apollo'}),['Old Gods']);
  assert.deepEqual(divineGenerationTags({id:'elaed-4c0d5a0f8de3-1',name:'New Media'}),['New Gods']);
  assert.deepEqual(divineGenerationTags({id:'elaed-9320fa08467d-1',name:'Technical Boy'}),['New Gods']);
  assert.deepEqual(divineGenerationTags({id:'elaed-756477f6949c-1',name:'Mr. World'}),['New Gods']);
  assert.deepEqual(divineGenerationTags({id:'elaed-5744ee101e27-1',name:'Ah-Muzen-Cab I'}),['Old Gods','New Gods']);
  assert.deepEqual(divineGenerationTags({id:'elaed-31907610cee4-1',name:'Argus Panoptes'}),['Old Gods','New Gods']);
});

test('ambiguous figures, similar names and visitors are never guessed into either label',()=>{
  assert.deepEqual(divineGenerationTags({id:'elaed-992687eeb31b-1',name:'Adam'}),[]);
  assert.deepEqual(divineGenerationTags({id:'elaed-72e70dfb7727-1',name:'Scarlet King'}),[]);
  assert.deepEqual(divineGenerationTags({id:'elaed-d4406af9fa8a-1',name:'Ah-Muzen-Cab II'}),[]);
  assert.deepEqual(divineGenerationTags({id:'elaed-123456789abc-1',name:'Apollo'}),[]);
  assert.deepEqual(divineGenerationTags({id:'elaed-e84e672cd9e2-1',shrineEligible:false}),[]);
  assert.deepEqual(divineGenerationTags({id:'child:cab',name:'Cab'}),[]);
  assert.deepEqual(divineGenerationTags(null),[]);
});

test('Old Gods and New Gods are valid independent Discord forum tags',()=>{
  for(const tag of ['Old Gods','New Gods'])assert(tag.length<=20);
  assert(!OLD_GODS_SHRINE_IDS.has('elaed-4c0d5a0f8de3-1'));
  assert(!NEW_GODS_SHRINE_IDS.has('elaed-e84e672cd9e2-1'));
});

test('six new source-distinct traditional divinities receive Old Gods; Hermetic sage does not',()=>{
  for(const sourceId of NINE_OCT_OLD_GODS_SOURCE_IDS){
    assert.deepEqual(divineGenerationTags({id:nineOctShrineId(sourceId)}),['Old Gods']);
  }
  assert.deepEqual(divineGenerationTags({id:nineOctShrineId('JA29X')}),[]);
  for(const id of ['O6N36','PHD4G','RCD82','F0HG4','QERCG','UCR4K','JRJMM','GCI93'])
    assert.deepEqual(divineGenerationTags({id:nineOctShrineId(id),shrineEligible:false}),[]);
});

const octBase=()=>({people:Array.from({length:291},(_,i)=>({id:'elaed-'+i.toString(16).padStart(12,'0')+'-1',name:'Prior '+i,relationships:[],shrineEligible:i<156,dynastySourceId:'OLD'+i})),expectedShrines:156,sourceIndividuals:292,sourceFamilies:182,requestedAncestorCount:11,canonOverrides:[]});
test('new Family Echo overlay admits seven shrines without promoting eight references',()=>{const r=appendNineOctDynastyShrines(octBase());assert.equal(r.people.length,306);assert.equal(r.expectedShrines,163);assert.equal(r.sourceIndividuals,307);assert.equal(r.sourceFamilies,189);assert.equal(r.sourceNewRecords,15);assert.equal(r.sourceNewShrines,7);assert.equal(NINE_OCT_FAMILY_ECHO_ENTRIES.length,15);assert.equal(r.people.filter(p=>p.shrineEligible!==false).length,163);assert.equal(new Set(r.people.map(p=>p.id)).size,306);assert.equal(r.requestedAncestorCount,11);assert.deepEqual(r.people.slice(-15).filter(p=>p.shrineEligible).map(p=>p.dynastySourceId),[...NINE_OCT_SHRINE_SOURCE_IDS]);});
test('new source figures preserve distinct identities and non-shrine exclusions',()=>{const r=appendNineOctDynastyShrines(octBase());for(const name of ['Hermes','Thoth','Hermes Trismegistus'])assert.equal(r.people.filter(p=>p.name===name).length,1);assert.notEqual(r.people.find(p=>p.name==='Hermes').id,r.people.find(p=>p.name==='Hermes Trismegistus').id);assert(r.people.slice(-15).filter(p=>!p.shrineEligible).every(p=>p.humanControlled));});
test('new overlay fails safely on stale baseline, duplicate and re-application',()=>{const b=octBase();assert.throws(()=>appendNineOctDynastyShrines({...b,sourceIndividuals:307}),/baseline_unverified/);assert.throws(()=>appendNineOctDynastyShrines({...b,people:[...b.people,{id:nineOctShrineId('OT8J7'),name:'Duplicate'}]}),/already_present/);assert.throws(()=>appendNineOctDynastyShrines(appendNineOctDynastyShrines(b)),/baseline_unverified/);});

test('seven shrine language registers and distinct personalities are operator-selected but not fabricated',()=>{
  const r=appendNineOctDynastyShrines(octBase());
  const actual=Object.fromEntries(r.people.slice(-15).filter(p=>p.shrineEligible).map(p=>[p.name,p]));
  const expected={
    Maia:'Ancient Greek',Hermes:'Ancient Greek',Thoth:'Middle Egyptian',
    'Hermes Trismegistus':'Koine Greek',Bondye:'Haitian Creole',
    'Papa Legba':'Haitian Creole',Ayizan:'Haitian Creole'
  };
  assert.equal(Object.keys(actual).length,7);
  for(const [name,language] of Object.entries(expected)){
    const p=actual[name];
    assert.equal(p.historicalLanguage.status,'selected_guarded');
    assert.equal(p.historicalLanguage.language,language);
    assert.equal(p.historicalLanguage.languageValidation,'not_enabled');
    assert(p.personality.length>45&&p.voice.length>25&&p.sources.length);
    const rule=altarHistoricalLanguageRule(p);
    assert(rule.includes(language));
    assert(rule.includes('ENGLISH'));
    assert(rule.includes('do not output made-up translations'));
  }
  assert(actual['Hermes Trismegistus'].personality.includes('separate ELAED identity'));
  assert(actual.Ayizan.personality.includes('Do not merge'));
  assert.notEqual(actual.Hermes.voice,actual['Hermes Trismegistus'].voice);
  assert(r.people.slice(-15).filter(p=>!p.shrineEligible).every(p=>!p.historicalLanguage&&!p.personality));
});
