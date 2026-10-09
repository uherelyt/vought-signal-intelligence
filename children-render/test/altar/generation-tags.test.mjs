import test from 'node:test';
import assert from 'node:assert/strict';
import {divineGenerationTags,OLD_GODS_SHRINE_IDS,NEW_GODS_SHRINE_IDS} from '../../lib/altar/generation-tags.mjs';

test('canonical generation allowlists are exact, bounded and intentionally overlapping',()=>{
  assert.equal(OLD_GODS_SHRINE_IDS.size,105);
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
