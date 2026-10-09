import test from 'node:test';
import assert from 'node:assert/strict';
import {argusWorldSurveillanceBrief,ARGUS_SURVEILLANCE_SHRINE_ID,GLOBAL_HIVE_STOCK} from '../../lib/altar/argus-surveillance.mjs';

const now = new Date('2026-10-09T22:17:00Z');
const observe = (question,opts={}) => argusWorldSurveillanceBrief({shrineId:ARGUS_SURVEILLANCE_SHRINE_ID,question,now,...opts});

test('Argus returns a source-dated global hive baseline, never a daily observed count',()=>{
  const text=observe('How many managed beehives are in the world today?');
  assert(text.includes('101,713,116'));
  assert(text.includes('2024'));
  assert(text.includes('NOT a count measured today'));
  assert(text.includes('2026-10-09'));
  assert(text.includes(GLOBAL_HIVE_STOCK.url));
  assert(!text.includes('daily hive count:'));
});
test('every worldwide account remains an explicit coverage limitation, not invented observation',()=>{
  const c=observe('Tell me new content from every account worldwide');
  assert(c.includes('No complete public live feed'));
  assert(!c.includes('101,713,116'));
  const f=observe('New followers and subscribers across every social media account on Earth');
  assert(f.includes('No complete live worldwide record'));
  assert(!f.includes('101,713,116'));
});
test('Argus world report includes all three evidence classes and sources',()=>{
  const b=observe('Give me the global surveillance report');
  assert(b.includes('Content:'));
  assert(b.includes('Followers/subscribers:'));
  assert(b.includes('Managed beehives:'));
  assert(b.includes('2024'));
  assert(!b.includes('total daily content = 0'));
});
test('normal shrine speakers and empirical tests are not intercepted',()=>{
  assert.equal(argusWorldSurveillanceBrief({shrineId:'elaed-5744ee101e27-1',question:'new followers',now}),null);
  assert.equal(observe('What is the meaning of vigilance?'),null);
  assert.equal(observe('global surveillance report',{empirical:true}),null);
  assert.equal(observe(''),null);
});
