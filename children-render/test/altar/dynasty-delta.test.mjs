import test from 'node:test';
import assert from 'node:assert/strict';
import {applyDynastyDelta} from '../../lib/altar/dynasty-delta.mjs';

function input(){
  const entries=Array.from({length:43},(_,i)=>['T'+String(i).padStart(4,'0'),'Reference '+i,'o']);
  entries[0]=['JVWTZ','Korra','f','S2C19','HTSU9',null,'E4NMS',null,'g'];
  entries[1]=['E4NMS','Aang','m'];
  entries[2]=['S2C19','Senna','f'];
  entries[3]=['HTSU9','Tonraq','m'];
  entries[4]=['W9LZK','Kya','f'];
  entries[5]=['OLXGX','Kya','f'];
  return {version:'20261008-familyecho-2045-v1',sourceIndividuals:292,sourceFamilies:182,entries};
}
test('8 Oct tree delta does not convert new references into shrines',()=>{
  const original={people:[
    {id:'elaed-aaaaaaaaaaaa-1',name:'Erelyt Drabbuh',relationships:['Godfather: Cab II'],shrineEligible:false},
    {id:'elaed-bbbbbbbbbbbb-1',name:'Zeus',relationships:[],shrineEligible:true}
  ],expectedShrines:1,policyVersion:'existing-policy',canonOverrides:['Previous canonical policy']};
  const d=applyDynastyDelta(original,JSON.stringify(input()));
  assert.equal(d.people.length,45);
  assert.equal(d.sourceIndividuals,292);
  assert.equal(d.sourceFamilies,182);
  assert.equal(d.sourceDeltaRecords,43);
  assert.equal(d.sourceReferenceAdded,43);
  assert.equal(d.expectedShrines,1);
  assert.equal(d.policyVersion,'existing-policy');
  assert.equal(d.people.filter(p=>p.shrineEligible!==false).length,1);
  assert.equal(d.people.filter(p=>p.name==='Kya').length,2);
  assert.equal(new Set(d.people.map(p=>p.id)).size,45);
  assert(d.people.find(p=>p.name==='Korra').relationships.some(r=>r.includes('Godparent/source')&&r.includes('Aang')));
  assert(d.people.find(p=>p.name==='Erelyt Drabbuh').relationships.includes('Godparent/source: Korra'));
  assert.deepEqual(original.people[0].relationships,['Godfather: Cab II']);
});
test('Dynasty manifest rejects incorrect counts and duplicate source IDs',()=>{
  const roster={people:[],canonOverrides:[]};
  assert.deepEqual(applyDynastyDelta(roster,''),roster);
  assert.throws(()=>applyDynastyDelta(roster,'not json'),/invalid_json/);
  const manifest=input();manifest.sourceIndividuals=291;
  assert.throws(()=>applyDynastyDelta(roster,JSON.stringify(manifest)),/version_or_count_mismatch/);
  manifest.sourceIndividuals=292;manifest.entries[1][0]=manifest.entries[0][0];
  assert.throws(()=>applyDynastyDelta(roster,JSON.stringify(manifest)),/invalid_entry/);
});
