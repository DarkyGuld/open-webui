# Storybook MCP

Status: **configured and enabled** in `opencode.json` (server name `storybook`).
The MCP endpoint is served by the `@storybook/addon-mcp` addon while the Storybook
dev server runs.

## What it is

`@storybook/addon-mcp` runs an MCP (streamable HTTP) server inside the Storybook dev
server. It exposes tools such as `get-storybook-story-instructions`,
`stories-find-by-component`, `stories-preview`, `docs-list`, `docs-show`, and
`test-run`, so an agent can inspect available components/stories **before creating
new ones**.

## Configuration (already applied)

Server (in `opencode.json`):

```json
"storybook": {
  "type": "remote",
  "url": "http://localhost:6006/mcp",
  "enabled": true
}
```

Addon (in `apps/web/.storybook/main.ts`):

```ts
addons: [ ..., '@storybook/addon-mcp' ]
```

## Requirements

- Storybook dev server running: `cd apps/web && npm run storybook` (port 6006).
- Node 20+ (here: v22.23.3).

## Verification

```bash
# Storybook must be running:
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:6006/          # 200
# The MCP endpoint is streamable-HTTP; use the MCP inspector to exercise it:
npx -y @modelcontextprotocol/inspector --transport http http://localhost:6006/mcp
```

> Note: a bare `curl GET /mcp` intentionally does not return immediately — the
> streamable-HTTP transport waits for an MCP initialize request.

## Fallback (if the MCP addon is unavailable/unstable)

1. Browse stories directly: open http://localhost:6006 and search in the sidebar.
2. Read generated docs (`index.json`, autodocs pages) from `storybook-static/`.
3. Search source components: `apps/web/src/components/*`.

These are also encoded in the `component-reuse` skill (`skills/component-reuse/SKILL.md`).
