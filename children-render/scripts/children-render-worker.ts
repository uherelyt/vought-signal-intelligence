import { Redis } from "../lib/render-redis.ts";
import { createServer } from "node:http";
import { runChildrenDiscordGatewayPersistent } from "../lib/children-discord-gateway.ts";
import { runChildrenPulse } from "../lib/children-of-endless.ts";
import { CHILDREN_NOTION_MEMORY_VERSION } from "../lib/children-memory.ts";
import { startAltar, altarStatus } from "../lib/altar/worker.mjs";

const STATE_PREFIX = "vought:children-of-the-endless";
const RUNTIME_CANON_OVERRIDE_KEY = `${STATE_PREFIX}:runtime-canon:override`;
const RUNTIME_CANON_VERSION_KEY = `${STATE_PREFIX}:runtime-canon:version`;
const DISCORD_ACTIVITY_KEY = `${STATE_PREFIX}:discord:activity`;
const RUNTIME_CANON_TARGET_VERSION = "vworkspace:20261002-canon-v12";
const LEGACY_RETCON_VERSION_KEY = `${STATE_PREFIX}:retcon:material-interface:v10`;

const RUNTIME_CANON_BOOTSTRAP = `CONTROLLING RUNTIME CANON — 2 Oct 2026
- The altar is a Material-plane devotional connection: Children may converse there with gods and Erelyt’s combined-lineage ancestors. A devotional visit does not silently relocate a Child from a recorded ship station. Children have no dedicated altar shrines, except the explicitly requested Ah-Muzen-Cab I shrine linked to his existing team identity. Gods may visit other altar threads; ordinary Hero Channels remain observation-only for the altar application.
- The entire Children of the Endless Hero Network is durable canon. Every Network event is canonical unless the Operator explicitly retcons or supersedes it.
- Story-facing terminology: VoughtCord is the platform; Hero Network is the formal server-equivalent; the Children normally call their own Hero Network "the Network"; "the Children's Network" is the disambiguated conversational form; Hero Channels are rooms/channels. "Discord server" is technical/operator language.
- The Children's Network functions like a distributed Mount Olympus or Valhalla: a centralized, multi-layered cosmic assembly hub connecting distinct planes and realms without becoming another metaphysical plane.
- ASTRAL FIELD ONTOLOGY: the Astral Plane is a non-physical, consciousness-responsive domain. Thought, emotion, imagination, intention, memory, and symbolic affinity can rapidly shape perceived form, atmosphere, geography, and movement; ordinary physical law is not the controlling rule set for Astral scenes.
- Astral encounters may include disembodied souls or spirits, guides/subtle entities, dreaming or projecting travelers, astral wildlife, and thought-forms/archetypal manifestations. Do not automatically classify every encountered figure as an autonomous person when evidence better fits an echo, symbolic interface, thought-form, or mind-shaped manifestation.
- Lower Astral, Middle Astral, and Higher Astral are broad overlapping experiential/vibrational bands, not rigid stacked floors. Lower is denser and more turbulent/fixation-heavy; Middle includes much ordinary dreaming, exploration, symbolic learning, and routine interaction; Higher is comparatively luminous, ordered, peaceful, and associated with benevolent/transcendent imagery.
- The broad Astral bands do not replace established geography. The Silvery Sea, the Dreaming, dream-shallows, outer dream-shallows, Astral Mirror-Vessel, and named routes remain specific locations/structures whose local conditions may overlap more than one band.
- Dreaming is the most common recurring Astral route in Children canon; lucid dreaming increases self-awareness and agency. Meditation, visualization, breath-focused practice, and intentional astral projection may also function as deliberate threshold methods. Emotion and intention can alter routes, apparent distance, local weather, hazards, and encounter presentation.
- Waking recall of Astral experience may be incomplete or reconstructed through physical memory as imagery, narrative fragments, sensations, voices, symbols, or dream logic. Preserve the distinction between witnessed event, character interpretation, and controlling canon. This is Vought/Children metaphysical canon, not independently established empirical science.
- Cove is canonically the existing fallback observer on the Render runtime, operating through the single Children Discord application. The internal implementation identifier may remain "children_fallback"; story-facing observer identity is Cove.
- Distress of the Endless is a boy and uses he/him pronouns. Never use she/her for Distress.
- #astral is off-vessel Astral Plane field space. Characters speaking there experience the Astral scene itself. Never make them act as though they can see a browser, keyboard, terminal, tabs, channel controls, or the Discord/VoughtCord UI unless the Operator explicitly asks about the interface.
- Character location continuity is authoritative. A speaker may not casually appear aboard the vessel, in the galley, infirmary, archive, or another room while recorded in #astral without an explicit movement transition.
- When runtime routing changes a Child's canonical location for an event, that Child's first reply must naturally acknowledge arriving, stepping in/out, joining the others, or otherwise completing the move. Movement fields and narrated scene must agree.
- Durable Canon means the recorded event happened and the speaker genuinely expressed the attributed statement, perception, memory, joke, guess, or theory. It does not make every statement objective setting fact. Controlling V-Workspace canon and established event facts outrank character interpretation.
- Activity records must preserve the Hero Channel identity (#slug, canonical location name, and channel ID) rather than collapsing the location to a generic plane name.
- Historical Material-interface leakage is retconned to scene-native wording while preserving event IDs, timestamps, participants, Bart/Erelyt-authored lines, and plot meaning.`;

function redisClient() {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  return new Redis(url);
}

async function verifyGeminiCredential() {
  if (process.env.CHILDREN_VERIFY_GEMINI_ON_BOOT?.trim().toLowerCase() !== "true") return;
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("Gemini generation is not configured");
  const model = process.env.CHILDREN_MODEL?.trim() || "gemini-3.5-flash-lite";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Reply exactly OK." }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 8 },
      }),
      signal: AbortSignal.timeout(20_000),
    },
  );
  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json() as { error?: { message?: string } };
      detail = body.error?.message?.trim().slice(0, 240) ?? "";
    } catch {}
    throw new Error(`Gemini credential check returned ${response.status}${detail ? `: ${detail}` : ""}`);
  }
  console.info("[children-gemini-credential-ok]", model);
}

async function runAcceptancePulse() {
  if (process.env.CHILDREN_RENDER_ACCEPTANCE_PULSE?.trim().toLowerCase() !== "true") return;

  const redis = redisClient();
  if (!redis) throw new Error("Redis is not configured");

  const lockKey = `${STATE_PREFIX}:acceptance:render-v8:20261002`;
  const lock = await redis.set(lockKey, new Date().toISOString(), { nx: true, ex: 60 * 60 });
  if (lock !== "OK") {
    console.info("[children-render-acceptance-pulse-skipped]", "already_claimed");
    return;
  }

  try {
    const pulse = await runChildrenPulse({
      mode: "manual",
      force: true,
      turns: 1,
      participants: ["rose"],
      location: "astral",
      topic:
        "A quiet silver shimmer passes through the outer dream-shallows. Rose notices something subtle in it and says what she observes while remaining in the off-vessel Astral field. Do not mention software, terminals, browsers, keyboards, channels, or implementation details.",
    });

    if (!pulse.ok || pulse.skipped || !pulse.posted) {
      await redis.del(lockKey);
      throw new Error(`Render acceptance pulse did not post: ${pulse.reason ?? "unknown"}`);
    }

    console.info("[children-render-acceptance-pulse]", JSON.stringify({
      ok: pulse.ok,
      posted: pulse.posted,
      participants: pulse.participants,
    }));
  } catch (error) {
    await redis.del(lockKey);
    throw error;
  }
}

async function seedRuntimeCanon() {
  const redis = redisClient();
  if (!redis) throw new Error("Redis is not configured");
  const currentVersion = await redis.get(RUNTIME_CANON_VERSION_KEY);
  const current = typeof currentVersion === "string" ? currentVersion : "";
  if (current !== RUNTIME_CANON_TARGET_VERSION) {
    await Promise.all([
      redis.set(RUNTIME_CANON_OVERRIDE_KEY, RUNTIME_CANON_BOOTSTRAP),
      redis.set(RUNTIME_CANON_VERSION_KEY, RUNTIME_CANON_TARGET_VERSION),
    ]);
    console.info("[children-runtime-canon-seeded]", RUNTIME_CANON_TARGET_VERSION);
  } else {
    console.info("[children-runtime-canon-preserved]", current);
  }
}

async function retconLegacyMaterialInterfaceActivity() {
  const redis = redisClient();
  if (!redis) throw new Error("Redis is not configured");
  const done = await redis.get(LEGACY_RETCON_VERSION_KEY);
  if (done === "done") {
    console.info("[children-legacy-retcon-preserved]", RUNTIME_CANON_TARGET_VERSION);
    return;
  }

  const targetIds = new Set([
    "173c17ed-e294-49bb-a00c-0d1238c8f3f5",
    "2c956921-9dbb-4199-845a-07acca79e14c",
    "8818b295-fd2e-478b-8438-97dbe56a2de0",
    "0d1440f2-a31b-4010-bf51-508045c49a13",
    "356e712e-2758-41de-87c1-6b87c50c92cb",
    "fd2456f2-e766-4066-876b-68db4eba17e7",
  ]);
  const raw = await redis.lrange(DISCORD_ACTIVITY_KEY, 0, 199);
  const rewritten: string[] = [];
  let changed = 0;

  for (const item of raw) {
    const text = String(item);
    try {
      const record = JSON.parse(text) as {
        eventId?: string;
        transcript?: string;
        location?: string;
      };
      if (record.eventId && targetIds.has(record.eventId) && typeof record.transcript === "string") {
        const before = record.transcript;
        record.transcript = record.transcript
          .replace(/channel security/gi, "route exposure")
          .replace(/screens finally give you a headache/gi, "silver glare finally give you a headache")
          .replace(/staring at glowing pixels/gi, "staring into mirror-light")
          .replace(/screen light/gi, "mirror glare")
          .replace(/return to your terminal so you don't coat your custom keycaps in pastry crumbs/gi, "return to the chart table so you don't get pastry crumbs all over the maps")
          .replace(/infirmary monitors running/gi, "infirmary wards set");
        if (record.eventId === "173c17ed-e294-49bb-a00c-0d1238c8f3f5") {
          record.location = "#astral — Astral Plane (1555308123873616022)";
        }
        if (record.transcript !== before || record.location !== JSON.parse(text).location) changed += 1;
        rewritten.push(JSON.stringify(record));
        continue;
      }
    } catch {}
    rewritten.push(text);
  }

  if (changed > 0) {
    await redis.del(DISCORD_ACTIVITY_KEY);
    for (let index = rewritten.length - 1; index >= 0; index -= 1) {
      await redis.lpush(DISCORD_ACTIVITY_KEY, rewritten[index]);
    }
    await redis.ltrim(DISCORD_ACTIVITY_KEY, 0, 199);
  }
  await redis.set(LEGACY_RETCON_VERSION_KEY, "done");
  console.info("[children-legacy-retcon-applied]", JSON.stringify({ changed }));
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
      altar: altarStatus,
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
await retconLegacyMaterialInterfaceActivity();
await verifyGeminiCredential();
await runAcceptancePulse();

// Separate Discord application; isolated failure/activation never replaces the Children identity.
void startAltar().catch((error) => {
  const status = Number(error?.status);
  altarStatus.state = Number.isInteger(status) && status >= 400 && status <= 599
    ? `startup_discord_http_${status}`
    : "startup_failed_check_configuration";
  console.error("[altar-startup-failed]", altarStatus.state);
});

const result = await runChildrenDiscordGatewayPersistent({ forceTakeover: true });

if (!result.ok || result.fatal || (result.skipped && result.reason !== "reactive_disabled")) {
  console.error("[children-render-worker-exit]", JSON.stringify(result));
  process.exitCode = 1;
} else {
  console.info("[children-render-worker-exit]", JSON.stringify(result));
}
