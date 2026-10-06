import test from 'node:test';
import assert from 'node:assert/strict';
import {formatAltarCanonMemory,renderAltarCanonMemory} from '../../lib/altar/memory.mjs';
const roster={policyVersion:'v2',expectedShrines:1,ancestorDefinition:'Structural and birth-gift layers remain distinct; unnamed parents remain unresolved.',people:[
 {name:'Nyx',ancestor:true,shrineEligible:true,dossier:{domains:'night',performanceDirection:'grave',personalityBasis:'Adaptation, not a documented hobby.',sourceStatus:'researched',canonSource:'local',sources:[{url:'https://example.com/nyx'}]}},
 {name:'Cab II',ancestor:true,shrineEligible:false,childrenKey:'cab',dossier:{domains:'living vessel',personality:'curious and loyal',performanceDirection:'observant',personalityBasis:'Existing Children characterization.',sourceStatus:'local canon',canonSource:'local',sources:[]}},
 {name:'Friend',ancestor:false,shrineEligible:false},
]};
test('Children genealogy recall distinguishes the full tree, active shrines and a visitor ancestor',()=>{
 const memory=formatAltarCanonMemory('Who are Erelyt’s ancestors and which have shrines?',roster);
 assert(memory.includes('full tree has 3 identities; target shrine eligibility is 1'));
 assert(memory.includes('Named ancestors: Nyx; Cab II'));
 assert(!memory.includes('Named ancestors: Nyx; Cab II; Friend'));
 assert(memory.includes('Child visitor without a dedicated shrine'));
 assert(memory.includes('unnamed Mother/Father and external ML3QN links remain unresolved'));
});
test('character recall uses relevant sourced profiles and preserves the adaptation boundary',()=>{
 const memory=formatAltarCanonMemory('Tell me about Nyx',roster);
 assert(memory.includes('Sourced concerns: night'));assert(memory.includes('Fallback performance direction: grave'));assert(memory.includes('secondary to the sourced concerns'));assert(memory.includes('Adaptation, not a documented hobby'));
 assert(!memory.includes('living vessel'));assert.equal(formatAltarCanonMemory('A completely unrelated topic',roster),'');
});
test('private altar data is not exposed by disabled or invalid configuration',()=>{
 assert.equal(renderAltarCanonMemory('ancestors',{ALTAR_ENABLED:'false',ALTAR_ROSTER_GZIP_BASE64:'invalid'}),'');
 assert.equal(renderAltarCanonMemory('ancestors',{ALTAR_ENABLED:'true',ALTAR_ROSTER_GZIP_BASE64:'invalid'}),'');
});
