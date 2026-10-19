# Voughtcord state preservation and Vercel cutover
Updated 2026-10-19. Status: **PREPARED, not switched over**.

## Production topology
- Render `children-voughtcord` remains the only live Discord Gateway runtime.
- Vercel `voughtcord` has a successfully built daemon container with **0 instances** and `VOUGHTCORD_DAEMON_ACTIVATE=no`.
- The existing Vercel `cove` project belongs to a *different* GitHub repository and must not be overwritten.
- The Render Key Value instance currently has **persistence disabled**. Its state must be copied out before decommissioning or changing producers. Canonical Notion data and Discord message history are distinct from transient Redis state.
- Render Free Postgres expires **2026-11-04 03:59:49 UTC**, but the audited deployed Node worker does not include a PostgreSQL client. Never assume the database is empty merely because its use has not been identified.

## Redis transfer utility
Run these commands in a trusted Node.js 24 environment with the repo's `children-render` directory available. The `redis` npm package is already a declared dependency.

```bash
cd children-render
npm install --omit=dev
# Set REDIS_URL via trusted shell secrets/config, not literal command history.
node scripts/redis-state-transfer.mjs inventory
node scripts/redis-state-transfer.mjs export ./private-redis-backup.ndjson
# Keep backup OUTSIDE tracked Git working tree and in encrypted storage.
# Set TARGET_REDIS_URL to a newly provisioned, durable, empty Redis/Valkey service.
node scripts/redis-state-transfer.mjs import ./private-redis-backup.ndjson
node scripts/redis-state-transfer.mjs import ./private-redis-backup.ndjson --apply
node scripts/redis-state-transfer.mjs verify ./private-redis-backup.ndjson
```

**Critical controls:** The script operates on `vought:*` only and refuses unknown Redis types, very large keyspaces, and imports into a nonempty target namespace. It creates the snapshot using exclusive creation and restrictive file permissions (0600). Export contains **potentially sensitive Discord/user content and private scene history**; never commit it to GitHub, paste it into chat, transmit it to a public URL, or log its contents. `import` is dry-run by default; `--apply` writes. If import is interrupted, destination may contain partial state and must be examined or discarded. Source is never modified. Export and verify are not an alternative to restoring data from Discord/Notion when state is already absent. Snapshotting a live-changing Redis has no transaction-level consistency: schedule a *short controlled handover interval* with the current writer paused before the final delta/snapshot. TTLs are preserved approximately; naturally expired records may be skipped.

**Operator access blocker:** The ChatGPT Render connector currently lists Key Value metadata but cannot retrieve Redis credentials or run its commands. The first real snapshot must be made from a trusted environment with authorized direct `REDIS_URL` access or an operator-approved runtime export route. Do not fabricate backup success.

## Cutover runbook
1. Confirm current traffic and runtime state with Render and Discord; identify all three apps and Gateway leases.
2. Provision a **persistent, non-Render Redis-compatible service** and inspect free-tier capacity and quota policy. Vercel daemon disk is ephemeral, and Vercel does not provide a free permanent Redis merely by running a daemon.
3. Back up live source Redis using the utility and verify the destination; preserve encrypted copy in a safe place.
4. Set `REDIS_URL`, Discord/Gemini/Altar secrets and configuration on the **Vercel voughtcord project**, not the public GitHub repo. Credentials must be selected/provided through the provider's encrypted environment setting, not in chat.
5. Confirm `VOUGHTCORD_DAEMON_ACTIVATE=no` until the active Render Gateway is stopped/suspended. Ensure no two running app instances can reply to the same Discord events.
6. Scale the daemon config from `iad1: 0` to `iad1: 1` and set activation flag to `yes` only in a coordinated deployment with a recent verified state copy. Preserve Render service and configuration for rollback.
7. Test Children ordinary reactive chat and slash commands, Altar shrines/oracle, Vought International, character locations/canon, cooldowns, automatic behavior, and no duplicate messages or permission leaks. Inspect Vercel daemon logs and Hobby CPU usage.
8. Only after approval and successful tests, retire Render's web service and storage. Keep the encrypted migration backup for a defined retention period.

## Free limits
Vercel Daemons are public beta as of October 2026; Hobby offers **10 active CPU-hours/month**, which are not a guaranteed 24/7 always-free service. Hitting the quota stops the daemon. Production-only daemon runs and potential beta changes require monitoring.

## No unapproved external effects
GitHub commits, staged Vercel builds, and private documentation changes are migration preparation, NOT authorization to post into the Discord Hero Network, lose user state, force autonomous interactions, or incur paid compute charges.
