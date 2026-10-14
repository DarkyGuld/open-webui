# Chrome DevTools MCP

Status: **configured and enabled** in `opencode.json` (server name `chrome-devtools`).

## What it is

`chrome-devtools-mcp` (Google LLC, Apache-2.0) is an MCP server that lets an agent
control and inspect a live Chrome browser via the DevTools protocols. Official
support targets Google Chrome / Chrome for Testing. Requires Node ≥ 20.19.

## Configuration (already applied)

```json
"chrome-devtools": {
  "type": "local",
  "command": ["npx", "-y", "chrome-devtools-mcp@latest", "--no-usage-statistics"],
  "enabled": true,
  "environment": {}
}
```

`--no-usage-statistics` opts out of Google's usage telemetry (consistent with this
project's no-telemetry stance).

## Prerequisites (satisfied here)

- Node.js ≥ 20.19 → v22.23.3 ✅
- Google Chrome stable → 155.0.8059.80 ✅
- npm ✅

## Intended use in later phases

- Inspect DOM/CSS/layout of the local PAW app and upstream Open WebUI.
- Read console errors, inspect network activity, investigate layout shifts and performance.
- Cross-check Playwright-captured screenshots against the live DOM.

## Verification

```bash
# Smoke-launch the server via the MCP inspector (Ctrl-C to exit):
npx -y @modelcontextprotocol/inspector npx chrome-devtools-mcp@latest --no-usage-statistics
```

## Fallback

If the MCP server is unavailable, equivalent inspection is available through the
`audit/` Playwright harness (`audit/lib/browser.mjs` captures console errors, page
errors, failed requests and HTTP ≥400 responses, plus full traces) and through
Chrome DevTools Protocol directly via Playwright's `page.context().newCDPSession()`.
