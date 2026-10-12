import assert from 'node:assert/strict';
import test from 'node:test';
import {AltarRuntime,PREFIX,ALTAR_OPEN_LINE_VERSION} from '../../lib/altar/core.mjs';

function harness({openLineEnabled=true,observed=[],banished=false,autonomyEligible=true,now=Date.parse('2026-10-12T21:00:00Z'),replyText='A symbolic greeting.'}={}){
  const values=new Map();
  if(banished)values.set(`${PREFIX}:banished:all`,'1');
  values.set(`${PREFIX}:shrine:fig-1`,'1555308025525440584');
  const events=[],seen=[];
  const store={
    get:async k=>values.get(k)??null,
    set:async(k,v,o={})=>{if(o.nx&&values.has(k))return null;values.set(k,String(v));return 'OK';},
    del:async k=>values.delete(k),
    lrange:async k=>k===`${PREFIX}:observed`?observed:[],
    incr:async k=>{const value=Number(values.get(k)??0)+1;values.set(k,String(value));return value;},
    expire:async()=>true,
  };
  const person={id:'fig-1',name:'Nyx',displayName:'Nyx',autonomyEligible,humanControlled:false,relevanceTerms:['night']};
  const runtime=Object.create(AltarRuntime.prototype);
  Object.assign(runtime,{store,people:new Map([[person.id,person]]),openLineEnabled,now:()=>now,enabled:async()=>true,
    reply:async(p,threadId,input,options)=>{seen.push({p,threadId,input,options});return replyText?{id:'1555308025525440585'}:null;}});
  return {runtime,values,seen,events,store,person,now};
}

test('open lines initiate without a fabricated human petition or observed context',async()=>{
  assert.match(ALTAR_OPEN_LINE_VERSION,/open-line/);
  const h=harness();
  await h.runtime.autonomous();
  assert.equal(h.seen.length,1);
  assert.equal(h.seen[0].options.openLine,true);
  assert.match(h.seen[0].input,/no current human petition/i);
  assert.equal(h.values.get(`${PREFIX}:last-auto`),String(h.now));
  await h.runtime.autonomous();
  assert.equal(h.seen.length,1,'global open-line cooldown holds');
});

test('legacy autonomy still requires observed context',async()=>{
  const h=harness({openLineEnabled:false});
  await h.runtime.autonomous();
  assert.equal(h.seen.length,0);
});

test('banished and individually ineligible figures never initiate',async()=>{
  for(const option of [{banished:true},{autonomyEligible:false}]){
    const h=harness(option);
    await h.runtime.autonomous();
    assert.equal(h.seen.length,0);
  }
});

test('the no-contact sentinel never becomes a Discord message',async()=>{
  const h=harness();
  let posts=0;
  const runtime=h.runtime;
  runtime.roster={people:[]};
  runtime.generate=async()=> 'NO_OPEN_LINE_MESSAGE';
  runtime.deliver=async()=>{posts++;return {id:'unexpected'};};
  const result=await runtime.reply(h.person,'1555308025525440584','No petition.',{openLine:true});
  assert.equal(result,null);
  assert.equal(posts,0);
});
