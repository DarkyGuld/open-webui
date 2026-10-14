# Figma MCP

Status: **pre-configured, disabled** in `opencode.json` (server name `figma`).
Figma is **not required** for the initial audit; it is a later design-handoff option.

## What it is

Figma provides two MCP servers:
- **Remote (recommended):** `https://mcp.figma.com/mcp` — OAuth-based, broadest feature set.
- **Desktop (local):** `http://127.0.0.1:3845/mcp` — requires the Figma desktop app in Dev Mode.

See: `https://developers.figma.com/docs/figma-mcp-server/`.

## Configuration (pre-wired, disabled)

```json
"figma": {
  "type": "remote",
  "url": "https://mcp.figma.com/mcp",
  "enabled": false
}
```

## Required credentials

- Figma account with a **Dev or Full seat** for the richest toolset.
- Authentication is via **Figma OAuth** (browser flow). No static token is stored.

## Enabling it

1. Confirm OpenCode is a supported MCP client. Figma currently restricts the remote
   server to clients listed in its MCP catalog (Claude Code, Codex, Cursor, VS Code,
   …). **If OpenCode is not listed, the remote server may refuse the connection** —
   in that case use the desktop server on `127.0.0.1:3845/mcp`.
2. Set `"enabled": true` in `opencode.json` (and, for desktop, change the `url`).
3. Restart OpenCode and complete the OAuth prompt.

## Verification

```bash
# Remote endpoint reachability:
curl -s -o /dev/null -w "%{http_code}\n" https://mcp.figma.com/mcp
# Desktop server (when Figma desktop + Dev Mode is running):
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3845/mcp
```

## Capabilities (when connected)

`get_screenshot`, `get_design_context`, `get_metadata`, `get_variable_defs`,
`get_code_connect_map`, and (remote, write-enabled) canvas generation/editing.

## Fallback (no Figma)

Use exported PNG/SVG frames committed under `design/references/` and analyze them
with the vision model (see `../VISION_MODEL.md`). The visual-first workflow in
`../../docs/VISUAL_DESIGN_WORKFLOW.md` does not depend on Figma.
