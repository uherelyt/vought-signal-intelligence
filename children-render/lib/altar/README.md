# ELAED Altar application

This runtime uses a **separate Discord application** alongside the Children worker on the same Render host. It never uses the Children token to deliver altar messages. Missing altar credentials leave the Children running and report the activation blocker in `/healthz`.

Required private environment:

- `ALTAR_ENABLED=true`
- `ALTAR_DISCORD_BOT_TOKEN` — new altar application bot token, never the Children token
- `ALTAR_DISCORD_APPLICATION_ID` — new application ID
- `ALTAR_DISCORD_OPERATOR_USER_ID` — optional override of the existing Operator ID
- `ALTAR_ROSTER_GZIP_BASE64` — gzip/base64 roster generated from the current private Family Echo export
- Existing `REDIS_URL` and `GEMINI_API_KEY` are reused; `ALTAR_MODEL` optionally overrides the existing model.

Invite the new application to the existing Network with `bot` and `applications.commands` scopes. Enable Message Content Intent. Give it View Channel and Read Message History in the 13 observed rooms; give it Manage Webhooks, Manage Channels (forum tags), Send Messages/Create Posts, Send Messages in Threads, Add Reactions and Read Message History in `#altar`. Do not grant voice permissions or Administrator.

Forum parent is fixed at `1555666568409653268`. Shrines are reconciled against active and archived posts, then mapped persistently to roster IDs. Ordinary-channel delivery is rejected independently of generation. Bart/Erelyt and the redacted human-controlled record receive reference shrines but no generated dialogue. Anonymous source entries are kept separate and unresolved parent labels are explicitly marked.

Commands: `/altar`, `/offer`, `/candle`, `/tarot`, `/rune`, `/banish`, `/resume`. Figure selection supports autocomplete. Commands operate in verified altar threads; controls require the Operator ID and apply before new sends, including pending generated work.

Shared unsolicited budget: two messages/day, six hours apart, one appearance/figure/seven days, with relevant observed context required. No catch-up flood on wake. Candle expiry is reconciled on wake and removes only this bot's own reaction.

Memory remains private: durable events enter `vought:elaed-altar:durable-outbox` before the shared Network activity window. V-Workspace ingestion should acknowledge event IDs before removing outbox entries. The roster's 28-ancestor designation is not guessed from ambiguous Family Echo text labels; all 239 roster identities are included regardless of that pending subset tag.

The raw roster, contacts, birth dates, bio notes and credentials are not checked into this public deployment shell. The private source roster retains all 240 source records, with the two identical Coeus records mapping to one of 239 runtime identities.

Run tests: `node --test test/altar/*.test.mjs`.
