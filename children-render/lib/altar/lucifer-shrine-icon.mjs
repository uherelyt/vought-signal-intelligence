import { readFileSync } from 'node:fs';

// This is only a square crop of the already approved full-size Lucifer portrait.
// It is used exclusively for Lucifer's existing ELAED shrine messages.
export const LUCIFER_SHRINE_ICON_VERSION='20261008-realistic-lucifer-v1';
export const LUCIFER_SHRINE_ICON_DATA_URI='data:image/jpeg;base64,'+readFileSync(new URL('../../assets/lucifer-morningstar-shrine-icon.jpg',import.meta.url)).toString('base64');

export function applyLuciferShrineIcon(people=[]){
  let applied=0;
  for(const person of people){
    if(person?.name!=='Lucifer Morningstar'||person.shrineEligible===false||person.childrenKey||person.humanControlled)continue;
    person.avatarData=LUCIFER_SHRINE_ICON_DATA_URI;
    person.senderName='Lucifer Morningstar';
    applied++;
  }
  return applied;
}
