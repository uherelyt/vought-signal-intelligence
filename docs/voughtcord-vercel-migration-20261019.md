# Voughtcord: return to Vercel (staged, 19 October 2026)

## What this branch implements
- Uses Vercel Daemons (public beta) to package the existing `children-render/` Node 24 process, containing the Children, Altar and Vought International applications.
- Preserves the original application code, identities, shrine/memory models, and Discord Gateway behavior.
- Declares `voughtcord` as a **zero-replica** daemon in `vercel.json`, to prevent concurrent Discord bot instances and charges while setup is incomplete.
- Adds an explicit activation and missing-config fail-closed preflight, without embedding secret values anywhere in Git.
- Does not change the Render production branch `deploy/children-render-v8`.

## Cutover prerequisites (NOT YET COMPLETE)
1. Move required production credentials to **Vercel project environment variables**, never into GitHub:
   - `VOUGHTCORD_DAEMON_ACTIVATE=yes` at actual cutover only.
   - `CHILDREN_DISCORD_BOT_TOKEN`, `CHILDREN_DISCORD_APPLICATION_ID`.
   - `ALTAR_DISCORD_BOT_TOKEN`, `ALTAR_DISCORD_APPLICATION_ID`, `ALTAR_ROSTER_GZIP_BASE64`.
   - `COVE_DISCORD_BOT_TOKEN`, `COVE_DISCORD_APPLICATION_ID`, `GEMINI_API_KEY`.
   - `REDIS_URL` pointing to a **non-Render** persistent Redis-compatible service once state is exported/migrated.
   - Review the worker source and production environment for any additional required values (operator IDs, channel IDs, policy keys, model settings, etc.).
2. **Backup and verify all existing Render Key Value records**. Free Render Key Value persistence is OFF. This store holds child/persona movement and sessions, shrine/thread IDs, some event histories, and Vought International settings. Do not publish a raw backup to public GitHub. Verify external storage quota and backup retention. Existing free Render Postgres has expiry 2026-11-04; deployed Node worker appears to use Redis instead, but verify before dropping that database.
3. Obtain the operator's Google mail connection to `yourmidnightstarboy@gmail.com` if Render billing notice must be checked; the Gmail connector returned an account-link resolution error at time of staging.
4. Deploy and validate the Vercel project with **0 daemon replicas**. A preview won't actually run a daemon, and daemons launch only on production deployments.
5. Prepare real production credentials and persistent data. Only then scale to **1 replica**. Before enabling Vercel, stop the Render Gateway worker cleanly or otherwise ensure there is no simultaneous active instance; preserve a rollback procedure.
6. Acceptance: Children Gateway login and reactive message, Altar/Oracle/shrines and unchanged ID mappings, Vought International application, scheduled/automatic activity, canon/memory recall, command permissions, no duplicate messages, no leaked credentials, uptime/reconnect, quotas and $0 plan usage.
7. Shut down and retire Render services **only after** all live acceptance checks and safe state backup.

## Vercel plan caveat
Vercel Daemons entered public beta 2026-10-15. Hobby permits 1Gi/2Gi workers with a 10 **active CPU-hour/month** daemon quota shared across projects, not unlimited guaranteed free compute. Exhausting that quota stops the daemons until next month. Daemon preview is not supported, and filesystem storage is not persistent. Running at 0 replicas consumes no daemon CPU but is **not an operating migration**.

## Operational integrity
- Preserve user's Vercel `cove` project and social publishing behavior; this is a separate project.
- No content or bot message sent to Discord as part of repository preparation.
- No account credential, database password, transcript, genealogy, or canon archive uploaded to a public repository.
- Source code itself is already in the creator-owned GitHub repo; respect its existing privacy settings.
- The code comment `CHILDREN_RUNTIME_HOST` may still say `render` until a properly tested cutover. Do not claim an untested Vercel daemon is live.
