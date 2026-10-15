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

## Reproduce

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
cd /Users/adrian/OpenUI/workspace/open-webui
./scripts/audit/start-local
NODE_OPTIONS=--max-old-space-size=8192 npm run build
npx vitest run --passWithNoTests
( cd audit && npx playwright test tests/smoke.spec.ts --project=local-desktop )
```
