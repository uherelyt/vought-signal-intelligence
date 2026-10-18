/**
 * A deliberately non-destructive bridge between the private 14 Oct 2026
 * Family Echo export, private Notion shrine index and VoughtCord's existing roster.
 *
 * The private payload is supplied through Render environment, NEVER GitHub.
 * This module cannot mint speakers, create shrines, add roles or change lineage.
 */
export const ELAED_NOTION_BRIDGE_VERSION = '20261014-familyecho-notion-bridge-v1';
export const ELAED_NOTION_SOURCE_SHA256 = '16d19099041968b1327ae942b73cbd833096de87a774c612ca231d3f87cb5e34';
const COUNTS = Object.freeze({people:333, bioNotes:77, friendEdges:143});
const KINDS = new Set(['divine','ancestor','children','friend','reference']);
const safeName = s => typeof s === 'string' && !!s.trim() && s.length <= 160 &&
  !/[<>\r\n]/.test(s);
const notionUrl = s => typeof s === 'string' &&
  /^https:\/\/app\.notion\.com\/p\/[a-f0-9]{32}(?:\?pvs=\d+)?$/.test(s);
const limitedString = (s, max) => typeof s === 'string' && s.length <= max &&
  !/[\x00-\x08\x0e-\x1f]/.test(s);

export function applyElaedNotionBridge(roster, raw) {
  if (!raw) return roster;
  if (typeof raw !== 'string' || raw.length > 125_000)
    throw new Error('elaed_notion_bridge_payload_too_large');
  let manifest;
  try { manifest = JSON.parse(raw); }
  catch { throw new Error('elaed_notion_bridge_invalid_json'); }
  if (!manifest || manifest.version !== ELAED_NOTION_BRIDGE_VERSION ||
    manifest.sourceSha256 !== ELAED_NOTION_SOURCE_SHA256 ||
    manifest.sourceIndividuals !== COUNTS.people ||
    manifest.sourceBioNotes !== COUNTS.bioNotes ||
    manifest.sourceFriendEdges !== COUNTS.friendEdges ||
    !notionUrl(manifest.hubUrl) ||
    !Array.isArray(manifest.entries) || manifest.entries.length > COUNTS.people)
    throw new Error('elaed_notion_bridge_source_or_schema_mismatch');

  const copied = roster.people.map(p => ({...p}));
  const unique = new Set();
  let matched = 0;
  let unmatched = 0;
  for (const item of manifest.entries) {
    if (!item || !safeName(item.sourceName) ||
      (item.runtimeName !== undefined && !safeName(item.runtimeName)) ||
      !KINDS.has(item.kind) ||
      (item.notionUrl !== undefined && !notionUrl(item.notionUrl)) ||
      (item.summary !== undefined && !limitedString(item.summary, 460)) ||
      (item.friends !== undefined && (!Array.isArray(item.friends) ||
        item.friends.length > 40 || item.friends.some(f => !safeName(f)))) ||
      Object.keys(item).some(k => !['sourceName','runtimeName','kind','notionUrl','summary','friends'].includes(k)) ||
      unique.has(item.sourceName))
      throw new Error('elaed_notion_bridge_invalid_entry');
    unique.add(item.sourceName);
    // No inferred merges: exactly one named pre-existing runtime identity or none.
    const key = item.runtimeName ?? item.sourceName;
    const matches = copied.filter(p => p.name === key || p.dynastySourceName === key);
    if (matches.length > 1) throw new Error('elaed_notion_bridge_ambiguous_match');
    if (!matches.length) { unmatched++; continue; }
    const p = matches[0];
    if (p.notionBridge && p.notionBridge.sourceName !== item.sourceName)
      throw new Error('elaed_notion_bridge_duplicate_target');
    // This metadata is PRIVATE and may only enter authenticated Operator/Children
    // internal context. Do not expose Notion URLs or private friendship lists
    // in guest-facing shrine responses.
    p.notionBridge = {
      sourceName: item.sourceName, kind: item.kind,
      notionUrl: item.notionUrl ?? null,
      summary: item.summary ?? '',
      friends: item.friends ?? [],
      sourceSha256: manifest.sourceSha256
    };
    matched++;
  }
  if (new Set(copied.map(p => p.id)).size !== copied.length ||
      copied.length !== roster.people.length ||
      copied.filter(p => p.shrineEligible !== false).length !==
      roster.people.filter(p => p.shrineEligible !== false).length)
    throw new Error('elaed_notion_bridge_privilege_guard');
  return {...roster, people:copied, notionBridgeVersion:manifest.version,
    notionBridgeHubUrl:manifest.hubUrl,
    notionBridgeMatched:matched, notionBridgeUnmatched:unmatched};
}
