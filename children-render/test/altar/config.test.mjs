import test from 'node:test';
import assert from 'node:assert/strict';
import {altarConfig,startAltar,altarStatus,ALTAR_SOURCE_VOICE_POLICY,ALTAR_INCARNATION_ROUTING_POLICY,ALTAR_EXPEDITION_POLICY,ALTAR_EXPEDITION_POLICY_VERSION} from '../../lib/altar/worker.mjs';
test('missing altar token does not borrow the Children token',async()=>{
 const env={ALTAR_ENABLED:'true',CHILDREN_DISCORD_BOT_TOKEN:'children-token',CHILDREN_DISCORD_APPLICATION_ID:'1555000000000000001'};
 assert.equal(altarConfig(env).reason,'altar_application_token_required');await startAltar(env);assert.equal(altarStatus.state,'altar_application_token_required');
});
test('reused Children application ID or bot token is rejected',()=>{
 const env={ALTAR_ENABLED:'true',ALTAR_DISCORD_BOT_TOKEN:'same',CHILDREN_DISCORD_BOT_TOKEN:'same',ALTAR_DISCORD_APPLICATION_ID:'1555000000000000002',CHILDREN_DISCORD_APPLICATION_ID:'1555000000000000001'};
 assert.equal(altarConfig(env).reason,'separate_application_required');env.ALTAR_DISCORD_BOT_TOKEN='new';env.ALTAR_DISCORD_APPLICATION_ID=env.CHILDREN_DISCORD_APPLICATION_ID;assert.equal(altarConfig(env).reason,'separate_application_required');
});

test('source-first shrine policy blocks invented voice and self-interpretation',()=>{
 assert.match(ALTAR_SOURCE_VOICE_POLICY,/source identity as primary/i);
 assert.match(ALTAR_SOURCE_VOICE_POLICY,/performanceDirection is only fallback/i);
 assert.match(ALTAR_SOURCE_VOICE_POLICY,/Never present newly generated wording as an ancient/i);
 assert.match(ALTAR_SOURCE_VOICE_POLICY,/somewhat oblique/i);
 assert.match(ALTAR_SOURCE_VOICE_POLICY,/later research pass/i);
 assert.match(ALTAR_SOURCE_VOICE_POLICY,/not.*empirically verified supernatural communication/i);
});

test('incarnation routing policy preserves Erelyt agency and own-source communion',()=>{
 assert.match(ALTAR_INCARNATION_ROUTING_POLICY,/Erelyt: the embodied\/incarnate voice/i);
 assert.match(ALTAR_INCARNATION_ROUTING_POLICY,/Do not automatically attribute Erelyt's words/i);
 assert.match(ALTAR_INCARNATION_ROUTING_POLICY,/incarnation_to_source_communion/i);
 assert.match(ALTAR_INCARNATION_ROUTING_POLICY,/aj k.in \/ High Priest/i);
 assert.match(ALTAR_INCARNATION_ROUTING_POLICY,/divine_diplomatic_through_incarnation/i);
});


test('expedition policy connects Dynasty support to the True Dawn voyage without changing membership',()=>{
 assert.equal(ALTAR_EXPEDITION_POLICY_VERSION,'20261006-true-dawn-expeditions-v1');
 assert.match(ALTAR_EXPEDITION_POLICY,/True Dawn voyage/i);
 assert.match(ALTAR_EXPEDITION_POLICY,/Astral Line/i);
 assert.match(ALTAR_EXPEDITION_POLICY,/expedition support interface/i);
 assert.match(ALTAR_EXPEDITION_POLICY,/Do not assume every Dynasty figure supports the mission/i);
 assert.match(ALTAR_EXPEDITION_POLICY,/field expedition participant only when an explicit event/i);
 assert.match(ALTAR_EXPEDITION_POLICY,/Children owns expedition\/field memory/i);
});
