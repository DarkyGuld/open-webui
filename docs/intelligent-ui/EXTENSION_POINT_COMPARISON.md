# Extension Point Comparison (Open WebUI)

Columns: Inspect prompt · Inspect response · Transform response · Emit structured data · Stream · Settings · Toggleable · Requires frontend changes · Upstream risk · Suitable for Intelligent UI.

| Mechanism | Inspect prompt | Inspect resp | Transform resp | Emit structured | Stream | Settings | Toggleable | FE changes | Upstream risk | Suitable? |
|---|---|---|---|---|---|---|---|---|---|---|
| **Filter (inlet/outlet)** | ✅ | ✅ | ✅ | partial | ✅ (stream hook) | ✅ valves | global/model/chat | **YES for native UI** | Low (add-only) | **Planner + schema gen** |
| **Filter (stream)** | – | ✅ per chunk | ✅ per chunk | partial | ✅ | ✅ | same | YES for native UI | Low-med | Streaming transform |
| **Pipe** (custom model) | ✅ | owns it | ✅ | partial | ✅ | ✅ | is a model | YES for native UI | Low | Alternate provider path |
| **Action** | partial | ✗ | ✗ | partial | ✗ | ✅ | global/model | HTML→embed works today | Low | Buttons / confirmations |
| **Tool** | partial | ✗ | ✗ | partial | partial | ✅ | global/model | HTML→embed works today | Low | Data/tool actions |
| **Event function** | ✗ | ✗ | ✗ | partial | ✗ | ✅ | global | YES | Low | Lifecycle side-effects |
| **Middleware (core)** | ✅ | ✅ | ✅ | ✅ | ✅ | – | – | NO | **High** (hot file) | Full control, costly |
| **Frontend extension point** | – | – | – | – | – | – | – | YES | Low (new files) + 2 hot lines | **Renderer needed** |
| **Direct core modification** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | – | YES | **High** | Avoid |

## Key findings

- **Functions cannot render native UI.** They can only emit: markdown, `message.embeds` (sandboxed iframe), `sources`, `files`, `status`, `followUps`, and `output[]` items with *types the frontend already knows*. Custom `output` types and custom socket events are ignored (`structuredOutput.ts:425`, `Chat.svelte:1720`).
- **Rich UI today = `embeds` iframes** (sandboxed, no same-origin). Historically discussed but never natively implemented by upstream: PR/issue #23307 "Generative UI Integration" (closed), #25452 "bidirectional visual plugin system" (closed), #9944 "generative ui (applets)" (closed), #1477.
- **The planner/decision logic belongs in a Filter (inlet)** — the only mechanism that sees the prompt, can inject a system prompt, and can call a secondary model, with valves and global/model/chat toggles. Response shaping can be done in `outlet`/`stream`.
- **The renderer must be frontend** — a new markdown token + branch (small) or a new `output[]` type (durable). See `CURRENT_RENDER_PIPELINE.md` §Insertion points and `ARCHITECTURE_OPTIONS.md`.

## Recommended split (see RECOMMENDATION.md)

| Concern | Mechanism |
|---|---|
| Global/user/chat/model toggles | Config key + user setting + chat `params` + model `meta.capabilities` |
| Prompt inspection, system-prompt injection, UI-vs-text decision | **Filter (inlet)** with valves, optionally a secondary model |
| Schema validation + fallback | Filter (server) or renderer (client) |
| Emitting the structured payload | Model output in a controlled wire format (OpenUI Lang / A2UI JSON) inside the response, or a `custom` output item |
| Rendering | **New frontend renderer** (marked token → native Svelte registry), reused by "Auto/On" |
| Iframe fallback (zero FE change) | `embeds` channel (optional, low priority) |
