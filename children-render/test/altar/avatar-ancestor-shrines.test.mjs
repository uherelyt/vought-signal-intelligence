import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyAvatarAncestorShrines,AVATAR_ANCESTOR_ROLES} from '../../lib/altar/avatar-ancestor-shrines.mjs';

const fixture=()=>{
 const ids=Object.keys(AVATAR_ANCESTOR_ROLES);
 const figures=ids.map((dynastySourceId,i)=>({
  id:'elaed-'+String(i).padStart(12,'0')+'-1',
  dynastySourceId,name:['Korra','Aang','Roku','Kyoshi','Kuruk','Yangchen','Szeto','Wan'][i],
  relationships:[],shrineEligible:false,ancestor:false
 }));
 const relatives=[
  {id:'relative',name:'Katara',dynastySourceId:'S2LUL',relationships:[],shrineEligible:false},
  {id:'source',name:'Raava',dynastySourceId:'D8YVM',relationships:[],shrineEligible:false},
  {id:'group',name:'Generations of Avatars Lost To Time',dynastySourceId:'YST7D',relationships:[],shrineEligible:false},
  {id:'world',name:'Erelyt-World',dynastySourceId:'IU67S',relationships:[],shrineEligible:false},
 ];
 return {people:[...figures,...relatives],sourceIndividuals:292,sourceFamilies:182,
  expectedShrines:148,requestedAncestorCount:11,canonOverrides:['Prior policy']};
};
test('eight named Avatars qualify for individual Ancestor-tagged shrines, separate from strict genealogy',()=>{
 const roster=classifyAvatarAncestorShrines(fixture());
 assert.equal(roster.avatarAncestorShrines,8);
 assert.equal(roster.expectedShrines,156);
 assert.equal(roster.requestedAncestorCount,11);
 assert.equal(roster.people.filter(p=>p.ancestorShrine===true).length,8);
 assert.equal(roster.people.filter(p=>p.shrineEligible===true).length,8);
 assert(roster.people.filter(p=>p.ancestorShrine).every(p=>p.lineageClass==='avatar_ancestor'&&p.ancestor===false));
 const korra=roster.people.find(p=>p.name==='Korra');
 assert.equal(korra.avatarLineageRole,'godparent_source');
 assert(korra.relationships.some(x=>x.includes('Godchild')));
 assert(roster.people.filter(p=>p.avatarLineageRole==='past_incarnation_source').length===7);
 for(const name of ['Katara','Raava','Generations of Avatars Lost To Time','Erelyt-World'])
  assert.equal(roster.people.find(p=>p.name===name).shrineEligible,false);
});
test('missing named Avatar records fail closed; an unconfigured base roster is unchanged',()=>{
 const f=fixture();assert.equal(classifyAvatarAncestorShrines({...f,sourceIndividuals:null}).people.length,f.people.length);
 f.people=f.people.slice(1);
 assert.throws(()=>classifyAvatarAncestorShrines(f),/avatar_ancestor_roster_incomplete/);
});
