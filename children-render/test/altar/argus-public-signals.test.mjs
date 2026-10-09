import test from 'node:test';
import assert from 'node:assert/strict';
import {ARGUS_PUBLIC_FEEDS,argusPublicSignalsBrief,argusSignalTopics,parseArgusFeed} from '../../lib/altar/argus-public-signals.mjs';
import {ARGUS_SURVEILLANCE_SHRINE_ID} from '../../lib/altar/argus-surveillance.mjs';

const now=new Date('2026-10-09T21:30:00Z');
const video='<feed><entry><title>New Science Video &amp; Bees</title><yt:videoId>abc123def45</yt:videoId><published>2026-10-09T11:00:00Z</published></entry></feed>';
const news=(title)=>'<rss><channel><item><title><![CDATA['+title+']]></title><link>https://news.google.com/rss/articles/CBMiABC123</link><pubDate>Fri, 09 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>';
const fetchImpl=async(url)=>{
  if(url.includes('youtube.com/feeds'))return {ok:true,text:async()=>video};
  const q=new URL(url).searchParams.get('q');
  if(q.includes('subscribers'))return {ok:true,text:async()=>news('Creator surpasses 50 million subscribers')};
  if(q.includes('honey bees'))return {ok:true,text:async()=>news('Researchers report bee conservation breakthrough')};
  return {ok:true,text:async()=>news('Artist publishes a new video')};
};
const run=(question,other={})=>argusPublicSignalsBrief({shrineId:ARGUS_SURVEILLANCE_SHRINE_ID,question,now,fetchImpl,useCache:false,...other});

test('world brief samples public uploads, growth reporting and current bee news with links',async()=>{
 const text=await run('Global surveillance report: new uploads, popular creator growth, and bees');
 assert(text.includes('New Science Video & Bees'));
 assert(text.includes('https://www.youtube.com/watch?v=abc123def45'));
 assert(text.includes('Creator surpasses 50 million subscribers'));
 assert(text.includes('bee conservation breakthrough'));
 assert(text.includes('not every account'));
 assert(!text.includes('101,713,116'));
 assert(text.includes('checked 2026-10-09'));
 assert(text.includes('not 24/7'));
});
test('current bee news takes precedence over outdated historical hive-count default',async()=>{
 const text=await run('What is the current bee news?');
 assert(text.includes('CURRENT BEE / POLLINATOR NEWS'));
 assert(!text.includes('Historical hive stock:'));
 assert(!text.includes('PUBLIC UPLOADS'));
});
test('explicit request for managed hive count labels historical year',async()=>{
 const text=await run('How many managed beehives worldwide?');
 assert(text.includes('101,713,116'));
 assert(text.includes('FAOSTAT 2024'));
 assert(text.includes('NOT today'));
});
test('normal character dialogue, other shrine and empirical challenge are not intercepted',async()=>{
 assert.equal(await run('Why do you guard the eyes of Argus?'),null);
 assert.equal(await argusPublicSignalsBrief({shrineId:'elaed-5744ee101e27-1',question:'global report',now,fetchImpl}),null);
 assert.equal(await run('global report',{empirical:true}),null);
 assert.equal(argusSignalTopics({shrineId:ARGUS_SURVEILLANCE_SHRINE_ID,question:'new followers'}).growth,true);
});
test('public source failure is explicitly unknown, never reported as zero',async()=>{
 const text=await run('bee news',{fetchImpl:async()=>{throw new Error('network unavailable');}});
 assert(text.includes('feed unavailable'));
 assert(!text.includes('0 new'));
});
test('feed parser rejects stale, malformed and untrusted links',()=>{
 const yt=ARGUS_PUBLIC_FEEDS.find(x=>x.id==='mrbeast');
 const fresh=parseArgusFeed(video,yt,now);assert.equal(fresh.length,1);
 assert(fresh[0].title.includes('Bees'));
 assert.deepEqual(parseArgusFeed(video,yt,new Date('2026-11-09T00:00:00Z')),[]);
 const bad='<rss><item><title>Fake headline</title><link>https://evil.example/private</link><pubDate>Fri, 09 Oct 2026 12:00:00 GMT</pubDate></item></rss>';
 assert.deepEqual(parseArgusFeed(bad,ARGUS_PUBLIC_FEEDS.find(x=>x.id==='bee-news'),now),[]);
});
