# Environment Report

Generated during bootstrap of the **Open WebUI fork** dev environment.

## Host

| Item | Value |
|---|---|
| OS | macOS 27.0.1 (build 26A434) |
| Architecture | arm64 (Apple Silicon) |
| Shell | `/bin/zsh` |
| RAM | 16 GB |
| Disk available | ~90 GB |
| Homebrew | 7.0.1 |

## Toolchain (verified)

| Tool | Version | Notes |
|---|---|---|
| git | 2.50.1 (Apple) | |
| gh (GitHub CLI) | 2.102.0 | Authenticated as `DarkyGuld` |
| Node.js | v22.23.3 | `brew node@22`; within repo's `>=18.13.0 <=22.x.x` |
| npm | 10.9.9 | |
| pnpm / bun | not installed | not required (repo uses npm) |
| Python (project) | 3.11.15 | uv-managed venv at `.venv`; matches Dockerfile |
| uv | 0.11.16 | venv + package management |
| Docker / Compose | not installed | repo default is Docker; running native instead |
| Google Chrome | 155.0.8059.80 | used by Playwright `channel: chrome` |
| Playwright | 1.64.1 + Chromium 156 | in `audit/` |
| Open WebUI (upstream ref) | 0.12.0 | uv tool, runs on :3001 |
| OpenCode | running | config `~/.config/opencode/opencode.jsonc`; model `opencode-go/deepseek-v4.1-flash` |

## Installed for this project

- `.venv` (Python 3.11) with `backend/requirements-slim.txt` + `pytest`/`pytest-asyncio`.
- `node_modules` (repo root) via `npm install`.
- `audit/node_modules` (`@playwright/test` 1.64.1); Chromium already cached.
- Upstream reference: `open-webui==0.12.0` (uv tool) for the three-way audit.

## Pre-existing MCP configuration

None before this phase. `opencode.json` now registers MCP servers (see `mcp/MCP_INVENTORY.md`).

## Constraints

- No Docker → native run (slim backend + Vite frontend). See `LOCAL_DEVELOPMENT.md`.
- `svelte-check` reports many errors in a fresh checkout (TypeScript 5.9 strictness across
  `checkJs` files); `vite build` is the effective gate and passes with an increased heap.
