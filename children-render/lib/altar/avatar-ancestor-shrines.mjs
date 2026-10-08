export const AVATAR_ANCESTOR_ROLES = Object.freeze({
  JVWTZ:'godparent_source',
  E4NMS:'past_incarnation_source',
  ZNYTV:'past_incarnation_source',
  D0UBL:'past_incarnation_source',
  XJFXF:'past_incarnation_source',
  PF0S9:'past_incarnation_source',
  UNCBO:'past_incarnation_source',
  VTU88:'past_incarnation_source',
});
export function classifyAvatarAncestorShrines(roster){
  if(!roster?.sourceIndividuals)return roster;
  const people=roster.people.map(p=>{
    const role=AVATAR_ANCESTOR_ROLES[p.dynastySourceId];
    if(!role)return p;
    const relationship=role==='godparent_source'?
      'Godchild / Avatar source: Erelyt':
      'Past Avatar incarnation/source lineage of Erelyt (fictional, non-biological)';
    return {...p,shrineEligible:true,ancestorShrine:true,
      avatarLineageRole:role,lineageClass:'avatar_ancestor',
      sourceClassification:'avatar_godparent_or_past_incarnation',
      relationships:[...new Set([...(p.relationships||[]),relationship])]};
  });
  const promoted=people.filter(p=>p.ancestorShrine===true&&AVATAR_ANCESTOR_ROLES[p.dynastySourceId]).length;
  if(promoted!==8)throw new Error('avatar_ancestor_roster_incomplete');
  return {...roster,people,avatarAncestorShrines:promoted,
    expectedShrines:roster.expectedShrines===undefined?undefined:roster.expectedShrines+promoted,
    canonOverrides:[...(roster.canonOverrides||[]),
      'Eight named Avatar godparent/past-incarnation figures have individual Ancestor-tagged Altar shrines. This is a distinct avatar-ancestor shrine designation, not the 11 strict genealogical forebears. Korra remains a godparent/source across the alternate-future bridge.',
      'Relatives, Raava, generational placeholders and Minecraft world nodes remain non-shrine source references.']};
}
