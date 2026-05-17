# Deimos (Even Hub)

Multi-model AI chat for Even G2: phone UI + streaming lens HUD. Standalone in the Hub WebView; optional desktop tether via `npm run tether:bridge`.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173  (?pc=1 for browser-only)
npm run sim          # G2 simulator (dev server must be running)
npm run pack:hub     # deimos.ehpk for Hub import
```

## Features (v0.5.0)

- Provider profiles (OpenAI, Anthropic, Gemini, OpenAI-compatible)
- Multi-session chat history
- Slash commands (`/help`, `/compact`, `/review`, …) and bundled skills
- Lens preview when G2 bridge is connected
- Browser tools: URL fetch in prompts
- Themes: Terminal Black, high contrast, dim
- Optional tether: `npm run tether:bridge` then set Agent mode → Desktop tether

## Desktop tether

1. `export OPENAI_API_KEY=sk-…`
2. `npm run tether:bridge` (listens on `http://127.0.0.1:8765`)
3. In app Advanced → Agent mode → Desktop tether

Full bash/MCP parity requires future dxa-deimos gRPC bridge.

## QA

- `npm run test && npm run build`
- Simulator: list nav, streaming text, exit parity (`?simExitParity=1`)
- Device: use LAN IP with `npm run hub:qr`, not `localhost`
