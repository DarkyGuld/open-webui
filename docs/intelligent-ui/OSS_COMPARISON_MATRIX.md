# OSS Comparison Matrix — Intelligent/Generative UI

## Full matrix

| Project | Primary purpose | Lang/framework | UI representation | Streaming | Svelte support | Component registry | Actions | State sync | Security | Arbitrary code? | Structured output | Provider independence | License | Recent activity | Integration difficulty | Upstream impact | Reusable parts | Recommendation |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **thesysdev/openui** | Generative UI standard (language) | TS, framework-agnostic core | OpenUI Lang (positional DSL) | ✅ streaming-first | ⚠️ `svelte-lang` 0.4 / Lang 0.5 (behind React 1.0) | ✅ Zod catalog → JSON Schema | ✅ `run/set/reset/continue/open_url/custom` | ✅ store + reactive refs (1.0) | ✅ whitelist, no eval/HTML | No | ✅ | ✅ (prompt/schema portable) | MIT | Very active (today) | Medium (own Svelte adapter) | Low (2 FE lines + new files) | `lang-core`: parser, streaming parser, prompt-gen, catalog, validators | **#1 — primary engine** |
| **vercel-labs/json-render** | Generative UI framework | TS | JSON catalog + JSONL JSON-Patch | ✅ | ✅ **official `@json-render/svelte` 0.21** | ✅ Zod catalog | ✅ actions/handlers | ✅ `$bindState`/store | ✅ catalog allowlist | No | ✅ | ✅ | Apache-2.0 | Active (yesterday) | Low (spiked OK) | Low | `@json-render/{core,svelte}` + `catalog.prompt()` | **#2 — fallback / alt engine** |
| **a2ui-project/a2ui** | Agent-to-UI protocol | many (TS/Py/Dart/Swift) | A2UI JSON envelopes + catalog | ✅ JSONL | ❌ official (community/roadmap) | ✅ JSON Schema catalog | ✅ client→server `action` | ✅ data model + `sendDataModel` | ✅ strongest declarative | No | ✅ | ✅ | Apache-2.0 | Active (today) | Medium-high (Svelte renderer) | Low-med | protocol/schema/`web_core`; catalogs | **#3 — protocol reference** |
| **ag-ui-protocol/ag-ui** | Agent↔app event protocol | TS/Py/.NET | **none** (events only) | ✅ SSE | ❌ | – | ✅ tool/HITL | ✅ snapshot/delta | n/a | No | ✅ (events) | ✅ | MIT | Active | Med (Svelte client) | Low-med | event/state/HITL patterns; external agent connector | Reference / optional connector |
| thesysdev/open-intelligent-ui | ChatGPT-IUI showcase | Next.js/React | OpenUI Lang 1.0 | ✅ | ❌ | React | ✅ `@functions` | local + store | ✔ (no license!) | No | ✅ | ✅ | **none** | ~1wk old | Reference | – | component inventory, pure `@functions`, prompt guidance | Reference only |
| CopilotKit/OpenIntelligentUI | ChatGPT-IUI reference | Next.js + LangGraph | A2UI + streamed HTML/JS | ✅ | ❌ | React | ✅ | agent state | ⚠️ iframe sandbox | **Yes** (sandboxed HTML/JS) | ✅ | ✅ | MIT | Active | Reference | – | **router concept**, A2UI table contract, HITL, prompts | Reference only (router idea) |
| CopilotKit/CopilotKit | Agent frontend stack | React | generative UI hooks | ✅ | ❌ | ✅ | ✅ | ✅ | ✔ | No | ✅ | ✅ | MIT | Active | n/a (React) | – | AG-UI integration, HITL | Reference |
| PrefectHQ/prefab | UI in Python | Python + React | context-manager DSL | ✅ | ❌ | React | ✅ | Rx | ✔ | No | – | ✅ | Apache-2.0 | Active | n/a | – | backend authoring idea | Watch |
| **Disdjj/intelligent-ui-demo** | ChatGPT IUI reverse-engineering | Node | streaming DSL + iframe/Worker sandbox | ✅ | ❌ | custom | ✅ | view_state loop | ✔ sandbox | Yes (sandboxed) | ✅ | ✅ | MIT | 2026-10 | Reference | – | analysis of ChatGPT's DIL/GenUI | Reference |
| AGenUI | Native A2UI renderer | C++ | A2UI | ✅ | n/a | ✅ | ✅ | ✅ | ✔ | No | ✅ | ✅ | Apache-2.0 | Active | n/a | – | mobile renderer | Reference |

## Focused: OpenUI vs A2UI vs AG-UI

| Dimension | OpenUI | A2UI | AG-UI |
|---|---|---|---|
| Primary purpose | Generative-UI **language** | **UI protocol** (declarative JSON) | **Agent↔app event protocol** |
| Representation | OpenUI Lang (compact, positional) | JSON envelopes + catalog | events + state |
| Token efficiency | ✅ best (−52.8% vs JSON-Render) | verbose wire (compact inference formats optional) | n/a (not UI) |
| Streaming | ✅ streaming-first, partial-safe | ✅ JSONL, progressive | ✅ SSE |
| Svelte | ⚠️ official but Lang 0.5 | ❌ official; community exists | ❌ none |
| React dependency | none in core (`lang-core`) | none in `web_core` | none (RxJS) |
| Component registry | ✅ Zod → JSON Schema | ✅ JSON Schema catalog | n/a |
| Actions | ✅ rich (`run/set/…`) | ✅ `action` message | ✅ tool calls |
| State sync | ✅ store/reactive | ✅ data model | ✅ snapshot/delta (RFC6902) |
| Security | ✅ allowlist, no code | ✅ strongest | n/a |
| Arbitrary code | No | No | No (but enables HTML via other specs) |
| Structured output | ✅ | ✅ | ✅ (events) |
| Provider independence | ✅ | ✅ | ✅ |
| Maturity | 1.0 (React) / 0.5 (Svelte) | 0.9.1 prod, 1.0 RC, "early preview" | 1.0 |
| License | MIT | Apache-2.0 | MIT |
| Activity | Very active | Active | Active |
| Complexity | Medium | Medium-high | Medium |
| Open WebUI suitability | **High** | Medium | Low (plumbing) |
| Functions suitability | ✅ prompt-gen/validation server-side | ✅ (SDK) | ✅ (agent connector) |
| Frontend renderer suitability | **High** (own Svelte adapter) | Medium (build renderer) | Low (no UI) |

## Ranking

**#1 — OpenUI (`@openuidev/lang-core`) behind an adapter.** Streaming-first, most token-efficient, framework-agnostic core, catalog→prompt generation, MIT, very active. Risk: Svelte runtime lags (Lang 0.5) → use `lang-core` directly + our own Svelte renderer (which we must build anyway to keep native components).

**#2 — json-render (`@json-render/core` + `@json-render/svelte`).** Official Svelte 5 renderer, stable cross-framework version, Apache-2.0, spiked successfully. More verbose output; less token-efficient. Best fallback and a strong alternative if we prefer JSON over a custom language.

**#3 — A2UI (`@a2ui/web_core` + protocol).** Most rigorous *protocol* and security model, multi-language, conformance suites. But pre-1.0 (v1.0 RC breaking changes), no official Svelte renderer, verbose wire. Use as protocol/schema reference and future interop target.

**Not adopted as UI engines:** AG-UI (plumbing, no UI), CopilotKit React stack (external visual layer), open-intelligent-ui (unlicensed, React), ChatGPT-DIL replica (visual sandbox we must not embed).
