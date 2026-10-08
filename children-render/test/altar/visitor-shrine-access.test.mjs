import test from 'node:test';
import assert from 'node:assert/strict';
import { AltarRuntime, FORUM_ID, PREFIX, altarCommandAllowed, visitorShrineRoute, incarnateShrineRoute } from '../../lib/altar/core.mjs';

const OPERATOR = '1555070899756081190';
const VISITOR = '1555070899756081191';
const GUILD = '1555070899756081194';
const THREAD = '1555685127013535857';
const FIGURE = { id:'elaed-public-1',name:'Sample Shrine',displayName:'Sample Shrine',shrineEligible:true };

test('public devotional commands are available, but administrative and empirical control remains operator-only',()=>{
  for(const command of ['altar','offer','candle','tarot','rune','oracle']){
    assert.equal(altarCommandAllowed(command,VISITOR,OPERATOR),true,command);
  }
  for(const command of ['banish','resume','verify','verify-result','unknown']){
    assert.equal(altarCommandAllowed(command,VISITOR,OPERATOR),false,command);
    assert.equal(altarCommandAllowed(command,OPERATOR,OPERATOR),true,command);
  }
  assert.equal(altarCommandAllowed('altar',null,OPERATOR),false);
});

test('visitor does not inherit Erelyt identity, divine soul or source-communion privileges',()=>{
  const visitor = visitorShrineRoute({...FIGURE,childrenKey:'ah_muzen_cab'},'marvin');
  assert.equal(visitor.mode,'external_human_petition');
  assert.equal(visitor.petitionerIdentity,'marvin');
  assert.equal(visitor.petitionerOntology,'external_human_visitor');
  assert.equal(visitor.divineSoulSource,null);
  assert.equal(visitor.ahMuzenCabSpeaking,false);
  assert.equal(incarnateShrineRoute(FIGURE,'hello').petitionerIdentity,'Erelyt');
});

test('ordinary external shrine message receives a bounded reply while retaining operator routing',async()=>{
  const state=new Map([[ `${PREFIX}:thread:${THREAD}`, FIGURE.id ]]);
  const events=[], generated=[], sent=[];
  const store={
    get:async key=>state.get(key)??null,
    set:async(key,value,opts={})=>{
      if(opts.nx&&state.has(key))return null;
      state.set(key,value);return 'OK';
    },
    lpush:async()=>1,
    ltrim:async()=>1,
    lrange:async()=>[],
  };
  const runtime=new AltarRuntime({
    store,roster:{people:[FIGURE],visitors:[]},guildId:GUILD,operatorId:OPERATOR,applicationId:'1',
    api:async path=>{
      assert.equal(path,`/channels/${THREAD}`);
      return {id:THREAD,type:11,parent_id:FORUM_ID,guild_id:GUILD};
    },
    record:record=>events.push(record),
    generate:async(_p,_input,context)=>{
      generated.push(context.extra.incarnateRoute);
      return 'A source-grounded response';
    },
  });
  runtime.deliver=async(_p,_thread,message)=>{sent.push(message);return {id:'1'};};
  const marvin={guild_id:GUILD,channel_id:THREAD,id:'1555000000000000001',content:'I seek guidance',author:{id:VISITOR,username:'marvin',bot:false}};
  await runtime.message(marvin);
  assert.equal(generated.length,1);
  assert.equal(generated[0].mode,'external_human_petition');
  assert.equal(generated[0].petitionerIdentity,'marvin');
  assert.equal(sent.length,1);
  assert.equal(events.at(-1).petitionerKind,'visitor');

  await runtime.message({...marvin,id:'1555000000000000002'});
  assert.equal(generated.length,1,'visitor cooldown suppresses repeat generation');

  await runtime.message({...marvin,id:'1555000000000000003',author:{id:OPERATOR,username:'erelyt',bot:false}});
  assert.equal(generated.length,2);
  assert.equal(generated[1].petitionerIdentity,'Erelyt');
  assert.equal(generated[1].mode,'incarnation_to_external_divine');
});
