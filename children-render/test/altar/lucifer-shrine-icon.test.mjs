import assert from 'node:assert/strict';
import test from 'node:test';
import {LUCIFER_SHRINE_ICON_DATA_URI,applyLuciferShrineIcon} from '../../lib/altar/lucifer-shrine-icon.mjs';

test('Lucifer icon is a real JPEG derived from the approved reference portrait',()=>{
  assert.ok(LUCIFER_SHRINE_ICON_DATA_URI.startsWith('data:image/jpeg;base64,'));
  const bytes=Buffer.from(LUCIFER_SHRINE_ICON_DATA_URI.split(',')[1],'base64');
  assert.equal(bytes[0],0xff);
  assert.equal(bytes[1],0xd8);
  assert.ok(bytes.length>1000);
});

test('only Lucifer receives his own portrait and other shrines retain default avatars',()=>{
  const roster=[{name:'Lucifer Morningstar',shrineEligible:true},{name:'Apollo',shrineEligible:true},{name:'Beelzebub',avatarData:'existing'},{name:'Lucifer Morningstar',shrineEligible:false}];
  assert.equal(applyLuciferShrineIcon(roster),1);
  assert.equal(roster[0].avatarData,LUCIFER_SHRINE_ICON_DATA_URI);
  assert.equal(roster[0].senderName,'Lucifer Morningstar');
  assert.equal(roster[1].avatarData,undefined);
  assert.equal(roster[2].avatarData,'existing');
  assert.equal(roster[3].avatarData,undefined);
});
