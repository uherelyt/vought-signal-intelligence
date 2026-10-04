import {
  CHILDREN_NOTION_MEMORY_SECTIONS,
  CHILDREN_NOTION_MEMORY_VERSION,
  type ChildrenNotionMemorySection,
} from "./children-notion-memory.ts";
import { renderAltarCanonMemory } from "./altar/memory.mjs";

export { CHILDREN_NOTION_MEMORY_VERSION };

type StoredChildrenActivity = {
  eventId?: string;
  timestamp?: string;
  speakers?: string[];
  location?: string;
  plane?: string;
  transcript?: string;
  durableCanon?: boolean;
};

const STOP = new Set([
  "about","after","again","also","and","are","because","been","before","being","but","can","could",
  "does","for","from","have","here","into","just","like","more","our","should","that","the","their",
  "them","then","there","these","they","this","through","what","when","where","which","while","who",
  "why","with","would","your","you","were","was","will","everyone","children","bart","erelyt"
]);

function words(value: string) {
  return [...new Set(
    value.toLowerCase()
      .replace(/[^a-z0-9' -]+/g, " ")
      .split(/\s+/)
      .map((word) => word.replace(/^'+|'+$/g, ""))
      .filter((word) => word.length >= 3 && !STOP.has(word))
  )];
}

function expandedQuery(value: string) {
  const base = words(value);
  const extra: string[] = [];
  const text = value.toLowerCase();
  if (/villain|enemy|adversar|fought|fight/.test(text)) extra.push("villain","adversary","fought","fight","enemy");
  if (/vought|corporat|company/.test(text)) extra.push("vought","corporate","ownership","management");
  if (/memory|remember|chronolog|birth/.test(text)) extra.push("memory","birth","chronology","fragmented");
  if (/past|history|before|previous|adventure|mission/.test(text)) extra.push("past","history","adventure","mission","encounter");
  if (/mirror|house/.test(text)) extra.push("mirror","house","mental","threshold");
  if (/astral|dream/.test(text)) extra.push("astral","dream","plane","sea");
  return [...new Set([...base, ...extra])];
}

function sectionScore(section: ChildrenNotionMemorySection, terms: string[]) {
  if (!terms.length) return 0;
  const heading = section.heading.toLowerCase();
  const source = section.sourceTitle.toLowerCase();
  const body = section.text.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (heading.includes(term)) score += 8;
    if (source.includes(term)) score += 3;
    if (body.includes(term)) score += 1;
  }
  if (section.sourcePageId.startsWith("operator-ruling") &&
      terms.some((term) => ["past","history","adventure","mission","villain","adversary","fought","fight"].includes(term))) {
    score += 14;
  }
  return score;
}

const SUPERSEDED_MEMORY_PATTERNS = [
  /Despair's biological child/i,
  /born when Despair became Erelyt's mother/i,
  /Perses .*remaining an established Child/i,
  /speaks .*through the Children application/i,
  /Death[’']s Son/i,
  /represented Endless parentage/i,
  /Lucien.{0,120}brief/i,
  /all nine autonomous personas/i,
  /all nine Children may speak/i,
  /John Ryder, Thanatos, Orpheus, Perses, Rose Walker, Distress/i,
];

function currentMemorySection(section: ChildrenNotionMemorySection) {
  return !SUPERSEDED_MEMORY_PATTERNS.some((pattern) => pattern.test(section.text));
}

export function selectChildrenLongTermMemory(query: string, limit = 5) {
  const terms = expandedQuery(query);
  return CHILDREN_NOTION_MEMORY_SECTIONS
    .filter(currentMemorySection)
    .map((section, index) => ({ section, index, score: sectionScore(section, terms) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(1, limit))
    .map((row) => row.section);
}

function compiledVillainIndex() {
  const groups = CHILDREN_NOTION_MEMORY_SECTIONS.filter((section) =>
    /Personal antagonist|Justice League Dark lineage|Doom Patrol lineage|Midnight Sons lineage/i.test(section.heading),
  );
  const lines: string[] = [];
  for (const section of groups) {
    const names = [...section.text.matchAll(/\*\*([^*:]+):\*\*/g)].map((match) => match[1].trim());
    if (/Personal antagonist/i.test(section.heading) && /Despair of the Endless/i.test(section.text)) {
      names.unshift("Despair of the Endless");
    }
    const unique = [...new Set(names)];
    if (unique.length) lines.push(`${section.heading}: ${unique.join(", ")}`);
  }
  return lines.join("\n");
}

export function renderChildrenLongTermMemory(query: string, limit = 5, maxChars = 6500) {
  const chosen = selectChildrenLongTermMemory(query, limit);
  const broadVillainQuery = /villain|adversar|enemies|enemy|who.{0,30}fought|fought.{0,30}who/i.test(query);
  const altarCanon = renderAltarCanonMemory(query);
  let out = broadVillainQuery
    ? `[Compiled villain encounter index from synchronized Notion canon]\n${compiledVillainIndex()}`
    : "";
  if (altarCanon) out = (out ? out + "\n\n" : "") + altarCanon.slice(0, maxChars);
  if (!chosen.length && !out) return "No relevant long-term canon memory was retrieved.";
  for (const section of chosen) {
    const block = `[${section.sourceTitle} → ${section.heading}]\n${section.text}`;
    if (out.length && out.length + block.length + 2 > maxChars) break;
    out += (out ? "\n\n" : "") + block.slice(0, Math.min(block.length, 2600));
  }
  return out || "No relevant long-term canon memory was retrieved.";
}

function activityScore(activity: StoredChildrenActivity, terms: string[], index: number) {
  const haystack = [
    activity.speakers?.join(" ") ?? "",
    activity.location ?? "",
    activity.plane ?? "",
    activity.transcript ?? "",
  ].join(" ").toLowerCase();
  let score = Math.max(0, 2 - index / 80);
  for (const term of terms) if (haystack.includes(term)) score += 2;
  return score;
}

export function selectChildrenEpisodicMemory(rawItems: unknown[], query: string, limit = 4) {
  const terms = expandedQuery(query);
  const continuityCue = /remember|last time|before|previous|past|history|again|adventure|mission|villain|fought|fight/i.test(query);
  const parsed = rawItems.flatMap((item, index) => {
    try {
      const activity = typeof item === "string" ? JSON.parse(item) as StoredChildrenActivity : item as StoredChildrenActivity;
      if (!activity || typeof activity !== "object" || !activity.transcript) return [];
      return [{ activity, index, score: activityScore(activity, terms, index) }];
    } catch {
      return [];
    }
  });
  const matched = parsed.filter((row) => row.score >= 3.5);
  const candidates = matched.length ? matched : continuityCue ? parsed.slice(0, 2) : [];
  return candidates
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(1, limit))
    .map((row) => row.activity);
}

export function renderChildrenEpisodicMemory(rawItems: unknown[], query: string, limit = 4, maxChars = 4500) {
  const chosen = selectChildrenEpisodicMemory(rawItems, query, limit);
  if (!chosen.length) return "No relevant prior Discord episode was retrieved.";
  let out = "";
  for (const activity of chosen) {
    const stamp = activity.timestamp ? ` @ ${activity.timestamp}` : "";
    const block = `[${activity.location ?? "Unknown location"}${stamp}]\n${activity.transcript ?? ""}`;
    if (out.length && out.length + block.length + 2 > maxChars) break;
    out += (out ? "\n\n" : "") + block.slice(0, Math.min(block.length, 1800));
  }
  return out || "No relevant prior Discord episode was retrieved.";
}

export const CHILDREN_MEMORY_POLICY = `MEMORY POLICY:
- Recent channel context is working memory.
- EPISODIC MEMORY contains prior recorded Discord scenes and adventures; it is history, not the current scene.
- LONG-TERM CANON MEMORY is a relevance-ranked snapshot synchronized from canonical Notion records and outranks improvised dialogue.
- Use memory only when relevant to the current question or scene. Do not dump lore unprompted.
- PROACTIVE RECALL: when the current scene materially connects to a retrieved past event or canon fact, the relevant Child should volunteer one concise in-character memory without waiting for Bart/Erelyt to ask. Do this naturally, not constantly. Bart/Erelyt is the Mythographer who cross-checks and records the story; he is not required to extract every memory by interrogation.
- The source-lineage adventure rule means Justice League Dark, Doom Patrol, and Midnight Sons parody histories are adapted past events in this continuity unless later canon contradicts a specific event. Translate incompatible source identities/organizations into established Children/Vought/ELAED equivalents; do not claim a literal crossover merely from the parody lineage.
- Never invent missing past events. If retrieved memory does not establish a requested detail, say the detail is not established rather than fabricating it.
- Never use recalled history to generate Bart/Erelyt's dialogue, actions, thoughts, decisions, consent, or unverifiable real-world supernatural claims.`;
