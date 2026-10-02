import { Redis } from "../lib/render-redis.ts";
import { createServer } from "node:http";
import { runChildrenDiscordGatewayPersistent } from "../lib/children-discord-gateway.ts";
import { CHILDREN_NOTION_MEMORY_VERSION } from "../lib/children-memory.ts";

const STATE_PREFIX = "vought:children-of-the-endless";
const RUNTIME_CANON_OVERRIDE_KEY = `${STATE_PREFIX}:runtime-canon:override`;
const RUNTIME_CANON_VERSION_KEY = `${STATE_PREFIX}:runtime-canon:version`;

const RUNTIME_CANON_BOOTSTRAP = `CONTROLLING RUNTIME CANON — 2 Oct 2026
- The entire Children of the Endless Hero Network is durable canon. Every Network event is canonical unless the Operator explicitly retcons or supersedes it.
- Story-facing terminology: VoughtCord is the platform; Hero Network is the formal server-equivalent; the Children normally call their own Hero Network "the Network"; "the Children's Network" is the disambiguated conversational form; Hero Channels are rooms/channels. "Discord server" is technical/operator language.
- The Children's Network functions like a distributed Mount Olympus or Valhalla: a centralized, multi-layered cosmic assembly hub connecting distinct planes and realms without becoming another metaphysical plane.
- Cove is canonically the existing fallback observer on the Render runtime, operating through the single Children Discord application. The internal implementation identifier may remain "children_fallback"; story-facing observer identity is Cove.
- Distress of the Endless is a boy and uses he/him pronouns. Never use she/her for Distress.
- #astral is off-vessel Astral Plane field space. Characters speaking there experience the Astral scene itself. Never make them act as though they can see a browser, keyboard, terminal, tabs, channel controls, or the Discord/VoughtCord UI unless the Operator explicitly asks about the interface.
- Character location continuity is authoritative. A speaker may not casually appear aboard the vessel, in the galley, infirmary, archive, or another room while recorded in #astral without an explicit movement transition.
- Activity records must preserve the Hero Channel identity (#slug, canonical location name, and channel ID) rather than collapsing the location to a generic plane name.`;

function redisClient() {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  return new Redis(url);
}

async function seedRuntimeCanon() {
  const redis = redisClient();
  if (!redis) throw new Error("Redis is not configured");
  const currentVersion = await redis.get(RUNTIME_CANON_VERSION_KEY);
  const current = typeof currentVersion === "string" ? currentVersion : "";
  if (!current || current.startsWith("bootstrap:")) {
    await Promise.all([
      redis.set(RUNTIME_CANON_OVERRIDE_KEY, RUNTIME_CANON_BOOTSTRAP),
      redis.set(
        RUNTIME_CANON_VERSION_KEY,
        `bootstrap:${CHILDREN_NOTION_MEMORY_VERSION}`,
      ),
    ]);
    console.info("[children-runtime-canon-seeded]", CHILDREN_NOTION_MEMORY_VERSION);
  } else {
    console.info("[children-runtime-canon-preserved]", current);
  }
}

process.env.CHILDREN_RUNTIME_HOST ||= "render";

const port = Number(process.env.PORT?.trim() || "10000");
const httpServer = createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (url.pathname === "/healthz" || url.pathname === "/") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({
      ok: true,
      service: "children-voughtcord",
      runtimeHost: process.env.CHILDREN_RUNTIME_HOST,
      snapshot: CHILDREN_NOTION_MEMORY_VERSION,
    }));
    return;
  }
  response.writeHead(404, { "content-type": "text/plain" });
  response.end("Not found");
});
httpServer.listen(port, "0.0.0.0");

console.info("[children-render-worker-boot]", JSON.stringify({
  runtimeHost: process.env.CHILDREN_RUNTIME_HOST,
  snapshot: CHILDREN_NOTION_MEMORY_VERSION,
  port,
}));

await seedRuntimeCanon();

const result = await runChildrenDiscordGatewayPersistent({ forceTakeover: true });

if (!result.ok || result.fatal || (result.skipped && result.reason !== "reactive_disabled")) {
  console.error("[children-render-worker-exit]", JSON.stringify(result));
  process.exitCode = 1;
} else {
  console.info("[children-render-worker-exit]", JSON.stringify(result));
}
