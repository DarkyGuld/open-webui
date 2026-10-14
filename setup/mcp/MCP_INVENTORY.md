# MCP Inventory

OpenCode supports MCP servers natively via the `mcp` block in `opencode.json`
(`type: "local"` for stdio commands, `type: "remote"` for HTTP/SSE endpoints).
The project config lives at the repository root: `opencode.json`.

**After editing this file or `opencode.json`, quit and restart OpenCode** — config
is loaded once at startup and is not hot-reloaded.

| Server | Type | Enabled | Purpose | Credentials | Value | Mandatory? |
|---|---|---|---|---|---|---|
| `playwright` | local (`npx -y @playwright/mcp@latest`) | ✅ yes | Drive/inspect a browser for UI auditing (DOM, snapshots, navigation) | none | High — complements the `audit/` Playwright harness | Optional |
| `chrome-devtools` | local (`npx -y chrome-devtools-mcp@latest`) | ✅ yes | Live DOM/CSS/console/network/performance inspection | none | High — core UI-debugging capability | Optional |
| `github` | remote (`https://api.githubcopilot.com/mcp/`) | ✅ yes | Inspect upstream Open WebUI (commits/issues/PRs), compare forks | `GITHUB_TOKEN` (`{env:GITHUB_TOKEN}`) | Medium | Optional |
| `figma` | remote (`https://mcp.figma.com/mcp`) | ⛔ disabled | Design source-of-truth / handoff (later phases) | Figma OAuth | Medium-later | Optional |
| `storybook` | remote (`http://localhost:6006/mcp`) | ⛔ disabled | Component/story inspection for reuse before creation | none (needs Storybook running) | Medium once Storybook exists | Optional |
| `context7` | local (`npx -y @upstash/context7-mcp`) | ⛔ disabled | Framework/library docs (React, Vite, Tailwind) | none | Low | Optional |

## Rationale

Per the project's "avoid adding MCP servers merely because they exist" rule, only
two low-risk, credential-free servers are enabled by default (`playwright`,
`chrome-devtools`). `github` is enabled because the next phase needs upstream Open
WebUI inspection and the GitHub CLI is already authenticated. `figma`, `storybook`
and `context7` are pre-wired but disabled until they are actually needed.

## Verification

```bash
# Local servers launch on demand; verify Node/npm are reachable and the config is valid JSON:
python3 -m json.tool opencode.json > /dev/null && echo "opencode.json OK"

# GitHub token for the remote server:
export GITHUB_TOKEN="$(gh auth token)"
```

Individual setup notes: `FIGMA.md`, `STORYBOOK.md`, `CHROME_DEVTOOLS.md`, `GITHUB.md`.
