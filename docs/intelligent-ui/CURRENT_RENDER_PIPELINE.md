# Current Render Pipeline (Open WebUI fork)

Source of truth: this repository (fork of `open-webui/open-webui`, version 0.12.1).
All paths relative to repo root; line numbers from the checked-out source.

## End-to-end flow

```
PROVIDER (OpenAI / Ollama / Anthropic / Responses API / Pipe)
  │  HTTP/SSE
  ▼
BACKEND  POST /api/chat/completions            backend/open_webui/main.py:1144
  ├─ resolve model/params/metadata              main.py:1151-1362
  ├─ create chat + assistant placeholder        main.py:1364-1630
  ├─ process_chat()                             main.py:1644-1683
  │    ├─ process_chat_payload()                utils/middleware.py:2398
  │    │     RAG/files/tools/system prompt/filters(inlet)
  │    ├─ chat_completion_handler()             utils/chat.py:148
  │    └─ process_chat_response()               utils/middleware.py:6809
  │          └─ streaming_chat_response_handler  middleware.py:4469
  │               └─ stream_body_handler         middleware.py:4961
  │                    normalizes provider SSE → OpenAI-Responses `output[]` items
  └─ returns {status, task_ids[], chat_id}      main.py:1898  (tokens do NOT travel here)
  ▼
TRANSPORT  socket.io room user:{id}, event name "events"   socket/main.py:1324
  ▼
FRONTEND STREAM STATE
  +layout.svelte:1295  socket.on('events', chatEventHandler)
  Chat.svelte:1413     chatEventHandler  (type switch, ~50 event types)
    ├─ status/files/embeds/error/follow_ups/source/... mutate the message object
    ├─ chat:completion        → chatCompletionEventHandler   Chat.svelte:3346
    └─ response:completion    → responseCompletionEventHandler Chat.svelte:3325
                                 → applyResponseStreamEvent  structuredOutput.ts:528
  history lives in Chat.svelte:465 (plain object, not a store)
  ▼
RENDER
  Messages.svelte:508 → Message.svelte:93 → ResponseMessage.svelte:849
    → ContentRenderer.svelte:295
        ├─ output?.length → StructuredOutputRenderer.svelte:73
        └─ content        → Markdown.svelte:80 → MarkdownTokens.svelte:179
```

## Backend wire format

Every provider is normalized into an **OpenAI-Responses-style `output[]` array**:

- `output_id()` `utils/middleware.py:292`; item types: `message` (`content:[{type:'output_text',text}]`), `reasoning`, `open_webui:code_interpreter`, `function_call`, `function_call_output`, `web_search_call`/`file_search_call`/`computer_call`, `open_webui:context_compaction`.
- Responses-stream reducer backend side: `handle_responses_streaming_event` `middleware.py:625`; completion event shaping `get_response_completion_event_data` `middleware.py:611`.

Field attachment points:

| Field | Where |
|---|---|
| `content` (string) | assembled from `content_parts`; persisted `main.py:1707`, `middleware.py:6636` |
| `output[]` | seeded `middleware.py:4841`; streamed `5637-5731`; final `6619-6668` |
| `sources` | `middleware.py:3339,3352-3353`; per-citation `source` events `5199-5217` |
| `status`/`statusHistory` | `middleware.py:1612,1680,...` emitted as `{type:'status'}` |
| `code_execution` | emitted `{type:'source', data:{type:'code_execution',...}}` |
| `tool_calls` | stream assembly `5349-5475`; items `6012-6025` |
| `embeds` (rich UI!) | `function_call_output.embeds` `6181`; socket persistence `socket/main.py:1444-1460` |
| `files` | `chat:message:files` `5496`; `function_call_output.files` `6181` |
| `usage`, `followUps`, `title`, `error` | `5277`, `3967`, `4033`, `4897` |

SSE chunk shapes: legacy OpenAI-delta `{type:'chat:completion', data:{output, usage, done}}` (`middleware.py:5042-5101`); Responses passthrough `type: response.*` (`middleware.py:5035-5102`).

## Frontend messages & state

- `history` is owned by `Chat.svelte:465` (`{currentId, messages}`), not a global store; persisted via `updateChatById`.
- Streaming updates: `responseCompletionEventHandler` (`Chat.svelte:3325`), `chatCompletionEventHandler` (`Chat.svelte:3346`), reducer `applyResponseStreamEvent` (`Messages/structuredOutput.ts:528`).
- Message fields: `output` (`:3356`), `content` (`:3331`), `sources` (`:1664`), `embeds` (`:1585`), `files` (`:1579`), `statusHistory` (`:1520`), `code_executions` (`:1645`), `followUps` (`:1608`), `usage` (`:3410`).

## Renderer tree & special-content branches

`MarkdownTokens.svelte` block dispatch (`:179`+): `hr:180`, `heading:182`, `code:192` (→ `CodeBlock`), `table:218`, `blockquote:303` (→ `AlertRenderer`), `list:327`, `detail_group:430` (→ `ConsecutiveDetailsGroup`→`ToolCallDisplay`), `details:502`, `html:560` (→ `HtmlToken`), `iframe:562`, `paragraph:575`, `text:597`, `katex:623/627`, **`colonFence:631`** (→ `ColonFenceBlock`), `space:643`, default `645` (logs "Unknown token").

Inline dispatch `MarkdownInlineTokens.svelte`: `codespan:122`, `citation:157`, `mention:147`, `iframe:134`, `image:114`, etc.

## Existing structured/custom-content paths

| Path | Trigger | Renders |
|---|---|---|
| `message.embeds` → `FullHeightIframe` | `ResponseMessage.svelte:735-752` | **inline**, sandboxed iframe (URL or raw HTML `srcdoc`; `allow-scripts`, **not** `allow-same-origin`) |
| `output[]` → `StructuredOutputRenderer` | `ContentRenderer.svelte:295` | inline; only known item types rendered |
| Tool-call embeds | `ConsecutiveDetailsGroup:313`, `ToolCallDisplay:177` | inline |
| Artifacts (HTML/SVG) | `ContentRenderer.svelte:146-183` | **side panel** |
| `<file type="html">` / `<iframe>` | `HtmlToken:106`, `MarkdownTokens:562` | inline iframe |
| Citations | `ResponseMessage:920` → `Citations.svelte` | inline + side panel |

**Key limitation:** the frontend is a **closed set of hard-coded render paths**. There is **no component registry keyed by a server-provided type**. Unknown socket event types are dropped (`Chat.svelte:1720`); unknown `output` item types fall back to plain text (`structuredOutput.ts:425-433`); `:::` fences render nested markdown only (`ColonFenceBlock.svelte:79-90`).

## Markdown extension system (cleanest insertion point)

Registered module-scope in `Messages/Markdown.svelte:16-30` (`marked.use(...)`). Existing block extensions to model after:
- `<details>` extension `utils/marked/extension.ts:32-145`.
- **colonFence** `utils/marked/colon-fence-extension.ts:20-66` → `MarkdownTokens.svelte:631` → `ColonFenceBlock.svelte`.

## Top insertion points for an inline "Intelligent UI" renderer

1. **New marked block extension + token branch** (mirrors `colonFence`). New `utils/marked/intelligent-ui-extension.ts`; +2 lines in `Markdown.svelte`; new `IntelligentUIBlock.svelte`; +1 branch in `MarkdownTokens.svelte:631`. **~170-200 LOC, low risk, additive.**
2. **Reuse `colonFence`** and branch on `fenceType==='intelligent-ui'` in `ColonFenceBlock.svelte`. **~10-20 LOC, lowest risk.**
3. **New `output[]` item type + `StructuredOutputRenderer` branch** (+ backend `middleware.py` emitter). **~200-350 LOC, medium risk; durable/persisted, survives reload, works in multi-model arena.**

Full trade-offs: `ARCHITECTURE_OPTIONS.md`.
