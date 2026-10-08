import test from 'node:test';
import assert from 'node:assert/strict';
import {parseDelphicBilingual,acceptsDelphicReview,generateValidatedDelphicGreekReply,requiredDelphicAnchors,validateDelphicAnchorFidelity,DELPHIC_GREEK_LANGUAGE_VERSION} from '../../lib/altar/delphic-greek.mjs';
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


test('Phemonoe persona is injected into the existing Pythia generator, without replacing its validated bilingual format',async()=>{
  let captured='';
  // First mocked call is the Greek draft, second is the philological review.
  let n=0;
  const replies=[answer,approval];
  const mockFetch=async(url,options)=>{if(n++===0)captured=JSON.parse(options.body).contents[0].parts[0].text;return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:replies[n-1]}]}}]})};};
  const result=await generateValidatedDelphicGreekReply({apiKey:'test',model:'mock',question:'What should I see?',fetchImpl:mockFetch,logger:{warn(){}}});
  assert.equal(result,greek+'\n'+english);
  assert.match(captured,/Phemonoe/);
  assert.match(captured,/Delphic Bee/);
  assert.match(captured,/independent priestly counterpart/);
});

test('foreign deity names use descriptive Ancient Greek instead of fabricated Hellenizations and QA remains required',async()=>{
  const rejection=JSON.stringify({valid:false,ancientGreek:false,translationFaithful:false,grammarConfidence:'low',issues:['Fabricated Greek rendering of Ah-Muzen-Cab']});
  const meliGreek='Μέλι φῶς φέρει καὶ τὴν ὁδὸν δείκνυσιν.';
  const meliEnglish='Meli brings light and shows the path.';
  const meliAnswer='ANCIENT GREEK:\n'+meliGreek+'\nENGLISH:\n'+meliEnglish;
  const generated=[meliAnswer,rejection,meliAnswer,approval];
  const requests=[];
  const fetchImpl=async(_url,options)=>{
    requests.push(JSON.parse(options.body).contents[0].parts[0].text);
    return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:generated[requests.length-1]}]}}]})};
  };
  const response=await generateValidatedDelphicGreekReply({
    apiKey:'test',model:'mock',question:'What does Ah-Muzen-Cab foresee?',
    fetchImpl,logger:{warn(){}}
  });
  assert.equal(response,meliGreek+'\n'+meliEnglish);
  assert.equal(requests.length,4);
  assert.match(requests[0],/NEVER coin, Hellenize, transliterate, or inflect/);
  assert.match(requests[0],/For Ah-Muzen-Cab, use Μέλι \(Meli\)/);
  assert.match(requests[0],/The English translation should render the name as Meli/);
  assert.match(requests[0],/MODERN fictional syncretic epithet/);
  assert.match(requests[1],/invented Hellenizations of modern\/non-Greek names/);
  assert.match(requests[1],/Special canon glossary: Μέλι/);
  assert.match(requests[1],/faithful English translation is Meli/);
  assert.match(requests[2],/Fabricated Greek rendering of Ah-Muzen-Cab/);
});


const anchoredGreek='Χάος καὶ Νὺξ τὴν ὁδὸν κρύπτουσιν, Μέλι δὲ φῶς φέρει.';
const anchoredEnglish='Khaos and Nyx conceal the path, but Meli brings light.';
const anchoredAnswer='ANCIENT GREEK:\n'+anchoredGreek+'\nENGLISH:\n'+anchoredEnglish;
const nightlyPetition='for tonight let us address khaos & nyx as my primary greek devotional anchors with a brief acknowledgement of meli as my maya anchor';

test('Khaos Nyx and Meli are explicit anchors only when invoked',()=>{
  assert.deepEqual(requiredDelphicAnchors(nightlyPetition),{khaos:true,nyx:true,meli:true});
  assert.deepEqual(requiredDelphicAnchors('From ordinary chaos and night, find wisdom.'),{khaos:false,nyx:false,meli:false});
  assert.deepEqual(requiredDelphicAnchors('Ah-Muzen-Cab is my Maya anchor.'),{khaos:false,nyx:false,meli:true});
});

test('Pythia rejects declension of honey translated as the proper name Meli',()=>{
  const earlierGreek='ἐξ ἀχλύος καὶ χάους φῶς ἀνατέλλει σοφίας, μέλιτος δὲ δρόσος εὐφραίνει καρδίαν.';
  const earlierEnglish='From mist and void the light of wisdom rises, and the dew of Meli gladdens the heart.';
  assert.throws(()=>validateDelphicAnchorFidelity({greek:earlierGreek,english:earlierEnglish},nightlyPetition),/delphic_meli_name_fidelity_invalid/);
  assert.throws(()=>validateDelphicAnchorFidelity({greek:'Μέλι φῶς φέρει.',english:'Honey brings light.'},'Meli'),/delphic_meli_name_fidelity_invalid/);
});

test('Pythia cannot omit Khaos or Nyx when the petition addresses them',()=>{
  assert.throws(()=>validateDelphicAnchorFidelity({greek:'Νὺξ καὶ Μέλι φῶς φέρουσιν.',english:'Nyx and Meli bring light.'},nightlyPetition),/delphic_khaos_anchor_fidelity_invalid/);
  assert.throws(()=>validateDelphicAnchorFidelity({greek:'Χάος καὶ Μέλι φῶς φέρουσιν.',english:'Khaos and Meli bring light.'},nightlyPetition),/delphic_nyx_anchor_fidelity_invalid/);
  assert.throws(()=>validateDelphicAnchorFidelity({greek:anchoredGreek,english:'Khaos and the night conceal the path, but Meli brings light.'},nightlyPetition),/delphic_nyx_anchor_fidelity_invalid/);
  assert.equal(validateDelphicAnchorFidelity({greek:anchoredGreek,english:anchoredEnglish},nightlyPetition),true);
});

test('anchored consultations retry on fidelity mismatch before philological QA and publish after both pass',async()=>{
  const previousGreek='ἐξ ἀχλύος καὶ χάους φῶς ἀνατέλλει σοφίας, μέλιτος δὲ δρόσος εὐφραίνει καρδίαν.';
  const previous='ANCIENT GREEK:\n'+previousGreek+'\nENGLISH:\nFrom mist and void the light of wisdom rises, and the dew of Meli gladdens the heart.';
  const responses=[previous,anchoredAnswer,approval];
  const prompts=[];
  const mock=async(_url,options)=>{
    prompts.push(JSON.parse(options.body).contents[0].parts[0].text);
    return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:responses[prompts.length-1]}]}}]})};
  };
  const result=await generateValidatedDelphicGreekReply({apiKey:'test',model:'mock',question:nightlyPetition,fetchImpl:mock,logger:{warn(){}}});
  assert.equal(result,anchoredGreek+'\n'+anchoredEnglish);
  assert.equal(prompts.length,3);
  assert.match(prompts[0],/REQUIRED NAMES FOR THIS PETITION: Χάος \/ Khaos, Νύξ \/ Nyx, Μέλι \/ Meli/);
  assert.match(prompts[1],/delphic_meli_name_fidelity_invalid/);
  assert.match(prompts[2],/Petition explicitly requires these anchor names in BOTH sections/);
});

test('anchored consultations fail closed after repeated omission despite mock QA approval',async()=>{
  const missingNyx='ANCIENT GREEK:\nΧάος καὶ Μέλι φῶς φέρουσιν.\nENGLISH:\nKhaos and Meli bring light.';
  const q=responder([missingNyx,approval]);
  await assert.rejects(generateValidatedDelphicGreekReply({apiKey:'test',model:'mock',question:nightlyPetition,fetchImpl:q.fetchImpl,logger:{warn(){}},maxAttempts:1}),/delphic_greek_validation_failed/);
  assert.equal(q.calls,1);
});
