# V-SID Signal Ingress

Classification: internal architecture // public-safe implementation notes

## Control boundary

V-SID uses three authorized access surfaces: **Notion**, **approved and actually accessible social-data applications**, and **VoughtGPT / Cove**. Social platforms do not inherit access to private Notion material. The production dashboard remains presentation and routing infrastructure.

Current connector audit, August 28, 2026:

- Notion: connected archive read/write surface through VoughtGPT.
- VoughtGPT / Cove: orchestration, normalization, analysis, correlation, and archive-command surface.
- YouTube: directly accessible through the authorized vidIQ application connection. This is the current direct social-data bridge.
- Spotify: an available media application, but not treated as an automatic creator-analytics archive connector by this service.
- TikTok, Instagram, Reddit, Tumblr, Discord, Twitch, Pinterest, and X: no matching direct ChatGPT account connector was surfaced by the current connector audit. They remain external publication/evidence sources unless data is deliberately routed through ingress.

Connector availability is a capability statement, not a publication-authority statement.

## Ingress service

`POST /api/ingest`

The endpoint accepts normalized or semi-normalized JSON from an API integration, RSS bridge, inbound-email automation, platform download processor, automation service, user capture, or vidIQ/VoughtGPT relay. It normalizes the record and writes it to the **V-SID Operational Log** in Notion.

The dashboard's HTTP Basic Authentication does not apply to this one machine-ingress route because external automation services cannot complete an interactive browser challenge. `/api/ingest` instead requires a separate bearer secret. If the secret is not configured, the route fails closed with HTTP 503. If the supplied secret is wrong, it returns HTTP 401.

Required Vercel environment variables:

- `VSID_INGEST_SECRET` — long random bearer secret used only by trusted ingress producers.
- `NOTION_TOKEN` or `VSID_NOTION_TOKEN` — Notion integration token with permission to create pages in the operational-log database.

Optional variables:

- `VSID_NOTION_DATABASE_ID` — defaults to the current V-SID Operational Log database.
- `VSID_NOTION_VERSION` — defaults to `2022-06-28` for the public Notion API request format used by the function.

Secrets must remain in Vercel environment configuration. Do not commit them to GitHub, Notion public pages, social profiles, or the dashboard HTML.

## Accepted record shape

```json
{
  "source": "TikTok",
  "source_type": "automation",
  "subject": "@account",
  "external_id": "post-identifier",
  "url": "https://example.invalid/post",
  "observed_at": "2026-08-28T16:42:00-04:00",
  "content": "caption, transcript, notification text, or extracted post text",
  "metrics": {
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0
  },
  "media": [],
  "context": "capture context",
  "analyst_note": "optional human note",
  "confidence": "unassessed"
}
```

Batch ingestion is supported with `{ "records": [ ... ] }` up to 25 records per request. Request bodies are capped at 1 MB.

## Normalized record

Every accepted signal receives:

- schema version
- deterministic V-SID signal ID
- source/platform
- source type
- access class
- subject/account
- external identifier
- observed timestamp
- source URL
- textual content
- metrics
- media references
- context
- analyst note
- confidence
- received timestamp
- raw supplied payload

The service does **not** perform interpretive analysis at ingestion time. It records evidence first. VoughtGPT performs later narrative, sentiment, anomaly, audience, cadence, cross-platform, or behavioral analysis so observation and inference remain distinguishable.

## Source adapters

Use the same ingress contract regardless of upstream mechanism:

- API: scheduled or event-driven fetcher maps API response fields into the ingress JSON.
- RSS/Atom: feed parser maps each item into a signal record and uses the item GUID or URL as `external_id`.
- Email notification: inbound-email automation maps sender, subject, body, and linked post into a signal record.
- Download/export: parser converts CSV/JSON export rows into batch records.
- Automation service: Zapier, Make, IFTTT, platform webhook, or equivalent service posts directly to `/api/ingest` with the bearer secret.
- VoughtGPT/vidIQ: authorized YouTube observations can be normalized by VoughtGPT and written through Notion directly; the HTTP endpoint exists for external machine sources, not as a requirement for already connected tools.

## Trust model

Access and analysis remain separate. A platform may supply evidence without receiving archive access. Notion remains authoritative storage. VoughtGPT remains the interpretation and orchestration boundary. External producers receive only the minimum information required to submit a signal.

Status states:

- **CODE DEPLOYED** — ingress implementation exists in the production repository.
- **RUNTIME SEALED** — endpoint exists but fails closed until required secrets are configured.
- **ACTIVE** — bearer secret and Notion integration token are configured and an authenticated test record successfully reaches Notion.
