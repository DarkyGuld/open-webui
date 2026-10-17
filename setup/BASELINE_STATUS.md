# Baseline Build & Test Status

Captured on the native macOS dev environment on branch `audit-and-design-foundation`
(base commit `bd495677a`, fork of Open WebUI 0.12.1).

Legend: ✅ pass · ⚠️ pass with caveats · ❌ fail · ⛔ not runnable here

## Results

| Check | Command | Result | Notes |
|---|---|---|---|
| Backend deps install | `uv pip install -r backend/requirements-slim.txt` | ✅ | Python 3.11; adds pytest/pytest-asyncio |
| Frontend deps install | `npm install` | ✅ | 54 npm advisories (pre-existing ranges) |
| Backend startup | `uvicorn open_webui.main:app` (slim) | ✅ | `/health` → `{"status":true}` |
| Frontend dev server | `npm run dev` | ✅ | http://localhost:5173 |
| Frontend production build | `NODE_OPTIONS=--max-old-space-size=8192 npm run build` | ⚠️ ✅ | Output → `build/`; **needs the larger heap** (default OOMs) |
| Frontend typecheck | `npm run check` (svelte-check) | ❌ | **5914 errors, 187 warnings** — see below |
| Frontend unit tests | `npx vitest run --passWithNoTests` | ✅ | 4 tests pass (`versionDiff.test.ts`) |
| Backend tests | `pytest` (backend) | ⛔ | No backend pytest suite present in this checkout (0 collected) |
| Playwright smoke (fork) | `audit/` → `playwright test` | ✅ | Fork UI renders, 0 console errors |
| Audit script syntax | `bash -n scripts/audit/*` | ✅ | All OK |
| Docker Compose | `docker compose config` | ⛔ | Docker not installed on this host |

## svelte-check detail

`npm run check` reports **5914 errors in 315 files** on a **pristine** checkout (no custom
commits). It is almost entirely TypeScript strictness across `allowJs` + `checkJs` files
(implicit `any`, possibly-null, unresolved store shapes) with the lockfile-pinned
TypeScript **5.9.3**. This is a **pre-existing property of the checkout/environment**, not
introduced here.

- Classification: **PRE-EXISTING**.
- Practical gate used instead: `vite build` (esbuild, no full typecheck) — passes.

## Fixes applied during setup

- Added `test.exclude` for `audit/**` in `vite.config.ts` so `vitest` does not try to run the
  Playwright spec (previously failed collection). Now `vitest` passes.
- Documented the required `NODE_OPTIONS=--max-old-space-size=8192` for `npm run build`.

## Classification

| Item | Classification |
|---|---|
| svelte-check 5914 errors | PRE-EXISTING (environment/TS strictness) |
| Build OOM at default heap | PRE-EXISTING (repo size); worked around, not a code bug |
| audit spec picked up by vitest | INTRODUCED then RESOLVED (added exclude) |
| Backend pytest absence | NOT APPLICABLE (no suite in this checkout) |

## Research-phase addendum (branch `intelligent-ui-research-foundation`)

- Installed spike engines `@openuidev/svelte-lang` 0.4.1, `@openuidev/lang-core` 0.4.1,
  `@json-render/core`+`@json-render/svelte` 0.21.1, `zod` 4.6.7 (branch `spike/intelligent-ui`;
  carried in `package.json`/lock).
- `vite.config.ts` gained a `test.exclude` for `audit/**` (fixes vitest picking up the
  Playwright spec — previously a FAILURE INTRODUCED then resolved).
- Playwright smoke: **passed**. One transient failure occurred while the dev server was
  recompiling after the new deps; it passed on immediate retry (not reproducible).
- No new build/test regressions. `svelte-check` error count unchanged (pre-existing).

### Milestone 1 (Intelligent UI gating) addendum

- `PYTHONPATH=backend pytest tests/intelligent_ui` → **22 passed** (precedence + no-op +
  API persistence). New `tests/` suite added.
- `vitest run` → **4 passed**.
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` → **green**.
- Playwright: 8 screenshots captured under `audit/local/intelligent-ui/milestone-1/`
  (admin toggle, user toggle off/on, chat Auto/On/Off, dark, mobile); user setting
  persisted after reload.
- Fixed a test-hygiene issue introduced by the research clones: `vite.config.ts`
  `test.exclude` now also excludes `research/**` (vitest was picking up 1379 tests from the
  cloned repos). Classified: INTRODUCED then RESOLVED.
- No core renderer/streaming files touched; OFF remains a true no-op.

### Milestone 2 (Intelligent UI renderer) addendum

- `vitest run` → **21 passed** (adapter 14, registry 3, existing versionDiff 4).
- `pytest tests/intelligent_ui` → **22 passed** (Milestone 1 contract intact).
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` → **green**.
- Playwright: 8 screenshots under `audit/local/intelligent-ui/milestone-2/`; metric /
  comparison / table render natively via the real colonFence pipeline; invalid payload →
  safe fallback; persisted reload renders identically; 0 page/console errors (excl. socket).
- Core files changed: **exactly one** (`MarkdownTokens.svelte`). New module
  `src/lib/intelligent-ui/`, fixtures, and tests are new files.

### Milestone 3 (generation/orchestration) addendum

- `pytest tests/intelligent_ui` → **31 passed** (adds M3 filter OFF/AUTO/ON, capability, passthrough).
- `vitest run` → **27 passed** (adds catalog drift test + 3 real model-generated outputs).
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` → **green**.
- `npx tsx scripts/intelligent-ui/generate-prompt.ts` → regenerates `catalog_prompt.py`
  (OpenUI `library.prompt()`, catalog_version 1).
- Playwright: 9 screenshots under `audit/local/intelligent-ui/milestone-3/`; real model output
  (comparison with hoisting) renders natively; fallback safe; 0 page/console errors (excl. socket).
- **No new upstream/core files touched** in M3. Filter installed as an Open WebUI Function.
- Provider: opencode gateway; model emitted valid `:::intelligent-ui` blocks (server log + captured
  fixtures). Latency high; only one provider family tested.

### Milestone 4 (interaction/state/output/i18n) addendum

- `pytest tests/intelligent_ui` → **36 passed** (adds structured-output outlet tests).
- `vitest run` → **45 passed** (adds actions 8, versioning 6, state 4).
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` → **green**.
- Playwright: 10 screenshots under `audit/local/intelligent-ui/milestone-4/`; selection, reload
  persistence, send_prompt, confirmation dialog, and fallback all verified; 0 page/console errors.
- Catalog bumped to **v2** (optional interaction fields; v1 still valid); prompt regenerated.
- Core edits: `structuredOutput.ts` (+5) + 4 i18n/label files. All else is new/our files.

### Milestone 5 (recursive native layout composition) addendum

- `vitest run` → **49 passed** (adds layout tests; catalog/registry updated to 10 components).
- `pytest tests/intelligent_ui` → **36 passed** (structured output now catalog_version 3).
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` → **green**.
- Playwright: 3 screenshots under `audit/local/intelligent-ui/milestone-5/`; recursive layout
  (Row→Badges, Grid→Cards→Metrics, Divider, Section→Table) renders natively; 0 errors.
- catalog_version **3**; limits nodes 120 / depth 6 / children 12.
- **No core files touched.** All changes are our own files + generated prompt + tests.

### Milestone 6 (logic/state layer from lang-core) addendum

- `vitest run` → **53 passed** (adds logic tests: state+expression, two-way binding + re-evaluate,
  ternary; catalog/registry updated to 15 components).
- `pytest tests/intelligent_ui` → **36 passed**.
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` → **green**.
- Playwright: 4 screenshots under `audit/local/intelligent-ui/milestone-6/`; live pricing
  calculator verified (`232` → slider 20 → `580`) with **no model call**; 0 errors.
- **No new dependencies; no core files touched.**

### Milestone 7 (incremental streaming) addendum

- `vitest run` → **56 passed** (adds `streaming.test.ts`).
- `pytest tests/intelligent_ui` → **36 passed**.
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` → **green**.
- Playwright: 4 screenshots under `audit/local/intelligent-ui/milestone-7/`; an **open** fence
  renders the partial tree (no raw OpenUI Lang leak); 0 errors.
- Core edits: `Markdown.svelte` (+2), `MarkdownTokens.svelte` (+8); new util
  `intelligent-ui-extension.ts`. Cumulative ~13 core files, ~160 lines.

### Milestone 8 (server fallback + @Each) addendum

- `vitest run` → **58 passed** (adds @Each expansion; versioning accepts fallback_markdown).
- `pytest tests/intelligent_ui` → **39 passed** (adds fallbackMarkdown tests).
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` → **green**.
- Playwright: 2 screenshots under `audit/local/intelligent-ui/milestone-8/`; `@Each` renders all
  items; 0 errors.
- **No new dependencies; no new core files.** Tool/Query bindings + `@Set`/`@Reset` prepared, not wired.

### Milestone 9 (AppBlock / rich widget) addendum

- `vitest run` → **58 passed**; `pytest tests/intelligent_ui` → **39 passed** (unchanged).
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` → **green**.
- Playwright: 4 screenshots under `audit/local/intelligent-ui/milestone-9/`; rich widget renders in
  the sandboxed iframe, counter increments, `sendPrompt` bridge sends a message; 0 errors.
- Core edits: `Markdown.svelte`, `MarkdownTokens.svelte`, `config.py`, `routers/chats.py`, `main.py`,
  `stores/index.ts`, `admin/Settings/Interface.svelte`, i18n. Opt-in flag default **OFF**.
  Cumulative ~18 core files, ~195 lines.

### Milestone 9.1 (rich widget control parity) addendum

- `pytest tests/intelligent_ui` → **46 passed** (adds rich-widget resolver + filter tests).
- `vitest run` → **58 passed**.
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` → **green**.
- Playwright: 4 screenshots under `audit/local/intelligent-ui/milestone-9.1/`; both chat controls
  visible (native + rich); historical rich widget renders, including when generation is disabled;
  0 errors.
- Rich widgets: global + user + chat gating; default global **OFF**; historical render preserved.
  Cumulative ~20 core files, ~235 lines.

### Milestone 9.2 (local declarative actions @Set/@Reset) addendum

- `vitest run` → **60 passed** (adds @Set/@Reset normalization; catalog/registry updated to 16 components).
- `pytest tests/intelligent_ui` → **46 passed**.
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` → **green**.
- Playwright: 3 screenshots under `audit/local/intelligent-ui/tool-bindings/`; pricing calculator
  `232 → 290 → 580 → 1450 → Reset 232`, 0 errors, no model call.
- **No new dependencies; no core files.** Phase B (Query/Mutation/tool bindings) deferred by design
  (see `QUERY_MUTATION.md`).

### Milestone 9.3 (Query / Mutation / tool bindings) addendum

- `vitest run` → **69 passed** (adds `query-mutation.test.ts`: allow-list, unknown-id rejection,
  normalization, row caps, backend-error propagation, confirm-risk).
- `pytest tests/intelligent_ui` → **46 passed**.
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` → **green**.
- Playwright: 10 screenshots under `audit/local/intelligent-ui/milestone-9.3/`; query success/empty/
  error verified, mutation confirmation → cancel (no POST) / confirm (POST) / denied (403, no crash),
  and **reload → no replay POST**. 1 expected console error (forced 403).
- **No new dependencies; no core files.** See `MILESTONE_9_3_REPORT.md`, `TOOL_BINDINGS_SECURITY.md`.

### Milestone 9.4 (native composition & component breadth) addendum

- `vitest run` → **104 passed** (adds `components-9_4.test.ts`, 35 tests; catalog/registry/versioning
  updated to 27 components, catalog_version 4).
- `pytest tests/intelligent_ui` → **46 passed** (catalog_version 4).
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` → **green**.
- Playwright: 13 screenshots under `audit/local/intelligent-ui/milestone-9.4/` (dashboard dark/light/
  mobile, tabs, chart, query-backed chart, progress, timeline, gallery, form, form confirmation,
  nested, invalid-limit fallback); **0 unexpected console errors**.
- `svelte-check`: only pre-existing errors (5931 across 319 files, unchanged baseline); the new
  components add no errors/warnings.
- **No new dependencies (chart.js reused); no core files.** Map deferred. See
  `MILESTONE_9_4_REPORT.md`, `NATIVE_COMPONENT_CATALOG.md`.

### Milestone 9.5 (visual & interaction polish) addendum

- `vitest run` → **121 passed** (adds `polish-9_5.test.ts`).
- `pytest tests/intelligent_ui` → **53 passed** (adds `test_prompt_m9_5.py`).
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build` → **green**.
- Playwright: **21 screenshots** under `audit/local/intelligent-ui/milestone-9.5/`
  (pricing dark/light/mobile, vps, dashboard dark/light/mobile, query loading/success/empty/error,
  form/confirmation/success, timeline, gallery, tabs-mobile, mixed response, streaming
  partial/complete, rich widget chrome); **0 unexpected console errors**.
- Catalog prompt trimmed **14 467 → 12 286 chars** (~−545 tokens/call). AUTO/ON guidance tuned.
- **No new dependencies; no core files.** See `MILESTONE_9_5_REPORT.md`, `PARITY_VISUAL_AUDIT.md`,
  `UX_GUIDELINES.md`.

### Milestone 9.7 (prompt hardening + capability benchmark v3) addendum

- Prompt hardening: `PROMPT` 12 286 → **12 719 chars** (+3.5%); AUTO header +37 chars. No broad
  rewrite. Tests: `vitest` **121 passed**, `pytest` **53 passed**, build **green**.
- New ~60-prompt capability dataset (`docs/intelligent-ui/routing-benchmark-v3/prompts.json`);
  cat-jam-free, 3 runs (180 calls, 0 generation errors): aggregate channel **77.2%** / family
  **73.3%**, invalid/fallback **2.2%**, rich over-use 1.7%; clear-intent subset channel **81.8%**.
- **Native JS leakage fixed to 0**; remaining 2 invalids are contract mismatches (Badge variant arg;
  empty Metric label). **v1 not yet complete; M10 still unnecessary.** See `ROUTING_BENCHMARK_V3.md`.
- **No new dependencies; no core files.** (Benchmark tooling + docs only.)

### Milestone 9.8 (targeted reliability hardening) addendum

- Badge `tone` contract + Metric non-empty-label guidance; guidance for Metric/Gallery/Mixed/
  Chart-Table/Timeline; native-first calculator rule; multilingual note. `PROMPT` 12 719 → **13 311
  chars (+4.65%)**; AUTO header +180; prompt frozen before the benchmark.
- Tuning set (32 prompts): baseline 50% → **67.7%** after one iteration (second reverted).
- v3 re-run (3 runs): channel **81.1%** (was 77.2%), family **78.9%**, invalid **0%**, clear subset
  **84.8%**. Holdout (33 prompts, 3 runs): channel **65.6%**, family **61.6%**.
- **99% target not reached**; cat-jam-free plateau ~81% (v3) / ~66% (holdout), model-capability
  limited. Tests: `vitest` **135 passed**, `pytest` **53 passed**, build **green**.
- **No new dependencies; no core files.** See `MILESTONE_9_8_REPORT.md`.

### Milestone 9.9 (strong-model ceiling benchmark) addendum

- Evaluation only; system frozen (PROMPT 13 311 chars, catalog_version 4; hashes in the report).
- **deepseek-v4.1-flash**, 3 runs × {v3 60, holdout 33} = 279 calls, 0 errors: v3 channel **91.7%** /
  family 90.6% / clear-intent **92.7%**, invalid 0.6%; holdout channel **82.8%** / family 80.8%,
  invalid 0%. Latency ~9.6 s (v3) / ~13.7 s (holdout) mean.
- **Level C**: architecture strong and model-bound (DeepSeek fixes the weak families); near-99% not
  reached; **v1 not declared complete; M10 unnecessary**.
- Tests: `vitest` **135 passed**, `pytest` **53 passed**, build **green**. See
  `MODEL_CEILING_DEEPSEEK_V4_1_FLASH.md`.

### Milestone 9.10 (deepseek targeted hardening) addendum

- **Metric `tone`** contract added (shared with Badge); native-first calculators / Gallery intent /
  multilingual / mixed guidance. `PROMPT` 13 311 → **13 836 chars (+3.9%)**. Frozen before the
  final benchmarks.
- Tuning 55.6% → **83.3%** (1 iteration). deepseek-v4.1-flash: v3 channel **92.8%** / family 90.0%;
  legacy holdout 83.8% / 82.8%; **NEW untouched holdout 82.1% / 79.8%** (clear-intent 87.8%);
  invalid 1.1–2.4% (all model errors); native calculators 100% native.
- **Level C; near-99% not reached; v1 NOT complete; M10 unnecessary.** Tests: `vitest` **144
  passed**, `pytest` **53 passed**, build **green**. See `MILESTONE_9_10_REPORT.md`.

### Milestone 9.11 (correctness & reliability) addendum — branch feat/intelligent-ui-m9-11-reliability (final)

- Baseline re-verified after the upstream 0.12.3 merge + lang-core **1.0.1** upgrade: 146 Vitest,
  53 pytest, prompt regen `git diff` clean, build green, 0 commits behind upstream main.
- **Fixed**: lifecycle-safe streaming runtime (one parser+store per block; user input survives
  chunks AND finalization); evaluation-contract fabrication false-positives (formatting-insensitive
  number matching); `Chart.svelte` + `engines/openui.ts` typing errors (intelligent-ui module now
  0 svelte-check errors); component-limit prompt rule (Table ≤ 50 rows; never-empty required
  values) kept **within the size guard** (PROMPT 13 982 chars, +19 vs M9.10).
- **New**: evaluation contract **v6 → v8** (final: sign-context numeric matching, authorized-source retrieval credit, REAL rich safety contract via rich-contract.ts, honest factCheck dimension) (`src/lib/intelligent-ui/evaluation.ts` + dataset 44 cases +
  runner); free-model pilot: cat-jam-free **90.9 %/90.9 %** under fair scoring (old sets scored it
  66–85 % by penalizing data-unavailability). Full deepseek runs pending cost approval.
- Final hardening: **contract v8** (sign-context numeric matching; authorized-source retrieval credit
  via the real allow-list; REAL rich safety contract extracted to `rich-contract.ts` and shared with
  the renderer; honest `factCheck` dimension), streaming lifecycle regressions, and a real-browser
  Playwright suite (deterministic, 31/31 checks, 0 console errors, incl. LIVE interaction during
  partial/streaming mode).
- Tests: `vitest` **175 passed** (+11 streaming-runtime, +18 evaluation-contract), `pytest` **53
  passed**, build **green**, prompt drift clean, CI green at the final PR HEAD. See `M9_11_STATUS.md`.

## Reproduce

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
cd /Users/adrian/OpenUI/workspace/open-webui
./scripts/audit/start-local
NODE_OPTIONS=--max-old-space-size=8192 npm run build
npx vitest run --passWithNoTests
( cd audit && npx playwright test tests/smoke.spec.ts --project=local-desktop )
```
