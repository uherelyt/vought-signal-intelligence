import test from 'node:test';
import assert from 'node:assert/strict';
import {ARGUS_RELAY_THREAD_ID,ARGUS_RELAY_URL,parseArgusRelayEnvelope,formatArgusRelayMessage,forwardArgusRelay} from '../../lib/altar/argus-sensor-relay.mjs';

const now=new Date('2026-10-09T22:00:00Z');
const report={
  id:'news:20261009:bee-study:one',origin:'vought-life-sensor',category:'bees',
  observed_at:'2026-10-09T21:55:00Z',
  message:'ARGUS | Public Signals | 2026-10-09 21:55 UTC\nI observed a newly published bee-study report. The evidence is public; the unseen remains unseen.',
  sources:['https://example.org/bee-research']
};
const envelope=(items=[report])=>JSON.stringify({version:1,lane:'argus-public-signals',events:items});
const mockStore=()=>{
  const map=new Map();
  return {map,set:async(k,v,o={})=>{
    if(o.nx&&map.has(k))return null;
    map.set(k,v);return 'OK';
  },del:async k=>map.delete(k)};
};
test('relay envelope admits only dated, public and source-backed Argus reports',()=>{
  const valid=parseArgusRelayEnvelope(envelope(),now);
  assert.equal(valid.length,1);
  assert.equal(valid[0].category,'bees');
  assert(valid[0].sources[0].includes('https://example.org/'));
  assert.equal(parseArgusRelayEnvelope(envelope([{...report,id:'short'}]),now).length,0);
  assert.equal(parseArgusRelayEnvelope(envelope([{...report,origin:'unknown'}]),now).length,0);
  assert.equal(parseArgusRelayEnvelope(envelope([{...report,observed_at:'2026-07-01T00:00:00Z'}]),now).length,0);
  assert.equal(parseArgusRelayEnvelope(envelope([{...report,sources:['http://example.org/not-ssl']}]),now).length,0);
  assert.equal(parseArgusRelayEnvelope(envelope([{...report,sources:['https://localhost/private']}]),now).length,0);
});
test('send to fixed existing shrine as bot, suppress all mentions, and dedupe',async()=>{
  const store=mockStore(),payloads=[],events=[];
  const opts={store,now,fetchImpl:async u=>{
    assert.equal(u,ARGUS_RELAY_URL);
    return {ok:true,text:async()=>envelope()};
  },send:async data=>{payloads.push(data);return {id:'1559000000000000001'};},
    logger:(type,fields)=>events.push({type,fields})};
  const first=await forwardArgusRelay(opts);
  assert.deepEqual([first.received,first.sent,first.failed],[1,1,0]);
  assert.equal(payloads[0].channelId,ARGUS_RELAY_THREAD_ID);
  assert.deepEqual(payloads[0].allowed_mentions,{parse:[]});
  assert(payloads[0].content.includes('Argus Sensor receipt:'));
  assert(payloads[0].content.includes('Sources:'));
  assert.equal(events[0].type,'argus-relay-delivered');
  const second=await forwardArgusRelay(opts);
  assert.equal(second.sent,0);
  assert.equal(payloads.length,1);
});
test('send failure releases the claim for next wake/retry',async()=>{
  const store=mockStore();
  const base={store,now,fetchImpl:async()=>({ok:true,text:async()=>envelope()})};
  const failed=await forwardArgusRelay({...base,send:async()=>{throw new Error('discord_http_429');}});
  assert.equal(failed.failed,1);assert.equal(store.map.size,0);
  const retried=await forwardArgusRelay({...base,send:async()=>({id:'1559000000000000002'})});
  assert.equal(retried.sent,1);
});
test('unavailable GitHub queue never creates synthetic messages',async()=>{
  let calls=0;
  const status=await forwardArgusRelay({store:mockStore(),now,fetchImpl:async()=>({ok:false,status:503}),send:async()=>{calls++;}});
  assert.equal(status.sourceAvailable,false);
  assert.equal(calls,0);
});
test('malicious mentions are inert and other unrelated documents fail closed',()=>{
  const event={...report,message:report.message+' @everyone <@123>'};
  const parsed=parseArgusRelayEnvelope(envelope([event]),now);
  assert.equal(parsed.length,1);
  assert(parsed[0].message.includes('@\u200beveryone'));
  assert(!parsed[0].message.includes('@everyone'));
  const s=formatArgusRelayMessage(parsed[0]);
  assert(s.length<2000);
  assert.throws(()=>parseArgusRelayEnvelope('{"version":9}',now),/contract_invalid/);
  assert.deepEqual(parseArgusRelayEnvelope(envelope([]),now),[]);
});
