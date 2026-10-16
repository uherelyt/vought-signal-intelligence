// Owner-only Notion navigation and voluntary energy check-ins.
// No private Notion data or API credentials are committed to the public repository.
import { Redis } from "./render-redis.ts";

export const PRIVATE_CANON_COMMAND = {
  name: "canon", type: 1,
  description: "Operator-only Cove canon index and optional creative-energy check-in.",
  options: [
    {
      type: 3, name: "view", description: "Which private continuity lens?",
      required: false,
      choices: [
        { name: "Overview", value: "index" },
        { name: "Five Facets", value: "facets" },
        { name: "Minecraft World", value: "world" },
        { name: "Cove Workflows", value: "operations" },
        { name: "Energy & Focus", value: "energy" },
      ],
    },
    { type: 4, name: "energy", description: "Optional self-reported energy from 0 to 10.", min_value: 0, max_value: 10, required: false },
    { type: 3, name: "focus", description: "Optional one meaningful priority. Private; expires in 14 days.", max_length: 150, required: false },
  ],
};

const STORE_KEY = "vought:erelyt:private:creative-checkin:v1";
const TTL = 14 * 24 * 60 * 60;
let redis = null;

function allowedNotionLink(raw) {
  if (!raw) return "";
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return "";
    const h = url.hostname.toLowerCase();
    if (h !== "app.notion.com" && h !== "www.notion.so" && h !== "notion.so" && !h.endsWith(".notion.site")) return "";
    return url.toString();
  } catch { return ""; }
}

export function canonAuthorized(userId, operatorId) {
  return Boolean(operatorId && /^\d{15,22}$/.test(operatorId) && userId === operatorId);
}

export function canonIntent(options = []) {
  const field = (name) => options.find((v) => v?.name === name)?.value;
  const rawView = field("view");
  const view = ["index", "facets", "world", "operations", "energy"].includes(rawView) ? rawView : "index";
  const rawEnergy = field("energy");
  const energy = Number.isInteger(rawEnergy) && rawEnergy >= 0 && rawEnergy <= 10 ? rawEnergy : null;
  const rawFocus = field("focus");
  const focus = typeof rawFocus === "string" ? rawFocus.trim().slice(0, 150) : "";
  return { view, energy, focus };
}

export function canonText(view, notionUrl = "", record = null) {
  const headings = {
    index: "PRIVATE COVE CONTROL PLANE\nOrigin motif: The Empty. Narrative center: Erelyt. Linked worlds remain distinct.",
    facets: "FIVE FACETS\nErelyt: voice and choice. Bart: interpretation. Cab II: watching and memory. Meli: divine free-soul motif and designated traveler. Body: agency and consequence. Cove: fictional protector, not a real physical entity.",
    world: "THE WORLD REMEMBERS\nBedrock: 'for 'cab. Blue cushion; west Styx/Potamoi, east Limnades, north Acheron, sealed south Lethe. Base invasion is staged fiction; explore optionally.",
    operations: "COVE OPERATIONS\nNotion: private source. Drive: approved assets. GitHub: reversible code. Render: Discord runtime. Vercel: viewer-facing edge. No auto-publishing, finance actions, or unsolicited messages.",
    energy: "HONEY LEDGER\nSelf-report only. Preserve recovery. Money, organic expansion, returning viewers; one worthwhile creative priority at a time.",
  };
  const lines = [headings[view] || headings.index];
  const link = allowedNotionLink(notionUrl);
  if (link) lines.push("Private Notion hub (Notion access controls apply): " + link);
  else lines.push("Private Notion hub link not configured. Ask operator to set ERELYT_PRIVATE_CANON_URL.");
  if (view === "energy" || record) {
    if (record) lines.push("Last voluntary check-in: " + (record.energy === null ? "energy unreported" : record.energy + "/10") + "; focus: " + (record.focus || "unreported") + "; recorded " + record.at + ".");
    else lines.push("No voluntary check-in recorded.");
  }
  lines.push("Private navigation link only; live Notion API synchronization is not enabled.");
  return lines.join("\n").slice(0, 1900);
}

function getRedis() {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  if (!redis) redis = new Redis(url);
  return redis;
}

async function storedCheckin(client) {
  if (!client) return null;
  const raw = await client.get(STORE_KEY);
  if (!raw || typeof raw !== "string") return null;
  try {
    const data = JSON.parse(raw);
    return {
      energy: Number.isInteger(data.energy) && data.energy >= 0 && data.energy <= 10 ? data.energy : null,
      focus: typeof data.focus === "string" ? data.focus.slice(0, 150) : "",
      at: typeof data.at === "string" ? data.at.slice(0, 30) : "unknown time",
    };
  } catch { return null; }
}

export async function handlePrivateCanonInteraction(interaction) {
  if (interaction?.type !== 2 || interaction?.data?.name !== "canon") return false;
  const appId = process.env.CHILDREN_DISCORD_APPLICATION_ID?.trim();
  if (!appId || interaction.application_id !== appId || !interaction.id || !interaction.token) return true;

  const operator = process.env.CHILDREN_DISCORD_OPERATOR_USER_ID?.trim();
  const userId = interaction.member?.user?.id;
  let content = "Access denied. Operator-only private command.";
  if (canonAuthorized(userId, operator)) {
    const intent = canonIntent(interaction.data.options);
    try {
      const store = getRedis();
      let record = await storedCheckin(store);
      if (intent.energy !== null || intent.focus) {
        record = { energy: intent.energy, focus: intent.focus, at: new Date().toISOString() };
        if (!store) throw new Error("Private storage is unavailable");
        await store.set(STORE_KEY, JSON.stringify(record), { ex: TTL });
      }
      content = canonText(intent.view, process.env.ERELYT_PRIVATE_CANON_URL?.trim(), record);
    } catch {
      content = "Private canon temporarily unavailable; no public response or check-in created.";
    }
  }
  const response = await fetch("https://discord.com/api/v10/interactions/" + interaction.id + "/" + interaction.token + "/callback", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: 4, data: { flags: 64, content, allowed_mentions: { parse: [] } } }),
    signal: AbortSignal.timeout(2500),
  });
  if (!response.ok) throw new Error("Discord private canon response failed: " + response.status);
  return true;
}
