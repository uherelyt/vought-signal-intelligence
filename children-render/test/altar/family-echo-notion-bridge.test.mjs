import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyElaedNotionBridge,ELAED_NOTION_BRIDGE_VERSION,ELAED_NOTION_SOURCE_SHA256} from '../../lib/altar/family-echo-notion-bridge.mjs';
const HUB='https://app.notion.com/p/3f90077087dc81198f98d3835f7c8c65';
const BASE={people:[
{id:'p1',name:'Asclepius',shrineEligible:true,childrenKey:'asclepius',relationships:['Friend: Erelyt'],ancestor:false},
{id:'p2',name:'Erelyt Drabbuh',shrineEligible:false,humanControlled:true,relationships:[]}],visitors:[],policyVersion:'untouched'};
const manifest=entries=>JSON.stringify({
version:ELAED_NOTION_BRIDGE_VERSION,sourceSha256:ELAED_NOTION_SOURCE_SHA256,
sourceIndividuals:333,sourceBioNotes:77,sourceFriendEdges:143,hubUrl:HUB,entries
});
test('absent private env leaves roster untouched',()=>assert.equal(applyElaedNotionBridge(BASE,''),BASE));
test('links source to shrine without changing authorization or membership',()=>{
const result=applyElaedNotionBridge(BASE,manifest([
{sourceName:'Asclepius',kind:'divine',notionUrl:'https://app.notion.com/p/3f90077087dc8185affee88623d9f38c',summary:'Healing and sacred serpents.',friends:['Erelyt Drabbuh']},
{sourceName:'Unmatched archive character',kind:'friend'}]));
assert.equal(result.notionBridgeMatched,1);
assert.equal(result.notionBridgeUnmatched,1);
assert.equal(result.people.length,2);
assert.equal(result.people[0].shrineEligible,true);
assert.equal(result.people[0].childrenKey,'asclepius');
assert.equal(result.people[1].notionBridge,undefined);
assert.deepEqual(BASE.people[0].relationships,['Friend: Erelyt']);
assert.equal(result.policyVersion,'untouched');
});
test('rejects stale source, non-Notion urls and privilege injection',()=>{
assert.throws(()=>applyElaedNotionBridge(BASE,JSON.stringify({...JSON.parse(manifest([])),sourceIndividuals:332})),/source_or_schema_mismatch/);
assert.throws(()=>applyElaedNotionBridge(BASE,manifest([{sourceName:'Asclepius',kind:'divine',notionUrl:'https://other.example.com'}])),/invalid_entry/);
assert.throws(()=>applyElaedNotionBridge(BASE,manifest([{sourceName:'Asclepius',kind:'divine',shrineEligible:true}])),/invalid_entry/);
assert.throws(()=>applyElaedNotionBridge(BASE,manifest([{sourceName:'Asclepius',kind:'divine',birthDate:'private'}])),/invalid_entry/);
});
test('rejects duplicate source entries',()=>assert.throws(()=>applyElaedNotionBridge(BASE,manifest([{sourceName:'Asclepius',kind:'divine'},{sourceName:'Asclepius',kind:'divine'}])),/invalid_entry/));
test('uses explicit runtimeName and no fuzzy identity merging',()=>{
const r=applyElaedNotionBridge(BASE,manifest([{sourceName:'Asclepius source record',runtimeName:'Asclepius',kind:'divine'}]));
assert.equal(r.people[0].notionBridge.sourceName,'Asclepius source record');
});
