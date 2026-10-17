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
| 9.2 — local declarative actions | ✅ complete (Phase A) | `@Set`/`@Reset` via lang-core + `Button`; local state, no model call |
| 9.3 — query/mutation tool bindings | ✅ complete | allow-listed read-only query registry + confirm-risk mutation registry; `Data` component; native confirmation; replay-proof; no core changes, no new deps. See `MILESTONE_9_3_REPORT.md` |
| 9.4 — native composition & breadth | ✅ complete | Tabs, Chart (chart.js), Progress, Timeline, Gallery, Textarea, Radio, Field, Form; recursive nesting; catalog_version 4; map deferred. See `MILESTONE_9_4_REPORT.md`, `NATIVE_COMPONENT_CATALOG.md` |
| 9.5 — visual & interaction polish | ✅ complete | spacing/density/hierarchy, tables/charts/tabs/forms, standardized query states, mutation toasts, fallback reword, prompt trimmed ~15%, AUTO tuned. See `MILESTONE_9_5_REPORT.md`, `PARITY_VISUAL_AUDIT.md`, `UX_GUIDELINES.md` |
| 9.6 — routing benchmark v2 | ✅ complete (eval only) | cat-jam-free mean channel accuracy 82.7% (range 78–88%), invalid/fallback ≤2%, latency −25%, prompt −13%; failures conservative under-use; **M10 not justified**. See `ROUTING_BENCHMARK_V2.md` |
| 9.7 — prompt hardening + capability benchmark v3 | ✅ complete (eval only) | Metric/Comparison triggers + no-JS rule (prompt +3.5%); new ~60-prompt dataset; cat-jam-free aggregate channel 77.2%/family 73.3% (clear subset 81.8%), invalid/fallback 2.2%, native JS leakage 0, rich over-use 1.7%; **v1 not yet complete; M10 still unnecessary**. See `ROUTING_BENCHMARK_V3.md` |
| 9.8 — targeted reliability hardening | ✅ complete (eval + guidance) | Badge tone + Metric-label contract; Metric/Gallery/Mixed/Chart-Table/Timeline guidance + native-first + multilingual (PROMPT +4.65%); v3 re-run channel **81.1%**/family 78.9%/invalid 0%, holdout **65.6%**/61.6%; **99% target not reached (cheap-model plateau ~66–85%)**; M10 unnecessary. See `MILESTONE_9_8_REPORT.md` |
| 9.9 — strong-model ceiling benchmark | ✅ complete (eval only) | deepseek-v4.1-flash, frozen system, 279 calls: v3 channel **91.7%**/family 90.6%/clear 92.7%, holdout **82.8%**/80.8%, invalid 0.6%; **Level C — architecture strong, model-bound; near-99% not reached; v1 NOT declared complete; M10 unnecessary**. See `MODEL_CEILING_DEEPSEEK_V4_1_FLASH.md` |
| 9.10 — deepseek targeted hardening | ✅ complete (contract + guidance + eval) | **Metric tone** contract (shared with Badge); native-first calculators / Gallery intent / multilingual / mixed guidance (PROMPT +3.9%); deepseek v3 channel **92.8%**/family 90.0%, legacy holdout 83.8%/82.8%, **NEW holdout 82.1%/79.8% (clear 87.8%)**; invalid 1.1–2.4% (model errors); **Level C — near-99% not reached; v1 NOT complete; M10 unnecessary**. See `MILESTONE_9_10_REPORT.md` |

Reports: `docs/intelligent-ui/MILESTONE_1_REPORT.md` … `MILESTONE_9_10_REPORT.md` (see each row),
plus benchmarks `ROUTING_BENCHMARK_V2.md`, `ROUTING_BENCHMARK_V3.md`,
`MODEL_CEILING_DEEPSEEK_V4_1_FLASH.md`, and design docs `NATIVE_COMPONENT_CATALOG.md`,
`UX_GUIDELINES.md`, `PARITY_VISUAL_AUDIT.md`. Actions: `ACTIONS.md`. Persistence:
`OUTPUT_PERSISTENCE.md`.

Milestone tags: `intelligent-ui-m3` … `intelligent-ui-m9.10`. Latest: `intelligent-ui-m9.10`. Each
milestone's report carries its own SHAs.

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
 → registry.ts → 27 native components (layout/tabs/charts/timeline/gallery/forms/…)
                 rendered by NodeRenderer.svelte   (else IntelligentUIFallback)
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

27 components, **catalog_version = 4** (v1–v3 items still render). Full list + signatures + nesting
rules: `docs/intelligent-ui/NATIVE_COMPONENT_CATALOG.md`. Leaves: Data, Metric, Comparison, Table,
Badge, Divider, Button, Slider, Select, Switch, Checkbox, Input, Textarea, Radio, Progress, Chart,
Timeline, Gallery. Containers: Stack, Row, Grid, Section, Card, Tabs/Tab, Field, Form. No arbitrary
HTML/CSS/JS/URLs; Rich Widget is the separate opt-in `:::intelligent-ui-html` sandbox.

## Important design decisions

- Native Open WebUI styling only; no external visual layer.
- No arbitrary HTML/JS/CSS/URLs; strict Zod allow-list; safe Markdown fallback.
- Adapter boundary: only the adapter imports an engine package.
- Minimal upstream changes (~20 core files, ~235 lines total across M1–M9.10; see
  `docs/intelligent-ui/UPSTREAM_IMPACT.md`).
- **OFF = byte-for-byte stock Open WebUI** (proven by tests).
- Versioned transport (`v="1"`) + versioned catalog (`catalog_version = 4`).
- The Intelligent UI Filter is an Open WebUI **Function** (installed, not core-bundled).

## Current limitations

- Routing quality is **model-dependent**: deepseek-v4.1-flash reaches v3 channel 92.8% / new-holdout
  82.1%; cat-jam-free plateaus ~66–85%. Not yet near-99% (Level C).
- **Gallery** requires safe image refs (none available in benchmarks); the model declines with a
  textual explanation. **Map** deferred (remote tiles).
- Remaining misses: conservative under-use, occasional over-use on prose, limit-exceeding invalids
  (Table >50 rows, empty Gallery `src`), Norwegian ~7 pp below English.
- Structured `output[]` artifacts are stored but rendering still uses `content` (equivalent; the
  "prefer output[]" render path is deferred — the block cannot see the parent message).
- Interaction state is browser-local (`localStorage`), not server-synced across devices; tab
  selection is local.
- i18n covers en-US + nb-NO (others fall back).
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
| Renderer + components | `src/lib/intelligent-ui/components/{IntelligentUIBlock,NodeRenderer,QueryState,Metric,Comparison,Table,Chart,Timeline,Gallery,Form*,…}.svelte` |
| Queries / mutations / tone | `src/lib/intelligent-ui/{queries,mutations,query-binding,table-utils,tone}.ts` |
| Benchmarks | `audit/lib/routing-benchmark-v4.mts`, `docs/intelligent-ui/routing-benchmark-v3|v4|v5/` |
| Markdown hook (core edit) | `src/lib/components/chat/Messages/Markdown/MarkdownTokens.svelte` |
| Tests | `tests/intelligent_ui/*`, `src/lib/intelligent-ui/__tests__/*`, `tests/fixtures/intelligent-ui/*` |

## Tests

```bash
# Backend (run from backend/)
../.venv/bin/python -m pytest ../tests/intelligent_ui -q                 # 53 passed

# Frontend
npx vitest run --passWithNoTests                                         # 144 passed

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

## Next recommended milestone

The architecture is **stable and model-bound**; the cheap-model plateau and the strong-model ceiling
are both measured. **M10 planner is NOT justified** (failures are conservative/model/data, not
structural). Next work is **small targeted prompt/contract fixes** only:

1. Prompt: respect component limits (Table ≤ 50 rows) and never emit empty `Gallery` `src`.
2. Prompt: reduce over-use on purely explanatory prompts; reinforce rich-under-use for bespoke
   canvas/3D; reinforce Norwegian compare/table cues.
3. Optional: re-run the frozen M9.10 benchmark after those fixes; only reconsider M10 if clear-intent
   routing becomes *harmful* (over-use/invalid), not merely conservative.

**Requirement:** do NOT implement a parallel engine if lang-core already provides the primitive —
wrap and expose the existing runtime.

Do **not** re-research or redesign the existing architecture unless tests/source show it is broken.
See `docs/intelligent-ui/CHATGPT_PARITY_PLAN.md` and `docs/intelligent-ui/RECOMMENDATION.md`.
