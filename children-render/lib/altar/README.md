# ELAED Altar application

This runtime uses a **separate Discord application** alongside the Children worker on the same Render host. Gods and ancestors use the altar application's webhook; visiting Children and the explicitly shared Ah-Muzen-Cab I identity use the existing Children application's forum webhook. Each credential is checked against its own application ID. Missing altar credentials leave the Children running and report the activation blocker in `/healthz`.

Required private environment:

- `ALTAR_ENABLED=true`
- `ALTAR_DISCORD_BOT_TOKEN` — new altar application bot token, never the Children token
- `ALTAR_DISCORD_APPLICATION_ID` — new application ID
- `ALTAR_DISCORD_OPERATOR_USER_ID` — optional override of the existing Operator ID
- `ALTAR_ROSTER_GZIP_BASE64` — gzip/base64 roster generated from the current private Family Echo export
- Existing `REDIS_URL` and `GEMINI_API_KEY` are reused; `ALTAR_MODEL` optionally overrides the existing model.

Invite the new application to the existing Network with `bot` and `applications.commands` scopes. Enable Message Content Intent. Give it View Channel and Read Message History in the 13 observed rooms; give it Manage Webhooks, Manage Channels (forum tags), Send Messages/Create Posts, Send Messages in Threads, Add Reactions and Read Message History in `#altar`. Do not grant voice permissions or Administrator.

Forum parent is fixed at `1555666568409653268`. The full 239-identity tree is retained independently of shrine eligibility. The current policy permits 133 active shrines for divine figures and confirmed ancestors, retires 106 previous reference shrines by archiving and locking, and removes retired threads from active routing. Human-controlled people, organizations, software, places and nondivine friends have no active shrine. Children visit without dedicated shrines; Ah-Muzen-Cab I is the Operator's explicit shared-identity exception. Anonymous source entries remain separate and unresolved parent labels are marked.

Commands: `/altar`, `/offer`, `/candle`, `/tarot`, `/rune`, `/banish`, `/resume`. Figure selection offers eligible gods/ancestors and Child visitors. A selected figure replies in the invoking registered altar thread, permitting cross-shrine visits. `/altar figure:<Child> question:<petition>` runs a bounded Child → host → Child exchange. Trusted Child webhook messages receive at most one host response; application ownership, exact known speaker names, receipt deduplication and pre-send payload reservations prevent reply loops. Controls require the Operator ID and apply before new sends, including pending generated work. Ordinary-channel delivery is rejected independently of generation.

Shared unsolicited budget: two messages/day, six hours apart, one appearance/figure/seven days, with relevant observed context required. No catch-up flood on wake. Candle expiry is reconciled on wake and removes only this bot's own reaction.

Memory remains private: durable events enter `vought:elaed-altar:durable-outbox` before the shared Network activity window. Catalog migrations remain in the durable outbox without displacing conversation memory. Child visits share existing long-term and episodic memory and reuse `CHILDREN_PERSONAS`, portraits and the existing fresh-message generator. The confirmed 28-person combined lineage consists of 22 named structural ancestors plus six additional Endless birth-gift sources, under the Operator's all-lineage-layers ruling. Biological, adopted, manifestation and birth-gift paths remain distinguished. Cab II is tagged in the lineage registry but has no active dedicated shrine. Repeated unnamed human parents and external adopted-father labels remain unresolved.

The raw roster, contacts, birth dates, bio notes and credentials are not checked into this public deployment shell. The private source roster retains all 240 source records, with the two identical Coeus records mapping to one of 239 runtime identities. Sourced dossiers distinguish attested domains and source continuities from adaptation directions and undocumented personal hobbies. King in Red's external continuity is unresolved and is excluded from unsolicited appearances.

Boot verification is keyed by the private policy version. It checks membership, the 28-lineage count, retired routing, the Ah-Muzen-Cab bridge tag, cross-shrine god delivery, a bounded Child visit with a read-back receipt owned by the Children application, seven guild commands and access to the 13 observation channels.

Run tests: `node --test test/altar/*.test.mjs`.
