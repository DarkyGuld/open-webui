# Open WebUI Extension Mechanisms — Capabilities

Source-level audit of this fork (`backend/open_webui`). Legend: **SUPPORTED** / **PARTIAL** / **NOT** / **UNKNOWN**.

## The mechanisms

| Mechanism | What it is | Storage / enablement |
|---|---|---|
| **Filter** | Python class with `inlet` / `outlet` / `stream` / `request` hooks | `function` table (`models/functions.py:21-37`); global (`is_global`) + model `meta.filterIds` (`utils/filter.py:59-65`) |
| **Pipe** | Function that *is* a model (custom model) | becomes synthetic model (`utils/functions.py:72-151`) |
| **Action** | User-triggered button function | `utils/actions.py` |
| **Tool** | OpenAI function-calling tool; can return HTML→embed | `utils/tools.py` |
| **Event function** | Reacts to lifecycle events (webhooks etc.) | `utils/events.py` |
| **Valves / UserValves** | Pydantic per-function settings (admin/per-user) | `utils/valves.py`; per-user in `user.settings.functions.valves[id]` |

There is **no frontend plugin/registry system**. "Plugin" here = backend Functions/Tools.

## Capability matrix

| Capability | Filter | Pipe | Action | Tool | Event fn |
|---|---|---|---|---|---|
| Inspect user prompt | SUPPORTED | SUPPORTED | PARTIAL | PARTIAL | NOT |
| Inject/modify system prompt | SUPPORTED | SUPPORTED | PARTIAL | NOT | NOT |
| Intercept response (before) | SUPPORTED | SUPPORTED | NOT | NOT | NOT |
| Intercept response (after) | SUPPORTED | n/a | NOT | NOT | NOT |
| Transform response content | SUPPORTED | SUPPORTED | NOT | NOT | NOT |
| Emit structured metadata | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| Emit custom frontend events | PARTIAL | PARTIAL | PARTIAL | PARTIAL | NOT |
| Attach custom content | PARTIAL | PARTIAL | **SUPPORTED** (HTML→embed) | **SUPPORTED** (HTML→embed) | NOT |
| Access user/admin settings | SUPPORTED | SUPPORTED | SUPPORTED | SUPPORTED | PARTIAL |
| Expose settings (valves) | SUPPORTED | SUPPORTED | SUPPORTED | SUPPORTED | SUPPORTED |
| Global enable/disable | SUPPORTED | SUPPORTED | SUPPORTED | SUPPORTED | SUPPORTED |
| Per-model | SUPPORTED | (is a model) | PARTIAL | SUPPORTED | NOT |
| Per-user enable/disable | PARTIAL (UserValves only) | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| Per-chat | SUPPORTED (`filter_ids`) | n/a | n/a | SUPPORTED (`tool_ids`) | NOT |
| Stream partial output | SUPPORTED | SUPPORTED | NOT | PARTIAL | NOT |
| Call secondary models | SUPPORTED* | SUPPORTED | SUPPORTED* | SUPPORTED* | PARTIAL |
| Influence frontend rendering | SUPPORTED (fixed channels) | SUPPORTED | SUPPORTED | SUPPORTED | NOT |

\* Not injected — author must `import` `utils.chat.generate_chat_completion`.

Injected context (signature-filtered) at `utils/filter.py:135-144`, `utils/middleware.py:2575-2585,4202-4209`: `body, event, __event_emitter__, __event_call__, __user__(+valves), __metadata__, __request__, __model__, __chat_id__, __message_id__, __id__`. Pipes add `__task__, __files__, __tools__, __session_id__` (`utils/functions.py:248-262`).

## What actually reaches the renderer (decisive)

1. **Socket events** — `Chat.svelte:1474-1722` handles a fixed type list; unknown → `console.log('Unknown message type')` (`:1720`). Custom event types are inert.
2. **Structured `output[]`** — only known item types render (`structuredOutput.ts:347-448`); unknown → plain text (`:425-433`).
3. **Markdown** — special HTML tokens only (`HtmlToken.svelte`); `:::` colon fences render markdown (`ColonFenceBlock.svelte:79-90`).
4. **The one genuine custom-UI channel: `embeds`.** `__event_emitter__({type:'embeds', data:{embeds:[html]}})` → `message.embeds` → `FullHeightIframe.svelte:53-67` renders raw HTML in a sandboxed iframe (`srcdoc`, `allow-scripts`, **no** `allow-same-origin`). Actions/Tools returning `HTMLResponse` (inline) are auto-converted (`middleware.py:1117-1215`).

## Verdict

- **Can a Function alone produce a custom-rendered UI with ZERO frontend changes?**
  **Qualified YES — only via the sandboxed iframe/`embeds` channel**, never as a native Svelte component. A Filter/Pipe/Tool/Action can emit an embed (arbitrary HTML/CSS/JS in an iframe).
- **Native, first-class, in-message component tree (schema-driven Svelte widgets)?**
  **NO — frontend changes are mandatory.** There is no registry; custom `output` types and custom socket events are ignored. This confirms the need for a minimal renderer integration (see `ARCHITECTURE_OPTIONS.md`).

Functions can still do all the *non-visual* work: prompt inspection, system-prompt injection, response interception/transform, streaming hooks, secondary-model calls, valves, and global/model/chat enablement.
