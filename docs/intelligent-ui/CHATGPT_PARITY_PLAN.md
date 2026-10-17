# ChatGPT Parity Plan — Intelligent UI (zero new dependencies)

> **Progress:** M5 (layout), M6 (logic/state/expressions), M7 (streaming), M8 (@Each + server
> fallback), M9 (rich-widget sandbox), M9.1 (rich-widget control parity), M9.2 Phase A (@Set/@Reset),
> M9.3 (Query/Mutation/tool bindings), M9.4 (native composition + component breadth: tabs, charts,
> progress, timeline, gallery, richer forms — catalog_version 4), M9.5 (ChatGPT-parity visual &
> interaction polish; prompt trimmed ~15%), M9.6 (**routing benchmark v2** — cat-jam-free mean
> channel accuracy 82.7%, invalid/fallback ≤2%, prompt −13%; **M10 not justified**), M9.7 (**prompt
> hardening + capability benchmark v3** — native JS leakage fixed to 0; core families strong, but
> aggregate channel 77.2% / family 73.3% on the harder v3 set; **v1 not yet complete; M10 still
> unnecessary**), M9.8 (**targeted reliability hardening** — Badge tone + Metric-label contract,
> guidance for Metric/Gallery/Mixed/Chart-Table/Timeline; v3 re-run channel **81.1%** (clear 84.8%),
> holdout **65.6%**; **99% target not reached — cat-jam-free plateaus ~66–85%**; M10 still
> unnecessary), M9.9 (**strong-model ceiling benchmark** — deepseek-v4.1-flash, frozen system: v3
> channel **91.7%**/clear 92.7%, holdout **82.8%**, invalid 0.6%; **Level C — architecture is strong
> and model-bound; near-99% not reached; v1 NOT declared complete; M10 unnecessary**), M9.10
> (**deepseek targeted hardening** — Metric tone contract + native-first/Gallery/multilingual/mixed
> guidance; deepseek v3 channel **92.8%**/family 90.0%, legacy holdout 83.8%, **NEW holdout 82.1%**
> (clear 87.8%); **Level C; near-99% not reached; v1 NOT complete; M10 unnecessary**) are **done**.
> Next: small targeted prompt/contract fixes (component limits, empty Gallery src, over-use on prose,
> rich under-use, Norwegian) then re-run the frozen benchmark. Catalog: `NATIVE_COMPONENT_CATALOG.md`;
> rulebook: `UX_GUIDELINES.md`; benchmarks: `ROUTING_BENCHMARK_V2.md`, `ROUTING_BENCHMARK_V3.md`;
> reports: `MILESTONE_9_8_REPORT.md`, `MODEL_CEILING_DEEPSEEK_V4_1_FLASH.md`,
> `MILESTONE_9_10_REPORT.md`.

Goal: get **as close to ChatGPT Intelligent UI as possible using ONLY what we already have**:
`@openuidev/lang-core` (our engine), `zod`, native browser APIs (iframe/Worker/ResizeObserver/
postMessage/clipboard), Open WebUI's existing primitives (ConfirmDialog, FullHeightIframe/embeds,
tool calling, web search), and libraries already in the repo (chart.js, vega/vega-lite, mermaid,
`@xyflow/svelte`, katex, DOMPurify, lucide icons). **No new npm/pip dependencies.**

## Investigation findings (GitHub + local)

1. **Our engine already contains the logic layer.** `@openuidev/lang-core@0.4.1` (installed) exports:
   - `createStreamingParser` — incremental parsing (streaming).
   - `createStore`, `resolveStateField`, `isReactiveAssign`, `markReactive`, `StateField`,
     `ReactiveAssign` — reactive state + two-way binding.
   - ternary + binary expressions; `@Each` iteration; `@Set/@Reset/@Run/@ToAssistant/@OpenUrl`
     action steps (`ActionStep`, `BuiltinActionType`).
   - `Query`/`Mutation`, `createQueryManager`, `ToolProvider`, `extractToolResult`.
   - `evaluate`, `evaluateElementProps`, `mergeStatements`, `generateSystemPrompt`.
   → The "logic layer" gap is **not** a format gap; it is that our renderer only consumes a
     subset. We can expose it with our own code (no new deps).
2. **Reference implementations to mimic (not depend on):**
   - `Disdjj/intelligent-ui-demo` (MIT) — streaming DSL compiler + iframe/Worker sandbox. Reference
     for the sandbox/operation-protocol ideas.
   - `CopilotKit/OpenGenerativeUI` (MIT) — `generateSandboxedUi` + Zod-validated `sendPrompt`/
     `openLink` sandbox bridge. Reference for the AppBlock escape hatch.
   - `thesysdev/openui` (MIT) — OpenUI Lang v0.5 spec (state, ternary, `@Each`, queries) and prompt
     generation (we already use `lang-core`).
3. Open WebUI already ships a **sandboxed iframe** (`FullHeightIframe`, `allow-scripts` without
   `allow-same-origin`) and a **same-origin prompt channel** (`input:prompt:submit`) — reuse both.

## Layer-by-layer mapping (ChatGPT → us, no new deps)

| ChatGPT layer | Our approach | New deps | Gap vs ChatGPT |
|---|---|---|---|
| **DIL** (Markdown + JSX + **JS**) | **OpenUI Lang v0.5** (our format) with its full declarative logic: `$state`, ternary, `@Each`, expressions, action steps, Query/Mutation | none | No arbitrary JS (safer, by design) |
| **Server-side compilation** (→ JS program + JSON) | Server-side **normalization + validation + fallbackMarkdown** in the Filter (Python); canonical parse stays client-side (lang-core). No JS compiler needed for declarative rendering | none | No runnable JS program (not needed declaratively) |
| **Client runtime + operation protocol** | Use lang-core's `createStore` + `evaluate`/`evaluateElementProps` to apply state and re-render native components directly | none | No sandboxed JS worker (no arbitrary logic) |
| **~70 native components** | Expand our catalog with native components using **existing repo libs** (chart.js, vega, mermaid, @xyflow, katex, lucide) | none | Fewer components initially |
| **Streaming** (JSON-patch, incremental) | Use `createStreamingParser` to render structure-first as tokens arrive | none | Transport stays SSE/colonFence |
| **Data** (AsyncImage/Entity/Cite, tool bindings) | Server-side resolution in the Filter using existing httpx/web-search/tools; bind values into the output item (`appData`-like) | none | Fewer server-resolved component types |
| **Actions** (`issueNewTurn`/`copy`/`openUrl`/`openEntityDetail`) | Extend dispatcher: `send_prompt` (done), `copy` (clipboard), `open_url` (allow-listed + confirm), `@Set/@Reset/@Run` | none | — |
| **AppBlock escape hatch** (HTML/CSS/JS iframe) | Reuse Open WebUI's `FullHeightIframe` sandbox; inject theme CSS vars + autosize (ResizeObserver); new `:::intelligent-ui-html{v="1"}` fence, opt-in flag | none | Separate-domain isolation not replicated |
| **fallbackMarkdown** | Generate in the Filter (Python): keep prose, render interactive parts as static text | none | — |
| **Design tokens** | Reuse Open WebUI Tailwind tokens + CSS vars | none | — |

## Phased roadmap (M5 → M9)

**M5 — Component breadth (native, no deps).**
Add `chart` (chart.js/vega), `form` (inputs + submit), `tabs`, `list`, `image`/`gallery`,
`progress`/`steps`, `timeline`, `code`. Each: Zod schema, native Svelte component, story, tests,
regenerate catalog prompt. Acceptance: 10+ components; screenshots dark/light/mobile.

**M6 — Logic layer (state/expressions/conditionals/loops) via lang-core.**
Expose OpenUI v0.5 `$state`, two-way binding, ternary (conditionals), `@Each` (loops), and action
steps `@Set/@Reset/@Run`. Wire lang-core `createStore` + `evaluate` into our renderer; extend the
dispatcher (`copy`, `open_url`). Acceptance: an interactive widget (slider → expression → live
value; `@Each` list; ternary branch) works with no model call; state durable.

**M7 — Incremental streaming.**
Replace "wait for closing `:::`" with `createStreamingParser`: render structure as it arrives, fill
data progressively, keep state across recompiles, hold last-good tree on parse errors. Acceptance:
a streamed response shows components appear progressively; no flicker; malformed stays safe.

**M8 — Server normalization + data binding + fallbackMarkdown.**
Filter (Python): normalize blocks, enforce limits, resolve data (image search via existing web
search/tools; tool-result bindings), and emit `fallbackMarkdown`. Persist enriched `intelligent_ui`
output items. Acceptance: a component whose data is server-supplied; a client without UI support
shows the Markdown fallback.

**M9 — AppBlock escape hatch (sandboxed HTML/CSS/JS).**
New `:::intelligent-ui-html{v="1"}` fence → reuse `FullHeightIframe` (sandbox, no same-origin),
inject theme CSS vars (`--viz-*` → our tokens), autosize via ResizeObserver, allow-listed
`sendPrompt`/`openLink` bridge (postMessage, validated), opt-in flag, native/Markdown fallback.
Acceptance: an arbitrary interactive widget renders safely; security tests (no external fetch, no
top-nav, size/time limits).

## What we will NOT match (and why)

- **Arbitrary JavaScript in the response** (DIL's `{@body …}` / `{#if}` / `{#each}` / JS handlers).
  We stay declarative (ternary + `@Each` + action steps). This is the deliberate safety line; it is
  also why we need no sandboxed JS runtime.
- **Server→JS compilation + operation protocol.** Only needed for arbitrary JS; declarative
  rendering makes it unnecessary.
- **~70 components / composite components / separate-domain AppBlock isolation.** Partial via M5/M9.

## Where we can be BETTER than ChatGPT

- **Durable state** across reload (ChatGPT loses it).
- **Model can see UI state** (include a state summary in `issueNewTurn`) — ChatGPT cannot.
- **No full-recompile waste** (declarative render is cheap) — ChatGPT resends ~83% code.
- **fallbackMarkdown includes computed content** (ChatGPT's omits it).
- **No silent logic errors** (declarative expressions are validated).

## Risks

- Implementing v0.5 state/ternary/`@Each` in our renderer is real work (lang-core parses; we render).
- Incremental streaming must keep last-good tree to avoid flicker.
- AppBlock sandbox is the one place we relax "no arbitrary HTML" → must be flagged, isolated,
  tested (upstream Open WebUI has had embed sandbox bugs: #32222, #28085, #26912).
- Component breadth must stay on-brand (native tokens) and accessible.

## Recommended order

M5 (components) → M6 (logic layer) → M7 (streaming) → M8 (server data/fallback) → M9 (AppBlock).
M5+M6 deliver the biggest jump toward ChatGPT with zero new dependencies.
