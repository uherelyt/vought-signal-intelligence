// Argus Panoptes' on-demand observation contract: globally scoped, evidence constrained.
// An all-account worldwide content/follow event stream is NOT accessible via the Altar.
// Only one verified dated global hive-stock datum is currently available here.
export const ARGUS_SURVEILLANCE_SHRINE_ID = 'elaed-31907610cee4-1';
export const GLOBAL_HIVE_STOCK = Object.freeze({
  hives: 101713116,
  year: 2024,
  granularity: 'annual',
  publicationYear: 2026,
  source: 'FiBL & IFOAM, The World of Organic Agriculture 2026, page 64, footnote 1; citing FAOSTAT 2024',
  url: 'https://www.fibl.org/fileadmin/documents/shop/1861-organic-world-2026.pdf',
});

export function argusWorldSurveillanceBrief({shrineId, question, now = new Date(), empirical = false} = {}) {
  if (shrineId !== ARGUS_SURVEILLANCE_SHRINE_ID || empirical) return null;
  const ask = String(question ?? '').trim().slice(0, 1600);
  if (!ask) return null;
  const isAll = /\b(all|every|worldwide|globally|around the world|across (?:the )?(?:internet|world|platforms)|global)\b/i.test(ask);
  const askContent = /\b(new (?:content|posts?|videos?|releases?|uploads?)|latest (?:content|posts?|videos?|uploads?)|recent (?:content|posts?|uploads?)|content drops?|uploads?|published (?:today|recently)|creator activity)\b/i.test(ask);
  const askAudience = /\b(follower(?:s|ship)?|follow(?:ed|ing)?|subscriber(?:s)?|subscriptions?|new (?:followers?|subscribers?)|audience growth)\b/i.test(ask);
  const askHives = /\b(bee\s*hives?|hives?|colon(?:y|ies)|beekeep(?:er|ers|ing)?|apiar(?:y|ies))\b/i.test(ask);
  const askReport = /\b(?:surveillance|monitoring|world report|worldwide report|global report|all three|three signals|status brief)\b/i.test(ask);
  if (!askContent && !askAudience && !askHives && !askReport) return null;
  // All three means the named global-surveillance contract, not every Altar petition.
  const includeAll = askReport || (isAll && /\b(?:everything|status|overview|brief|report)\b/i.test(ask));
  const sections = [];
  if (askContent || includeAll) {
    sections.push('Content: No complete public live feed of every worldwide account or new post exists here. I cannot verify a universal new-content count or list.');
  }
  if (askAudience || includeAll) {
    sections.push('Followers/subscribers: No complete live worldwide record of individual follows exists here. Private events and platform/API restrictions leave the global total unobservable.');
  }
  if (askHives || includeAll) {
    sections.push(`Managed beehives: ${GLOBAL_HIVE_STOCK.hives.toLocaleString('en-US')} globally, FAOSTAT **${GLOBAL_HIVE_STOCK.year}** stock, cited in FiBL/IFOAM **${GLOBAL_HIVE_STOCK.publicationYear}**. This is the latest *verified in this service* annual baseline, NOT a count measured today. Source: ${GLOBAL_HIVE_STOCK.url}`);
  }
  // Do not assert an unobserved live provider signal or provide a false report of zero.
  return `Argus | World surveillance brief | ${now.toISOString().slice(0,10)} UTC\n${sections.join('\n')}`;
}
