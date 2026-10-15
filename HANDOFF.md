# HANDOFF — Personal AI Workspace (customized Open WebUI)

**Read this first.** It is the source of truth for continuing this project on another machine.
For the ready-to-paste continuation prompt, see `docs/CONTINUE_ON_NEW_MACHINE.md`; for a fresh
machine, see `docs/FRESH_MACHINE_SETUP.md`.

## Project goal

A customized Open WebUI product aiming for:

> **"ChatGPT-quality functionality and UX expressed through Open WebUI's visual language."**

- ChatGPT = functional / interaction / information-architecture reference.
- Open WebUI = visual language, application shell, component foundation, compatibility baseline.
- Target: full ChatGPT parity across 14 modules (`docs/CHATGPT_PARITY_ROADMAP.md`).
- Flagship differentiator: **Intelligent UI** (optional, model-chosen rich presentation).

## Current status

| Milestone | Status | Summary |
|---|---|---|
| 1 — gating & settings | ✅ complete | global/user/chat/model toggles + resolver; OFF = stock no-op |
| 2 — native rendering | ✅ complete | `:::intelligent-ui` token, adapter, OpenUI engine, metric/comparison/table, fallback |
| 3 — generation/orchestration | ✅ complete | catalog prompt + Filter injection (Auto/On/Off); real model output validated |
| 4 — interaction/state/output/i18n | ✅ complete | safe actions + confirmation, durable local state, `output[]` artifacts, i18n |
| 5 — layout composition | ✅ complete | recursive native layouts (stack/row/grid/section/card/divider/badge); 10 components |
| 6 — logic/state layer | ✅ complete | lang-core runtime: `$state`, expressions, ternary, two-way binding; inputs; 15 components |
| 7 — incremental streaming | ✅ complete | open/closed fence tokenizer + `createStreamingParser`; progressive render; last-good tree |
| 8 — server fallback + @Each | ✅ complete | `fallbackMarkdown` in output items; `@Each` loops render (tool/Query bindings prepared) |
| 9 — AppBlock / rich widget | ✅ complete | opt-in `:::intelligent-ui-html` in the sandboxed iframe; theme vars + bridge; flagged, default off |
| 9.1 — rich widget control parity | ✅ complete | global + user + chat Auto/On/Off via the shared resolver; historical render preserved |
| 9.2 — local declarative actions | ✅ complete (Phase A) | `@Set`/`@Reset` via lang-core + `Button`; local state, no model call. Phase B (Query/Mutation) deferred — design in `QUERY_MUTATION.md` |

Reports: `docs/intelligent-ui/MILESTONE_1_REPORT.md`, `MILESTONE_2_REPORT.md`,
`MILESTONE_3_REPORT.md`, `MILESTONE_4_REPORT.md`. Actions: `ACTIONS.md`. Persistence:
`OUTPUT_PERSISTENCE.md`.

## Intelligent UI architecture (current path)

```
Open WebUI request
 → settings/gating  (config key intelligent_ui.enable + user.settings.ui.intelligentUi
                     + chat.params.intelligent_ui + model.meta.capabilities)
 → effective-mode resolver  (backend/open_webui/intelligent_ui/mode.py)
 → Filter inlet  (backend/open_webui/intelligent_ui/filter.py)
      OFF = identity no-op | AUTO/ON = prepend system message (generated catalog prompt)
 → model  (single pass; no planner/composer, no extra request)
 → response may contain:  :::intelligent-ui{v="1"} <OpenUI Lang> :::
 → MarkdownTokens.svelte  (existing colonFence token; ONE core dispatch edit)
 → IntelligentUIBlock.svelte
 → adapter.ts  (version check → optional envelope unwrap → engine.parse → Zod validation)
 → engines/openui.ts  (@openuidev/lang-core)
 → registry.ts → native Metric / Comparison / Table   (else IntelligentUIFallback)
 → interactions: action dispatcher (allow-list + risk) → confirmation (ConfirmDialog)
                  → send_prompt (input:prompt:submit) | durable local state (localStorage)
 → durable artifact: Filter outlet attaches message.output[] item {intelligent_ui, versioned}
```

Raw token is stored verbatim in the normal `message.content` (no DB change); reload re-renders
identically; the engine is not persisted.

## Engines

- **Primary: `@openuidev/lang-core`** — streaming-first OpenUI Lang parser + catalog/prompt API;
  framework-agnostic; MIT. We deliberately do **not** use `@openuidev/svelte-lang` (it trails the
  current OpenUI Lang).
- **Fallback: json-render** (`engines/json-render.ts`) — same adapter interface, not executed on the
  normal path. Lets us swap engines without touching chat rendering.

## Supported components (allow-list)

`metric`, `comparison`, `table` — nothing else. catalog_version = 1.

## Important design decisions

- Native Open WebUI styling only; no external visual layer.
- No arbitrary HTML/JS/CSS/URLs; strict Zod allow-list; safe Markdown fallback.
- Adapter boundary: only the adapter imports an engine package.
- Minimal upstream changes (~9 core files, ~120 lines total across M1–M3).
- **OFF = byte-for-byte stock Open WebUI** (proven by tests).
- Versioned transport (`v="1"`) + versioned catalog (`catalog_version = 1`).
- The Intelligent UI Filter is an Open WebUI **Function** (installed, not core-bundled).

## Current limitations

- Only one provider family validated (opencode gateway); latency high.
- Single root component; no layout nesting; plain-text cells.
- Structured `output[]` artifacts are stored but rendering still uses `content` (equivalent; the
  "prefer output[]" render path is deferred — the block cannot see the parent message).
- Interaction state is browser-local (`localStorage`), not server-synced across devices.
- `tool` actions architected but not exposed; i18n covers en-US + nb-NO (others fall back).
- Filter must be installed/enabled manually (documented in `docs/FRESH_MACHINE_SETUP.md`).

## Important files

| Concern | Path |
|---|---|
| Settings (global) | `backend/open_webui/config.py`, `backend/open_webui/routers/chats.py`, `backend/open_webui/main.py` |
| Settings (user) | `backend/open_webui/models/users.py`, `src/lib/components/common/InterfaceSettings.svelte` |
| Admin UI | `src/lib/components/admin/Settings/Interface.svelte` |
| Chat control | `src/lib/components/chat/Controls/Controls.svelte` |
| Mode resolver | `backend/open_webui/intelligent_ui/mode.py` |
| Filter | `backend/open_webui/intelligent_ui/filter.py` |
| Catalog prompt (generated) | `backend/open_webui/intelligent_ui/catalog_prompt.py` |
| Prompt generator | `scripts/intelligent-ui/generate-prompt.ts` |
| Catalog (single source) | `src/lib/intelligent-ui/catalog.ts` |
| Adapter | `src/lib/intelligent-ui/adapter.ts` |
| OpenUI engine | `src/lib/intelligent-ui/engines/openui.ts` |
| json-render engine | `src/lib/intelligent-ui/engines/json-render.ts` |
| Schema / limits | `src/lib/intelligent-ui/schema.ts`, `src/lib/intelligent-ui/limits.ts` |
| Registry | `src/lib/intelligent-ui/registry.ts` |
| Renderer + components | `src/lib/intelligent-ui/components/{IntelligentUIBlock,Metric,Comparison,Table,IntelligentUIFallback}.svelte` |
| Markdown hook (core edit) | `src/lib/components/chat/Messages/Markdown/MarkdownTokens.svelte` |
| Tests | `tests/intelligent_ui/*`, `src/lib/intelligent-ui/__tests__/*`, `tests/fixtures/intelligent-ui/*` |

## Tests

```bash
# Backend (needs PYTHONPATH=backend)
PYTHONPATH=backend .venv/bin/python -m pytest tests/intelligent_ui -q      # 31 passed

# Frontend
npx vitest run --reporter=dot                                            # 27 passed

# Build
NODE_OPTIONS=--max-old-space-size=8192 npm run build                     # green

# Playwright (needs app running)
( cd audit && npx playwright test tests/smoke.spec.ts --project=local-desktop )
```

Latest results recorded in `setup/BASELINE_STATUS.md`.

## Local startup

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
./scripts/audit/start-local     # backend :8080, frontend :5173, upstream ref :3001
./scripts/audit/stop-local
```
URLs: frontend http://localhost:5173 · backend http://127.0.0.1:8080 · upstream Open WebUI
http://127.0.0.1:3001. See `setup/LOCAL_DEVELOPMENT.md`.

## Required services

- Backend (FastAPI/uvicorn) — native or Docker.
- Frontend (SvelteKit/Vite).
- A model provider (OpenAI-compatible; this environment uses the opencode gateway with
  `x-opencode-session: {{CHAT_ID}}` configured on the connection).
- Docker is optional here (native dev is used); the repo's default deployment is Docker Compose.

## MCP setup

| MCP | Status | Mandatory? |
|---|---|---|
| GitHub | configured (`GITHUB_TOKEN` needed) | optional |
| Playwright | enabled | recommended |
| Chrome DevTools | enabled | optional |
| Storybook | configured (needs Storybook running; not set up for SvelteKit yet) | optional |
| Figma | disabled (OAuth) | optional |
| context7 | disabled | optional |

Details: `setup/mcp/MCP_INVENTORY.md`. Restart OpenCode after editing `opencode.json`.

## Secrets (environment variable NAMES only)

`WEBUI_SECRET_KEY`, `ENABLE_INTELLIGENT_UI`, `ENABLE_SIGNUP`, `USE_SLIM_DOCKER`, `DATA_DIR`,
`CORS_ALLOW_ORIGIN`, `OPENAI_API_BASE_URLS`, `OPENAI_API_KEYS`, `OPENAI_API_CONFIGS`,
`SCARF_NO_ANALYTICS`, `DO_NOT_TRACK`, `ANONYMIZED_TELEMETRY`, `ENABLE_VERSION_UPDATE_CHECK`,
`OPENUI_TELEMETRY_DISABLED`, `GITHUB_TOKEN`, `PAW_TEST_EMAIL`, `PAW_TEST_PASSWORD`.

Never commit values. `.env`, `backend/data/`, `.local/`, browser profiles, and `research/` are
gitignored.

## Next recommended milestone (Milestone 10 / remaining work)

1. **M10 planner/router** — only if one-pass routing proves insufficient (a Filter planner that picks
   text vs UI and filters tools).
2. **`Query`/`Mutation` tool bindings** (server data) and **`@Set`/`@Reset`** → store.
3. **Remaining M5 component families** — tabs, charts, media (native, existing repo libs).
4. **Per-user/per-chat flag for rich widgets**; `openLink` bridge.
5. Visual regression baselines; i18n for remaining locales; package the Filter for one-command install.

**Requirement:** do NOT implement a parallel engine if lang-core already provides the primitive —
wrap and expose the existing runtime.

Do **not** re-research or redesign the existing architecture unless tests/source show it is broken.
See `docs/intelligent-ui/CHATGPT_PARITY_PLAN.md`.
