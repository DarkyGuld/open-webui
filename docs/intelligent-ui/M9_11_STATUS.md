# M9.11 Status — correctness & reliability (branch `feat/intelligent-ui-m9-11-reliability`)

Baseline verified on this branch: Open WebUI **0.12.3**, `@openuidev/lang-core` **1.0.1** (pinned),
upstream main **merged (d7f15e778, 0 commits behind)**, 146 Vitest + 53 pytest passing, generated
catalog prompt in sync (`git diff` clean), production build green.

## What M9.11 verified and fixed

### Verified problems (found by audit, fixed + regression-tested)

1. **Streaming runtime was not lifecycle-safe** (highest-priority correctness issue).
   `parseOpenUIPartial` created a NEW `StreamParser` + `Store` on every streamed chunk:
   - the whole program was re-parsed per chunk;
   - user input during streaming (sliders/inputs) was silently ignored (`handleBind` no-oped —
     `runtime` is undefined while partial) and therefore lost;
   - the partial → complete transition created a fresh store from declared defaults, dropping any
     user state.
   **Fix**: a persistent partial runtime — ONE parser + ONE store per streaming block
   (`createOpenUIPartialRuntime`), fed via `StreamParser.set()` (delta-diffing, auto-reset on
   replaced text); declarations re-synced with `store.initialize(decls, touchedValues)` (untouched
   declarations refresh to revised model defaults; user-touched values survive); live
   `setState`/`resetState`/`refresh` during streaming; `touchedValues()` seeds the final
   (`complete`) runtime so input survives finalization. `IntelligentUIBlock` routes
   binding/`@Set`/`@Reset` through it while partial and disposes it on completion/destroy.
2. **False "fabrication" verdicts in evaluation** — my own number-matching heuristic flagged
   thousands-separated values (`120 000` vs provided `120000`) as fabricated. Fixed
   (formatting-insensitive matching incl. decimal comma) + unit tests.
3. **`Chart.svelte` typing error** (`this.getLabelForValue` untyped in the ticks callback) and the
   long-standing `button`-case type error in `engines/openui.ts` — both fixed; the intelligent-ui
   module now has **zero svelte-check errors** (only two pre-existing warnings remain).
4. **No component-limit guidance in the prompt** — the measured M9.10 invalid cause (Table > 50
   rows, 3/3 runs) had no corresponding guidance. Added a concise rule ("a Table holds at most 50
   rows and 12 columns…; never leave a required value empty"), kept the prompt **within the
   existing size guard** (13 963 → **13 982 chars**, +19) by trimming wording elsewhere.

### Verified as already correct (no changes made)

- **OpenUI 1.0.1 compatibility**: `createParser`/`createStreamingParser(schema, rootName?)`,
  `Store.initialize(defaults, persisted)` + `pristine`, `evaluateElementProps`, `isReactiveAssign`
  all match our usage; historical (tone-less, pre-1.0.1) programs still parse (tested).
- **Navigation hardening** (`safeNavigationUrl`: HTTP/HTTPS only, no userinfo/control chars;
  confirm + `noopener,noreferrer`) — landed post-M9.10, with tests.
- **Rich Widget sandbox** (no forms/downloads/fullscreen; `allow-scripts` without `allow-same-origin`;
  strict CSP) — verified.
- **Generation correctness**: prompt has no fictitious `Root(...)`, is grounded (never invent
  values; ask when data are missing), no JS-method leakage.
- **No duplicate rendering**: one fence → one `intelligentUi` token → one render; `output[]`
  items are stored but rendering intentionally still uses `content` (documented; no DB migration).

## Current-state audit matrix (Intelligent UI)

| Capability | Status | Evidence |
|---|---|---|
| Native components (27, catalog v4) | COMPLETE | 164 Vitest + 53 pytest; M9.4–M9.10 captures |
| Parser/runtime (lang-core 1.0.1) | COMPLETE | compat audited + regression tests |
| Streaming (partial→complete) | **FIXED this milestone** | 8 new tests (state retention, finalization carry-over) |
| State ($state, bindings, @Set/@Reset) | COMPLETE (+ streaming now stateful) | logic + streaming-runtime tests |
| Durable output (`output[]` items) | PARTIAL — stored, not yet the render path | outlet tests; documented deferral |
| Query/Mutation (allow-listed) | COMPLETE | registry + e2e M9.3 captures |
| Actions/security (URL scheme, sandbox) | COMPLETE | navigation-security tests; audit |
| Fallback / OFF mode | COMPLETE | adapter tests; OFF = stock no-op |
| Routing quality | PARTIAL — model-bound | v5: deepseek v3 92.8% / new-holdout 82.1% |
| Evaluation methodology | **REBUILT this milestone (contract v6)** | pilot: cat-jam-free 90.9% under fair scoring |
| Map / external media | MISSING (deferred by design) | M9.4 report |

## Evaluation contract v6 → v7 → v8 (methodology repair + review hardening)

`src/lib/intelligent-ui/evaluation.ts` (pure, versioned, shared by runner + Vitest). After the PR #1
review rounds, the contract was hardened twice:

**v7** — all supplied values required (was `.some()`); whole-token numeric matching (no substring
false positives; thousands separators, decimal commas, comma-separated OpenUI arrays); unavailable
data never credits invented native UI; invented image refs detected even with nothing provided;
Rich presence alone no longer passes; `overallOk` first-class.

**v8 (final hardening)** — closes the v7 gaps found in adversarial review:
- **Sign-context numeric matching**: a leading `-` after a digit is a range/minus dash (unsigned);
  after anything else it is a sign — a supplied negative never matches a positive token and vice
  versa (v7 accepted both), while `50000-500500` ranges and `values:[-0.16,-0.05]` negative arrays
  keep working.
- **Authorized retrieval credit**: a Query component alone is not enough — every emitted query
  `source` id must be on the REAL allow-list (`queries.ts` QUERY_IDS). Credit is a retrieval PATH
  (the load executes at render, browser-verified); invented source ids are `fabricated-ui`.
- **Rich validation uses the REAL production safety contract** (`rich-contract.ts`, shared with
  `RichWidget.svelte` — CSP + sandbox flags are a single source of truth): forms / popups /
  downloads / network / `javascript:` URIs are all blocked by the actual sandbox+CSP, so widgets
  needing them are `invalid-rich`. Static validation cannot prove execution — that is a separate
  browser-verified step.
- **`factCheck` is an explicit, separately reported dimension** (`verified` / `unverified`):
  computation arithmetic, model-known facts and retrieved content are honestly labeled
  `unverified` — numeric token matching is never presented as proof of factual correctness
  (`factUnverifiedRate` reported; v8 pilot: 75 % honestly unverified).

Dataset: `docs/intelligent-ui/routing-benchmark-v6/prompts.json` (44 cases, EN+NO; two prompts with
unrealistic data assumptions fixed in v7). Historical v1–v5 results are untouched; the original
v6- and v7-contract pilots are preserved as `pilot-contract-v6*.json` / `pilot-contract-v7*.json`.

**Pilots (free model, 1 run each):** v6 84.1 % overall → v7 90.9 % (channel 90.9 %, fabrication
0 %) → **v8 86.4 % overall / 86.4 % channel, fabrication 0 %, invalid 0 %, invalid-rich 0 %** —
the v8 drop vs v7 is run-to-run variance on the free model (all 6 v8 misses are genuine model
routing misses: markdown under-use, rich over-use, prose over-use — none are contract artifacts).
Full 3× deepseek-v4.1-flash runs are **pending cost estimate + approval** (not run here).

## Browser verification (real app, Playwright — `audit/lib/milestone9_11-browser.mjs`)

31/31 checks passed, **0 console errors**, deterministic (seeded chats, no model calls):
native Metric/Comparison rendering; complete-runtime calculator (live derived update, `@Set`,
`@Reset`, keyboard ArrowRight on the slider); **live interaction during PARTIAL/streaming mode
(the new capability — slider drag updates the derived metric mid-stream, `@Set` works mid-stream)**;
invalid program → safe fallback; unknown query source → error state; mutation
confirmation → cancel (no POST) → confirm (POST) → **reload (no replay POST)**; Rich iframe
renders with sandbox blocking same-origin/forms/downloads (interactive inside the sandbox);
mixed response (prose + UI + prose); cross-chat state isolation; reload of completed conversations;
global OFF flag (documented design: generation gated server-side, persisted fences still render —
no data loss); light theme + mobile viewport. Screenshots in
`audit/local/intelligent-ui/milestone-9.11/`.

## Test results (this branch)

- **Vitest: 175 passed** (146 baseline + 11 streaming-runtime incl. lifecycle regressions + 18
  evaluation-contract v8 incl. adversarial old-vs-new demos)
- **pytest (intelligent_ui): 53 passed**
- **Production build: green**
- **svelte-check: intelligent-ui module has 0 errors** (2 pre-existing warnings; repo-wide
  pre-existing baseline otherwise unchanged — 5 713 errors in 316 files, all outside our module)
- **Playwright (real app): 31/31 checks passed, 0 console errors** — see "Browser verification"
  above and `audit/lib/milestone9_11-browser.mjs` (deterministic; no model calls). The M9.5 capture
  suite remains the broader visual baseline.

## P0 — correctness, security, data integrity (next)

1. Run the v6 contract benchmark 3× with deepseek-v4.1-flash (after cost estimate + approval) and
   freeze a v6 holdout.
2. Server-side durable interaction state (currently browser-local `localStorage` only).
3. Decide the authoritative `output[]` render path (or formally retire it) — currently stored but
   unused for rendering.
4. Norwegian routing gap (~7 pp below English on v5) — one more grounded prompt pass.

## P1 — user-visible quality

1. Gallery: real integration with the user's file library (valid safe refs) so "show my images"
   becomes executable, not just ask-for-data.
2. Prompt: reduce residual prose over-use (TCP/UDP-style) — grounded phrasing only.
3. Live-region/ARIA audit of streamed partial UI updates.

## P2 — broader ChatGPT parity (use existing Open WebUI features first)

Unified Library/Projects/Artifacts surfaces over the existing Notes/Files/Knowledge models;
Deep Research/Work/Agents leverage existing Open WebUI capabilities rather than new engines;
Connectors/MCP via the existing Tools/Functions framework. No duplication of native features.

## Next recommended milestone

**M9.12 — v6 benchmark under deepseek-v4.1-flash (3 runs + frozen holdout) + server-side durable
state design.** Small, evidence-driven; no planner (M10 remains unjustified — failures are
conservative/data-bound, never harmful).
