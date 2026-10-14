# Architecture Options

The question: **what is the cleanest way to add an OPTIONAL ChatGPT-style Intelligent UI inside Open WebUI that can be toggled off without changing normal behavior?**

Normal Open WebUI when OFF must be byte-for-byte the standard pipeline (principle 42).

## Architecture A — Pure Function (no frontend changes)

**How:** a Filter/Action/Tool emits an `embeds` HTML payload (`__event_emitter__({type:'embeds',...})`) or returns `HTMLResponse`. Frontend renders it in `FullHeightIframe` (sandboxed iframe).

| Criterion | Assessment |
|---|---|
| Feasibility | ✅ (works today, zero FE changes) |
| Complexity | Low |
| Maintainability | Medium (HTML-in-Python per widget) |
| Upstream compatibility | Excellent |
| Streaming | Partial (embed replaces; no token streaming) |
| Toggles | ✅ via function enable/valves |
| Provider support | ✅ |
| Security | Sandboxed iframe, no same-origin; still ships raw HTML/JS from server |
| Latency | Low |
| UX quality | **Poor/foreign** — not native Open WebUI; violates one-design-language |

**Verdict:** possible but **rejected** as the primary approach (foreign visual language, no native components). Keep only as an emergency fallback.

## Architecture B — Function (planner/schema) + minimal native frontend renderer ★

**How:** a Filter (inlet) reads the prompt and (optionally) calls a planner; when UI is chosen it injects a system prompt instructing the model to emit a **controlled UI schema** (OpenUI Lang / JSON). A **new native Svelte renderer** (new marked token `:::intelligent-ui` or a new `output[]` item) validates the schema against an allow-list and renders **native Open WebUI components**. Markdown fallback on any failure.

| Criterion | Assessment |
|---|---|
| Feasibility | ✅ |
| Complexity | Medium |
| Maintainability | Good (isolated module + adapter) |
| Upstream compatibility | Good (**2 small hot-file touches** or 1 new `output` type) |
| Streaming | ✅ (block streams; render when statement closes) |
| Toggles | ✅ Functions + config/params/capabilities |
| Provider support | ✅ (text-based schema ⇒ any provider) |
| Security | ✅ strict schema, no arbitrary HTML/JS |
| Latency | Auto = near-zero when text is enough; On = optional planner call |
| UX quality | **High** — native components, native look |

**Verdict: recommended.** This is the target architecture.

## Architecture C — Filter/Pipe + frontend renderer

Same as B but using Filter `stream`/`outlet` hooks or a Pipe as the custom model to own/transform the response.

| Criterion | Assessment |
|---|---|
| Feasibility | ✅ |
| Complexity | Medium |
| Maintainability | Good |
| Upstream | Good |
| Streaming | ✅ (stream hook / pipe generator) |
| Toggles | ✅ |
| UX | High |
| Note | Pipe = alternate model path (useful for full control); Filter = works with existing models |

**Verdict:** valid variants of B; use Filter for broad model support, Pipe for full control.

## Architecture D — Plugin/backend service + frontend renderer

A separate backend service (e.g. the PAW BFF) produces UI and a frontend renderer consumes it.

| Criterion | Assessment |
|---|---|
| Feasibility | ✅ |
| Complexity | **High** (extra service, auth, deploy) |
| Maintainability | Medium |
| Upstream | Excellent (no core changes) |
| Latency | Higher (network hop) |
| UX | High if native renderer |
| Note | Overkill for a single-node self-hosted product; contradicts "few processes" ADR |

**Verdict:** not for v1; keep in mind if planner/composer must run separately.

## Architecture E — Core-integrated response composer

Modify core middleware + renderer to natively understand a UI schema.

| Criterion | Assessment |
|---|---|
| Feasibility | ✅ |
| Complexity | High |
| Maintainability | Poor (core churn) |
| Upstream compatibility | **Worst** (hot files) |
| UX | High |
| Note | Only justified if this becomes an upstream feature |

**Verdict:** avoid; contradicts "minimize upstream conflicts".

## Summary

| | A Pure Function | **B Function + native renderer** | C Filter/Pipe + renderer | D Backend service | E Core |
|---|---|---|---|---|---|
| Native look | ❌ | ✅ | ✅ | ✅ | ✅ |
| FE changes | none | minimal | minimal | minimal | large |
| Toggle OFF = untouched | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| Upstream risk | none | low | low | none | high |
| Streaming | partial | ✅ | ✅ | ✅ | ✅ |
| Recommendation | fallback | **primary** | variant | later | no |

**Chosen: Architecture B**, with a Filter (inlet) as the planner/toggle and a new native Svelte renderer fed by a controlled schema (OpenUI Lang via `@openuidev/lang-core`, adapter-isolated). Details and phasing in `RECOMMENDATION.md`.
