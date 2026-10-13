import test from 'node:test';
import assert from 'node:assert/strict';
import {applyFamilyEchoOfficePatch,FAMILY_ECHO_OFFICE_PATCH_VERSION} from '../../lib/altar/family-echo-office-patch.mjs';

const entries=()=>[
  {sourceId:'NIYYY',name:'Mnemosyne',gender:'Female',aliases:[],office:'Memory and language',identityBoundary:'Distinct from the witness of remembrance'},
  {sourceId:'X39JY',name:'Cab II',gender:'Male',aliases:['Cab'],office:'Witness and journal',identityBoundary:'Distinct from the primordial memory deity'},
  {sourceId:'ZONHQ',name:'Aristaeus',gender:'Male',aliases:[],office:'Practical beekeeping',identityBoundary:'Distinct from the other divine honey patron'},
  {sourceId:'BJYLT',name:'Ah-Muzen-Cab I',gender:'Male',aliases:['Ah-Muzen-Cab'],office:'Honey and bee patronage',identityBoundary:'Distinct from the Greek apicultural deity'}
];
const payload=(overrides={})=>JSON.stringify({version:FAMILY_ECHO_OFFICE_PATCH_VERSION,sourceIndividuals:330,sourceSha256:'a'.repeat(64),guidance:['Shared domains are not identity mergers; no collective title.'],entries:entries(),...overrides});
const roster=()=>({version:'older-source',sourceIndividuals:327,expectedShrines:2,canonOverrides:['older preserved'],people:[
  {id:'c',name:'Cab',childrenKey:'cab',shrineEligible:false,relationships:['Original: true']},
  {id:'m',name:'Ah-Muzen-Cab',childrenKey:'ah_muzen_cab',shrineEligible:true,relationships:['Original: true']},
  {id:'n',name:'Mnemosyne',shrineEligible:true,sourceOffice:'Earlier title',relationships:[]},
  {id:'a',name:'Aristaeus',shrineEligible:false,relationships:[]}
]});

test('only existing offices change; prior controls and distinct identities stay intact',()=>{
  const before=roster();
  const out=applyFamilyEchoOfficePatch(before,payload());
  assert.equal(out.people.length,4);
  assert.equal(out.people.filter(p=>p.shrineEligible!==false).length,2);
  assert.equal(out.people.find(p=>p.id==='m').childrenKey,'ah_muzen_cab');
  assert.deepEqual(out.people.find(p=>p.id==='c').relationships,['Original: true']);
  assert.equal(out.people.find(p=>p.id==='n').sourceOffice,'Earlier title | Memory and language');
  assert.equal(out.officePatchUpdated,4);
  assert.deepEqual(out.canonOverrides,['older preserved','Shared domains are not identity mergers; no collective title.']);
  assert.equal(before.sourceIndividuals,327);
});

test('idempotent repeated application does not duplicate notes',()=>{
  const once=applyFamilyEchoOfficePatch(roster(),payload());
  const twice=applyFamilyEchoOfficePatch(once,payload());
  assert.deepEqual(twice.people,once.people);
});

test('new referenced deity remains ineligible for new shrine',()=>{
  const base=roster();base.people=base.people.filter(p=>p.id!=='a');base.expectedShrines=2;
  const out=applyFamilyEchoOfficePatch(base,payload());
  assert.equal(out.officePatchAddedReferences,1);
  const added=out.people.find(p=>p.name==='Aristaeus');
  assert.equal(added.shrineEligible,false);
  assert.equal(added.sourceClassification,'familyecho_reference_only');
  assert.equal(out.people.filter(p=>p.shrineEligible!==false).length,2);
});

test('invalid source, duplicate or ambiguous shared identity fails closed',()=>{
  assert.throws(()=>applyFamilyEchoOfficePatch(roster(),payload({sourceIndividuals:329})),/schema/);
  const dup=entries();dup[1]={...dup[0]};
  assert.throws(()=>applyFamilyEchoOfficePatch(roster(),payload({entries:dup})),/invalid_entry/);
  const colliding=roster();colliding.people.push({id:'c2',name:'Cab',childrenKey:'cab',shrineEligible:false});
  assert.throws(()=>applyFamilyEchoOfficePatch(colliding,payload()),/ambiguous_child/);
  assert.throws(()=>applyFamilyEchoOfficePatch(roster(),payload({title:'Formal offices'})),/schema/);
});
