# COVE LIVE BRIDGE

Local, zero-API-cost runtime for Cove. It connects Discord to authorized Notion reads, uses Ollama for local inference, archives results through VoughtGPT / V-SID, and lets n8n trigger hourly and daily autonomous sweeps.

## Boundary

Cove reads only Notion content explicitly shared with the Notion integration. Autonomous writes are append-only through the authenticated V-SID `/api/ingest` endpoint. It does not silently rewrite source evidence or pretend missing evidence exists.

## Stack

- Discord: live operator interface (`!cove ...`)
- Ollama: local model inference, no per-token API bill
- Notion API: authorized archive retrieval
- V-SID: authenticated normalization + Notion archival
- n8n Community Edition: local schedules and future workflow expansion
- Docker Compose: single-command local runtime

## Setup

1. Install Docker Desktop (or Docker Engine) and Ollama.
2. Pull a local Ollama model, for example `ollama pull qwen2.5:3b`.
3. Copy `.env.example` to `.env` and fill the required values.
4. In Discord Developer Portal, create a bot, enable Message Content Intent, invite it to your server, and put the token + permitted channel ID in `.env`.
5. Create a Notion internal integration and share only the six authorized VoughtGPT directories (or narrower pages) with it. Put its token in `.env`.
6. Set `VSID_INGEST_SECRET` to the same bearer secret configured on the V-SID deployment. Do not expose it in browser code.
7. Start the stack: `docker compose up -d --build`.
8. Open `http://localhost:5678`, import `n8n-workflow.json`, then activate it.
9. Health check: `http://localhost:8787/health`.
10. In the authorized Discord channel, test `!cove status`, then `!cove <question>`.

## Schedules

The included n8n workflow runs:

- `V-SID Autonomous Sync` every hour.
- `Vought Operations Sweep` daily at 08:00 America/New_York.

Both call the local authenticated `/sweep` endpoint and archive the resulting assessment through V-SID.

## Required secrets

Never commit `.env`. The bridge requires Discord, Notion, and V-SID secrets locally. Ollama remains local. Vercel receives no Discord or Ollama credential.

## Cost model

The software path can operate without paid model API usage: Docker, Ollama, Discord bots, n8n Community Edition, and a Notion integration can all be used locally/free within their respective limits. Vercel Hobby and Notion free-tier limitations still apply to the cloud surfaces you already use.
