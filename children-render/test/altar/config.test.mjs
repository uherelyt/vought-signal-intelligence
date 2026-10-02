import test from 'node:test';
import assert from 'node:assert/strict';
import {altarConfig,startAltar,altarStatus} from '../../lib/altar/worker.mjs';
test('missing altar token does not borrow the Children token',async()=>{
 const env={ALTAR_ENABLED:'true',CHILDREN_DISCORD_BOT_TOKEN:'children-token',CHILDREN_DISCORD_APPLICATION_ID:'1555000000000000001'};
 assert.equal(altarConfig(env).reason,'altar_application_token_required');await startAltar(env);assert.equal(altarStatus.state,'altar_application_token_required');
});
test('reused Children application ID or bot token is rejected',()=>{
 const env={ALTAR_ENABLED:'true',ALTAR_DISCORD_BOT_TOKEN:'same',CHILDREN_DISCORD_BOT_TOKEN:'same',ALTAR_DISCORD_APPLICATION_ID:'1555000000000000002',CHILDREN_DISCORD_APPLICATION_ID:'1555000000000000001'};
 assert.equal(altarConfig(env).reason,'separate_application_required');env.ALTAR_DISCORD_BOT_TOKEN='new';env.ALTAR_DISCORD_APPLICATION_ID=env.CHILDREN_DISCORD_APPLICATION_ID;assert.equal(altarConfig(env).reason,'separate_application_required');
});
