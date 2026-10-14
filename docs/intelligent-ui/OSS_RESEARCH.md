# OSS Research — Intelligent / Generative UI (Oct 2026)

Source-level review of mandated projects (local shallow clones under `research/intelligent-ui/`), plus GitHub/web research. Freshness: snapshots taken 2026-10-14.

## Method

Cloned: `thesysdev/openui`, `a2ui-project/a2ui`, `ag-ui-protocol/ag-ui`, `thesysdev/open-intelligent-ui`, `CopilotKit/OpenIntelligentUI`. Inspected source (not READMEs), licenses, activity. Additionally searched Open WebUI issues/PRs, Open WebUI forks, Vercel/LangGraph, and ChatGPT-Intelligent-UI reimplementations.

---

## 1. thesysdev/openui (OpenUI Lang) — MIT, 10.9k★, pushed today

- **What:** "The Open Standard for Generative UI". A compact, line-oriented, **streaming-first DSL** (`Name(arg1, arg2)` positional). Framework-agnostic core `@openuidev/lang-core`.
- **Versions:** Lang **1.0** for React (`react-lang` 1.0.0); **Svelte/Vue/Angular are pinned to 0.4.x / Lang 0.5** and intentionally not advanced (`packages/lang-core/CHANGELOG.md`).
- **Reusable, framework-free (`lang-core`):** `createParser`/`createStreamingParser` (`src/parser/parser.ts:749,770`), `generateSystemPrompt`/`library.prompt()` (`src/parser/prompt.ts:766`, `library.ts:305`), `defineComponent`/`createLibrary` + Zod catalog + `toJSONSchema` (`library.ts:246`), `createStore`, `createQueryManager`, `evaluate*`, action steps (`run/set/reset/continue_conversation/open_url/custom_action`), validators, `parseMessage/buildMessage`. **No React/Svelte imports** in `lang-core`.
- **Prompt generation from our own catalog:** yes — define Zod schemas per native component; `library.prompt()` emits syntax rules + streaming order; parser consumes only `toJSONSchema()`.
- **Security:** no `eval`, no `innerHTML`; whitelist renderer; unknown components dropped non-fatally (`materialize.ts:413`, `validation.ts:151`). Risks: PostHog telemetry (disable `OPENUI_TELEMETRY_DISABLED=1`), `open_url` navigation, regex validation ReDoS.
- **Token efficiency:** `benchmarks/README.md:36-45` — OpenUI Lang **−52.8% vs Vercel JSON-Render**, −51.7% vs C1 JSON.
- **Svelte gap:** `svelte-lang@0.4.1` has parse+render+form state only — **no streaming parser use, no queries/mutations/reactive bindings/ActionPlan/message protocol**; its `Renderer.svelte` re-parses the whole response per chunk (O(n²)).
- **Verdict:** reuse `lang-core` (parser + prompt + catalog + validators) behind our own **Svelte adapter**, not `svelte-lang` wholesale.

## 2. a2ui-project/a2ui (A2UI) — Apache-2.0, Google-originated

- **What:** "Agent-to-User Interface". Declarative **JSON** wire format (envelopes `createSurface/updateComponents/updateDataModel/deleteSurface`, flat component adjacency list with ID refs) + catalog allowlist of 18 components / 14 functions. Tagline: "safe like data, expressive like code".
- **Version:** **v0.9.1 = production**, v1.0 = release candidate (breaking renames `theme→surfaceProperties`, `path→@path`). Self-labeled **"early stage public preview"**.
- **Streaming:** JSONL messages, structural progressive rendering; optional compact agent-side inference formats (Express −55–70% tokens, Atom −25–50% more).
- **Security:** strongest declarative story — no code execution, catalog allowlist, Markdown-without-HTML `Text`, iframes only via MCP Apps double-iframe sandbox.
- **Renderers:** React, Lit, Angular, Flutter, Compose. **No official Svelte renderer**; roadmap lists Svelte/Kit as *proposed*; a third-party `svelte-a2ui` (v1.0) exists. Shared core `@a2ui/web_core` (message processing, surface/data models, validation).
- **Verdict:** protocol + core reusable; requires a Svelte adapter. More verbose wire than OpenUI Lang; version churn risk (v1.0 RC).

## 3. ag-ui-protocol/ag-ui (AG-UI) — MIT

- **What:** event-based **agent↔app protocol** (NOT a UI format). Version 1.0. 31 event types (`TEXT_MESSAGE_*`, `TOOL_CALL_*`, `STATE_SNAPSHOT/DELTA` (RFC6902), `ACTIVITY_SNAPSHOT/DELTA`, `RUN_*`, `REASONING_*`, `SUBAGENT_*`), SSE default, interrupts/resume HITL.
- **Explicit:** "AG-UI is not a generative UI specification — it's a User Interaction protocol" (`docs/concepts/generative-ui-specs.mdx:18`). Generative-UI specs (A2UI, MCP-UI, Open-JSON-UI) plug in via middleware.
- **Svelte:** none.
- **Verdict:** useful as an **external agent connector** (LangGraph/CrewAI/ADK…), not as the UI layer, and not to replace Open WebUI's Socket.IO bus.

## 4. thesysdev/open-intelligent-ui — **no license**, 368★, ~1 week old

- ChatGPT Intelligent UI **showcase** (Next.js 16 + React 19 + OpenUI Lang 1.0). No router/planner — model decides in one stream; text aka OpenUI nodes.
- Reusable (through adapter): OpenUI schema/prompt, semantic component inventory, **pure `@functions`**, the model-side text-vs-UI prompt guidance. NOT reusable: its React visual layer (`AgentInterface`, `@openuidev/react-ui`). No license → do not copy code.

## 5. CopilotKit/OpenIntelligentUI — MIT, 3.1k★

- Polished reference (Next.js + CopilotKit v2 + LangGraph agent). **Best reusable idea: an explicit backend router** (`apps/agent/src/visualization_router.py` — Jev) that picks `text | a2ui | open_generative_ui` and filters the tool list; maps to Open WebUI tools. Also: A2UI Table JSON contract; HITL interrupt pattern; prompt/skill guidance.
- NOT reusable: CopilotKit React renderers and the **streamed-HTML/JS "Open Generative UI" Websandbox iframe** (violates our "no external visual layer" rule; reference only).

## 6. Vercel `vercel-labs/json-render` — Apache-2.0, 18.6k★, pushed yesterday

- JSON catalog + `@json-render/{core,react,vue,svelte,solid,react-native}`. **Has an official Svelte 5 renderer** (`@json-render/svelte` 0.21.1) and `catalog.prompt()` producing a JSONL JSON-Patch streaming format. Guardrailed (Zod catalog). **Spiked successfully** (see `docs/INTELLIGENT_UI_SPIKE.md`). More verbose than OpenUI Lang but stable cross-framework version.

## 7. Other signals

- **PrefectHQ/prefab** (Apache-2.0, 745★): Python DSL → React renderer, MCP Apps. Backend-authoring angle.
- **CopilotKit/generative-ui** (852★): AG-UI/A2UI/MCP-App examples.
- **tambo-ai/tambo** (MIT, 11.2k★): React generative-UI SDK.
- **AGenUI** (Apache-2.0, 1.2k★): native A2UI renderer (iOS/Android/HarmonyOS).
- **LangGraph gen-UI examples** (MIT, 400★, stale 2025).
- **ChatGPT Intelligent UI reverse-engineering:** `Disdjj/intelligent-ui-demo` (MIT, 26★, 2026-10-08) — decomposes ChatGPT's internal "DIL/GenUI": **streaming DSL compiler + iframe + Worker sandbox + host renderer + state loop**, with captured protocol and a runnable replica. Also `yunyv/dsh-intelligent-ui` (DeepSeek Harness declarative DSL). Confirms the industry pattern: **model emits a compact declarative DSL, client compiles to components in a sandbox**.
- **Open WebUI upstream:** no native generative-UI support. Closed requests: #23307, #25452, #9944, #1477. Rich UI today = sandboxed `embeds` iframes (issues #32222, #28085, #26912, #23049).

## Cross-cutting conclusion

The field converges on: **model emits a compact declarative UI description → trusted client catalog renders it with native components → no arbitrary code**. OpenUI Lang (token-efficient, streaming, framework-agnostic core, Svelte 0.5) and json-render (JSON, official Svelte 5, stable) are the two practical engines for our stack. A2UI is the most rigorous *protocol* but has no official Svelte renderer and is pre-1.0. AG-UI is plumbing, not UI. See `OSS_COMPARISON_MATRIX.md` and `RECOMMENDATION.md`.
