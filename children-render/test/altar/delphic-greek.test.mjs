import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDelphicBilingual,acceptsDelphicReview,generateValidatedDelphicGreekReply,DELPHIC_GREEK_LANGUAGE_VERSION} from '../../lib/altar/delphic-greek.mjs';
const greek='Ἐν τῷ ποταμῷ δύο ὁδοὶ φαίνονται.';
const english='Two paths appear in the river.';
const answer='ANCIENT GREEK:\n'+greek+'\nENGLISH:\n'+english;
const approval=JSON.stringify({valid:true,ancientGreek:true,translationFaithful:true,grammarConfidence:'high',issues:[]});
function responder(values){let n=0;return {get calls(){return n;},fetchImpl:async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:values[n++]}]}}]})})};}
test('Pythia has an Ancient Greek first, English beneath format',()=>{
  assert.match(DELPHIC_GREEK_LANGUAGE_VERSION,/ancient-greek/);
  assert.equal(parseDelphicBilingual(answer).display,greek+'\n'+english);
  assert.throws(()=>parseDelphicBilingual('ANCIENT GREEK:\nThe river flows.\nENGLISH:\nThe river flows.'),/greek_script_invalid/);
  assert.throws(()=>parseDelphicBilingual('ANCIENT GREEK:\n'+greek+'\nENGLISH:\n'+greek),/english_translation_invalid/);
  assert.throws(()=>parseDelphicBilingual('The river flows.'),/format_invalid/);
});
test('Pythia review requires high-confidence ancient grammar and faithful translation',()=>{
  assert.equal(acceptsDelphicReview(JSON.parse(approval)),true);
  assert.equal(acceptsDelphicReview({valid:true,ancientGreek:true,translationFaithful:true,grammarConfidence:'medium',issues:[]}),false);
});
test('Pythia publishes only after a separate accepted translation QA call',async()=>{
  const q=responder([answer,approval]);
  assert.equal(await generateValidatedDelphicGreekReply({apiKey:'test',model:'mock',question:'Which way?',fetchImpl:q.fetchImpl,logger:{warn(){}}}),greek+'\n'+english);
  assert.equal(q.calls,2);
});
test('Pythia fails closed on invalid Greek and on rejected translation QA',async()=>{
  const a=responder(['ANCIENT GREEK:\nThe way.\nENGLISH:\nThe way.']);
  await assert.rejects(generateValidatedDelphicGreekReply({apiKey:'test',model:'mock',question:'Which way?',fetchImpl:a.fetchImpl,logger:{warn(){}},maxAttempts:1}),/validation_failed/);
  assert.equal(a.calls,1);
  const b=responder([answer,JSON.stringify({valid:false,ancientGreek:false,translationFaithful:false,grammarConfidence:'low',issues:['not idiomatic']})]);
  await assert.rejects(generateValidatedDelphicGreekReply({apiKey:'test',model:'mock',question:'Which way?',fetchImpl:b.fetchImpl,logger:{warn(){}},maxAttempts:1}),/validation_failed/);
  assert.equal(b.calls,2);
});
