# Deimos (Even Hub)

Multi-model AI chat for Even G2: phone UI + streaming lens HUD. Hub-first agent with tools, MCP, slash commands, and skills.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173  (?pc=1 for browser-only)
npm run sim          # G2 simulator (dev server must be running)
npm run pack:hub     # deimos.ehpk for Hub import
```

## Features (v0.9.0)

- **Agent loop v2** — multi-turn tool calling (OpenAI, Anthropic); web fetch, ask-user sheet, MCP tools
- **Provider profiles** — OpenAI, Anthropic, Gemini, OpenRouter (incl. free tier), and more
- **Sessions** — multi-chat, rename/delete, pinned session notes, export/import backup
- **Slash commands** — `/help`, `/compact`, `/review`, `/export`, `/skills`, `/mcp`, …
- **Bundled skills** — `/skill:review`, debug, plan, … + skills picker UI
- **G2 lens** — nav menu, scroll, live status, optional read pace
- **MCP** — add HTTP MCP servers in Settings (whitelist hosts in `app.json` before pack)
- **Themes** — Deimos Black, high contrast, dim
- **Optional tether** — `npm run tether:bridge` → Settings → Desktop tether

## MCP whitelist

Custom MCP URLs must be allowed in [`app.json`](app.json) `network.whitelist` before `npm run pack:hub`.

## Desktop tether (optional)

1. `export OPENAI_API_KEY=sk-…`
2. `npm run tether:bridge` → `http://127.0.0.1:8765/health`
3. Settings → Agent mode → Desktop tether

Full bash/repo tools require future **dxa-deimos gRPC** proxy on the tether bridge.

## QA

- `npm run test && npm run build`
- Simulator: `npm run sim` with `?simExitParity=1`
- Device: `npm run hub:qr` with LAN IP (not `localhost`)

## Repo

https://github.com/dxiv/even-deimos
