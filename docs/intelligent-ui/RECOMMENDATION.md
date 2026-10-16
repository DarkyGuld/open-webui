# Intelligent UI — Recommendation

## DECISION (locked for MVP)

| Decision | Choice |
|---|---|
| **Engine** | **OpenUI `@openuidev/lang-core`** (v1.x, framework-agnostic) behind **our own thin Svelte renderer adapter**. Fallback engine: `@json-render/*` behind the same interface. Do **not** ship `@openuidev/svelte-lang` (stale at OpenUI Lang 0.5). |
| **Trigger/transport** | New marked token `:::intelligent-ui{v=1}` — smallest diff (2 core edits), streaming-safe, works inside the normal response. |
| **Gating/planning** | A **Filter (inlet)** with valves; tri-state **Auto | On | Off** at chat level + global/user/model toggles. |
| **Schema** | OpenUI Lang, small allow-list (text, markdown, stack, card, metric, table, comparison, chart, form, button) with **Zod + strict validation + limits**; unknown → drop; failure → **Markdown fallback**. |
| **Safety** | Allow-list only, **no arbitrary HTML/JS**, action/URL allow-lists, size/depth/node limits, telemetry disabled. |
| **First scope** | **3 components only: `metric`, `comparison`, `table`.** No arbitrary HTML. |
| **Default** | OFF/Auto. **OFF = byte-for-byte stock Open WebUI** (prove with a test). |

Why OpenUI over json-render: streaming-first, best token efficiency (−52.8% vs JSON-Render benchmark), prompt generated from our catalog constrains the model to native components, MIT, very active. json-render (official Svelte 5 renderer) is the pragmatic fallback if we hit friction; the adapter makes the swap cheap.



## Implemented gating architecture (Milestone 1)

Verified and shipped as gating infrastructure only:

| Scope | Storage | Default |
|---|---|---|
| **Global (admin)** | config key `intelligent_ui.enable` (per-key `config` table), edited via Admin → Interface, exposed as `features.enable_intelligent_ui` in `GET /api/config` | **OFF** |
| **User** | `user.settings.ui.intelligentUi` (typed `InterfaceSettings`), edited in Settings → Interface | OFF |
| **Chat** | `chat.params.intelligent_ui` ∈ `auto|on|off` (free JSON, no migration), edited in the chat Controls panel | AUTO (when global+user on) |
| **Model** | `model.meta.capabilities.intelligent_ui` (free dict; absent = supported, explicit `false` = unsupported) | supported |

**Effective-mode resolver (single source of truth):**
`backend/open_webui/intelligent_ui/mode.py` → `resolve_intelligent_ui_mode(...)` /
`resolve_effective_mode(...)` / `load_effective_mode(...)`. Nothing else re-implements the
precedence. See `MILESTONE_1_REPORT.md` for the proven rules.

**Filter skeleton:** `backend/open_webui/intelligent_ui/filter.py` — `inlet`/`outlet`/`stream`
return their input **unchanged** regardless of mode (Milestone 1). It will host the planner
in Milestone 2.

## Implemented generation layer (Milestone 3)

- **Catalog:** `src/lib/intelligent-ui/catalog.ts` (single source of truth, `catalog_version = 1`);
  frontend node schemas are derived from it; the server prompt is generated from it via OpenUI's
  `library.prompt()` (`scripts/intelligent-ui/generate-prompt.ts` → `catalog_prompt.py`).
- **Filter:** `backend/open_webui/intelligent_ui/filter.py` — OFF = identity no-op; AUTO/ON prepend
  one system message with mode-appropriate instructions + the generated catalog prompt. No planner,
  no extra model call.
- **Capability:** `intelligent_ui_generate` (default supported) gates instruction injection;
  `intelligent_ui_render` (default true) is a render opt-out. Rendering is model-independent.
- **Validated:** real model output (comparison/metric/table, incl. hoisted references) parses and
  renders natively; adversarial/malformed output falls back safely.

## Implemented interaction layer (Milestone 4)

- **Actions:** centralized dispatcher (`src/lib/intelligent-ui/actions.ts`) — allow-list
  (`send_prompt`, `select`, `toggle`, `set_value`, `confirm`), risk levels, validation. No
  arbitrary code. See `ACTIONS.md`.
- **State:** durable selection/values in `localStorage` keyed by chat+block (survives reload);
  ephemeral state not persisted.
- **Confirmation:** native `ConfirmDialog` for `confirm`-risk actions.
- **Durable output:** Filter `outlet` attaches versioned `intelligent_ui` items to `message.output[]`
  (stable id, `output_schema_version`, `catalog_version`, engine-agnostic `format`). See
  `OUTPUT_PERSISTENCE.md`.
- **i18n:** all feature strings via `$i18n.t(...)` (en-US + nb-NO).
- **Versioning:** transport `version`, `output_schema_version`, and `catalog_version` (now 2;
  v1 still valid) enforced independently.

## Implemented layout layer (Milestone 5)

- **Recursive tree**: single root → nested composition (`Stack/Row/Grid/Section/Card` contain
  children; leaves `Metric/Comparison/Table/Badge/Divider`).
- **Catalog = OpenUI library** (single source); prompt regenerated (catalog_version 3).
- **Recursive renderer** `NodeRenderer.svelte` (`svelte:self`); native styling.
- Limits: nodes 120, depth 6, children 12.
- Zero new dependencies; no core changes.

## Implemented logic layer (Milestone 6)

- **Runtime from lang-core** (no parallel engine): `createStore` + `store.initialize(stateDeclarations)`
  + `evaluateElementProps` resolves `$state`, expressions, and ternary.
- **Two-way binding**: input props marked `markReactive` → `ReactiveAssign` → `{value, binding}`;
  input change → `store.set` → re-evaluate → re-render (no model call).
- **Inputs**: `slider`, `select`, `switch`, `checkbox`, `input` (15 components total).
- Verified live: a pricing calculator (`$seats * 29`) updates instantly.

## Implemented streaming (Milestone 7)

- New marked extension matches `:::intelligent-ui` **open or closed**; emits a `partial` flag.
- Partial content parsed with `createStreamingParser` (progressive render, last-good tree);
  complete content creates the interactive runtime.
- Registered before colonFence (2 core edits + 1 new util file).

## Implemented AppBlock / rich widget (Milestone 9)

- Opt-in `:::intelligent-ui-html{v="1"}` fence → `RichWidget` → Open WebUI's sandboxed
  `FullHeightIframe` (`allow-scripts`, no same-origin; strict CSP `default-src 'none'` = no network).
- Theme `--viz-*` variables + autosize (ResizeObserver) + allow-listed `GenUI.sendPrompt`/`copy` bridge.
- Gated by the global flag `intelligent_ui.html.enable` (default OFF); safe fallback when off.

## Implemented rich-widget control parity (Milestone 9.1)

- Rich Widgets now have **global + user + chat (Auto/On/Off)** gating via
  `resolve_rich_widget_mode` (AUTO requires native Intelligent UI enabled).
- The Filter gates native and rich generation independently; both OFF = request unchanged.
- **Historical rendering preserved**: persisted widgets render if present (generation gated).
- Native Intelligent UI is independently usable.

## Implemented local declarative actions (Milestone 9.2, Phase A)

- `Button` + `@Set`/`@Reset` via lang-core `ActionStep` → normalized `OpenUIAction` → store (+ reactive
  re-evaluation). `@ToAssistant`/`@OpenUrl` supported. No model call. See `LOGIC_ACTIONS.md`.
- Phase B (Query/Mutation/tool bindings) is designed but deferred: `QUERY_MUTATION.md`.

## Implemented query / mutation bindings (Milestone 9.3)

- **Query registry** (`queries.ts`): allow-listed read-only sources `conversation.notes`
  (`GET /api/v1/notes/`), `library.files` (`GET /api/v1/files/`), `knowledge.collections`
  (`GET /api/v1/knowledge/`); results normalized to `{columns, rows}` with limits (50 rows, 64 KB,
  10 s timeout, 3 concurrent, 12 columns) and idle/loading/success/error states via `Data`.
- **Mutation registry** (`mutations.ts`): allow-listed `notes.create` (`POST /api/v1/notes/create`),
  `risk: 'confirm'` → native `ConfirmDialog`; runs only on explicit click (replay-proof).
- Reuses existing Open WebUI REST endpoints with the user's token — no parallel privileged executor,
  no core changes, no new dependencies. See `MILESTONE_9_3_REPORT.md`, `TOOL_BINDINGS_SECURITY.md`.

## Implemented native composition & component breadth (Milestone 9.4)

- Layout primitives compose recursively (Stack/Row/Grid/Section/Card/Divider) and now nest tabs,
  charts and forms.
- New native components: **Tabs** (local state, keyboard-accessible), **Chart** (chart.js — already
  a dependency; line/bar/area/pie/donut; query-bindable), **Progress** (0–100), **Timeline**,
  **Gallery** (reuses Open WebUI's safe `Image` primitive), **Textarea**, **Radio**, **Field**,
  **Form** (+ validation message).
- Query/state/action bindings validated inside the new components; no second data-binding mechanism.
- `catalog_version` 3 → 4 (v1–v3 still render). **No new dependencies, no core changes.**
- Map evaluated and deferred (leaflet exists but remote tiles conflict with the no-arbitrary-remote
  rule). See `MILESTONE_9_4_REPORT.md`, `NATIVE_COMPONENT_CATALOG.md`.

## Implemented visual & interaction polish (Milestone 9.5)

- Centralized spacing (no cumulative margins), tighter density, clearer hierarchy; polished tables
  (numeric alignment, sticky header, overflow), charts (sparse points, label truncation), tabs
  (overflow/keyboard/focus), forms, and dark/light.
- Standardized query states (`QueryState`: skeleton/empty/error+retry) and mutation feedback
  (toast loop + double-submit guard). Fallback reworded to "Interactive view unavailable".
- **Catalog prompt trimmed ~15%** (14 467 → 12 286 chars, ~−545 tokens/call); AUTO guidance tuned
  (less timid, still conservative). **No new dependencies, no core changes.**
- See `MILESTONE_9_5_REPORT.md`, `PARITY_VISUAL_AUDIT.md`, `UX_GUIDELINES.md`.

## Routing benchmark v2 (Milestone 9.6, evaluation only)

- `cat-jam-free` (cheapest model), same 50 v1 prompts, live production AUTO prompt, 3 runs:
  **channel accuracy 82.7%** (mean; range 78–88%), component 82.0%, **invalid/fallback ≤2%**,
  latency **−25%** vs v1, system prompt **−13%**.
- Failures remain conservative **under-use**; the one invalid case used JS `.toFixed()` in an
  expression. **M10 planner not justified** (80–84% band, near-zero invalid, conservative errors).
- Next: prompt micro-tuning ("just the number" trigger; avoid `.toFixed()`) + a separate v3 prompt
  set for chart/timeline/gallery. See `ROUTING_BENCHMARK_V2.md`.

## Capability benchmark v3 + prompt hardening (Milestone 9.7, evaluation only)

- Minimal prompt hardening (Metric/Comparison triggers; explicit no-JS-method rule; AUTO header).
- New ~60-prompt capability dataset (Chart/Timeline/Tabs/Form/Gallery/Query/Mutation/Rich/Mixed),
  cat-jam-free, 3 runs: aggregate channel **77.2 %**, family **73.3 %**, invalid/fallback **2.2 %**,
  rich over-use 1.7 %. Clear-intent subset: channel **81.8 %**.
- **Native JS leakage fixed to 0.** Core families strong (Markdown/Mutation 100 %, Tabs 93 %,
  Query 92 %, Rich 89 %); weak: Metric 53 %, Gallery 50 %, Mixed 42 % (mostly ambiguous/
  data-dependent prompts).
- **v1 not declared complete**; targeted fixes recommended (Metric example, Gallery rule, Mixed rule,
  Badge contract, multilingual note). **M10 still unnecessary.** See `ROUTING_BENCHMARK_V3.md`.

## Targeted reliability hardening (Milestone 9.8, evaluation + guidance only)

- Badge tone contract + Metric non-empty-label guidance; concise rules for Metric/Gallery/Mixed/
  Chart-Table/Timeline; native-first calculator rule; multilingual note. Two tuning iterations
  (second reverted). Prompt `PROMPT` +4.65%.
- v3 re-run (frozen prompt, 3 runs): channel **81.1%** (was 77.2%), family **78.9%**, invalid **0%**,
  clear subset channel **84.8%**.
- Untouched holdout (33 prompts, 3 runs): channel **65.6%**, family **61.6%**.
- **99% target not reached** — cat-jam-free plateaus ~81% (v3) / ~66% (holdout), a **model-capability**
  limit (conservative under-use + phrasing sensitivity). Over-use ≈0, safety 0. **M10 still
  unnecessary.** See `MILESTONE_9_8_REPORT.md`.

## The 15 questions

1. **Is Intelligent UI possible?** Yes. The model can emit a controlled UI schema that a native renderer maps to Open WebUI components. Confirmed by a working spike (`docs/INTELLIGENT_UI_SPIKE.md`: OpenUI + json-render both rendered a native calculator, 0 errors, interactive).

2. **Can it be implemented purely as Open WebUI Functions?** **No** — not as a *native* in-message component tree. Functions can emit Markdown, `embeds` (sandboxed iframe), `sources`, `files`, `status`, and known `output[]` items only. There is no component registry; custom `output` types and custom socket events are ignored (`structuredOutput.ts:425`, `Chat.svelte:1720`).

3. **What can Functions handle?** Prompt inspection, system-prompt injection, response interception/transform, streaming hooks, secondary-model calls, valves, and global/model/chat enablement. That covers **planning, gating, schema generation, and validation** — i.e. everything except rendering.

4. **What minimal frontend changes are required?** A native renderer reached via **two small core edits**: register one marked extension in `Markdown.svelte` (+2 lines) and add one token branch in `MarkdownTokens.svelte` (+~10 lines). All widget code lives in new files. (Durable alternative: one new `output[]` item type.)

5. **Globally toggleable?** Yes — a `DEFAULT_CONFIG` key + admin UI + `/api/config` feature flag.

6. **Per-user?** Yes — a user setting (`InterfaceSettings`), merged into `settings`.

7. **Per-chat?** Yes — one key in the chat `params` object, rendered as a tri-state control in the chat Controls panel.

8. **Per-model?** Yes — `model.meta.capabilities['intelligent_ui']` (free-form dict, no migration).

9. **What happens when disabled?** Nothing runs: no planner call, no schema, no extra prompt, no extra API call, no extra latency, no renderer branch, unchanged layout. Standard Open WebUI behavior.

10. **Lowest upstream maintenance cost?** Architecture B (Function + one new marked token + isolated module). Avoids editing `middleware.py`/`Chat.svelte`/`ResponseMessage.svelte`.

11. **Which OSS to reuse?** **OpenUI `@openuidev/lang-core` (#1)** behind an adapter (parser, streaming parser, catalog→prompt, validators). **json-render (#2)** as an alternative/fallback engine (official Svelte 5 renderer). **A2UI (#3)** as a future protocol/interop target and security model reference. Reuse the CopilotKit **router concept** (planner that picks text vs UI) as an idea only.

12. **Which mechanisms?** **Filter (inlet)** for planner/toggle/prompt-injection + **native Svelte renderer** (new marked token) + **feature settings** (config/user/chat/model). Optionally a **Pipe** later for full-model control. Not Functions-only; not core rewrites.

13. **Recommended order:** (see below) config/toggles → catalog+renderer for 3 components → filter planner (Auto/On/Off) → OpenUI adapter swap-in → validation/security/limits → tests → visual review.

14. **Main risks:** (a) OpenUI's Svelte runtime lags at Lang 0.5 → mitigate by using `lang-core` directly + our adapter; (b) positional-arg prop order is a frozen contract; (c) two hot-file edits could conflict on upstream churn → keep hunks tiny + contract tests; (d) planner latency/cost in On mode → default Auto with near-zero overhead; (e) model may emit invalid schema → strict validation + Markdown fallback.

15. **What to build first?** A minimal vertical slice behind a **global + chat Auto/On/Off** toggle: strict schema, **3 components (metric, comparison, simple table)**, native Svelte renderer via a new marked token, Markdown fallback, no arbitrary HTML. Test prompts: "Compare these three VPS options" (→ comparison), "Calculate the monthly cost" (→ metric/table), "Explain photosynthesis" (→ normal Markdown).

## Recommended target architecture (close to the prompt's §46)

```
Open WebUI
├── normal chat pipeline  (untouched when OFF)
└── optional Intelligent UI
      ├── settings: global / user / chat(Auto|On|Off) / model
      ├── Filter (inlet): read prompt, respect toggles; in AUTO/ON inject system prompt
      │     └── optional planner model call (only On/Auto-and-ambiguous)
      ├── strict UI schema (OpenUI Lang via lang-core, Zod catalog) + validator + limits
      └── native Svelte renderer (marked token :::intelligent-ui -> allow-listed components)
            └── fallback -> normal Markdown
OFF → identical to upstream.  AUTO → model decides.  ON → UI encouraged.
```

## Why OpenUI (lang-core) as the engine

- Streaming-first parser with partial-safe reconciliation (`createStreamingParser`).
- Prompt generated from **our** Zod catalog → model constrained to native components.
- Best token efficiency (−52.8% vs JSON-Render benchmark).
- `lang-core` has no React/Svelte dependency → embed behind our own Svelte adapter; avoids the stale `svelte-lang` 0.5 surface.
- MIT, very active. Telemetry must be disabled.

Fallback engine: `@json-render/core` + `@json-render/svelte` (official Svelte 5, stable). The adapter isolates the choice.

## Implementation order (phased)

0. **Foundation** (this phase): docs, branch, spikes, baseline. ✅
1. **Settings skeleton:** global config key + user setting + chat `params` tri-state + model capability; UI entry points. Verify OFF is a no-op.
2. **Renderer slice:** new marked token + `IntelligentUIBlock.svelte` + 3 native components (`metric`, `comparison`, `table`) using a hardcoded sample schema. Playwright screenshots + visual review.
3. **Filter planner:** inlet that (in On/Auto) injects a system prompt describing the schema; parse+validate the model output; strip/convert to the token or leave to renderer. Feature-flag gating.
4. **Engine adapter:** swap the sample schema for OpenUI `lang-core` (parser + `library.prompt()`), keeping json-render behind the same interface.
5. **Hardening:** limits, URL/action allow-lists, graceful fallback, tests (the §43 matrix), dark/mobile, provider fallback when structured output unsupported.
6. **Durability (optional):** persist UI in `output[]` (survives reload/arena).

## Non-negotiable guarantees

- OFF = untouched upstream behavior.
- No arbitrary HTML/JS; allow-list only; strict schema; graceful Markdown fallback.
- Native Open WebUI components only; one visual language.
- All UI changes require Playwright screenshots + visual review (`skills/ui-review`, `skills/visual-regression`).
