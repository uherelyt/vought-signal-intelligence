// Fail closed on Vercel; migration readiness is controlled by operator.
// Do not display tokens, secrets, connection strings, or roster contents.
const active = process.env.VOUGHTCORD_DAEMON_ACTIVATE === "yes";
if (!active) {
  console.error("[voughtcord-vercel-preflight] inactive: VOUGHTCORD_DAEMON_ACTIVATE is not yes");
  process.exit(78);
}
const required = ["REDIS_URL", "GEMINI_API_KEY", "CHILDREN_DISCORD_BOT_TOKEN", "CHILDREN_DISCORD_APPLICATION_ID", "ALTAR_DISCORD_BOT_TOKEN", "ALTAR_DISCORD_APPLICATION_ID", "ALTAR_ROSTER_GZIP_BASE64", "COVE_DISCORD_BOT_TOKEN", "COVE_DISCORD_APPLICATION_ID"];
const missing = required.filter(key => !(process.env[key] || "").trim());
if (missing.length) {
  console.error("[voughtcord-vercel-preflight] missing config key names:", missing.join(","));
  process.exit(78);
}
console.info("[voughtcord-vercel-preflight] activation and required credential names verified; no values printed.");
