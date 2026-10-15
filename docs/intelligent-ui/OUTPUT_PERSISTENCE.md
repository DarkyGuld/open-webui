# Intelligent UI — Output Persistence

## Model

| Layer | Storage | Survives |
|---|---|---|
| Human/model text | `message.content` | reload, history, Arena |
| Structured artifact | `message.output[]` item `intelligent_ui` | reload, history, Arena |
| Interaction state | browser `localStorage` (`intelligent-ui-state-v1`) | reload, reopen (same browser) |

## Structured output item

Produced by the Filter `outlet` (`backend/open_webui/intelligent_ui/filter.py`) for each
`:::intelligent-ui` block found in the assistant text:

```json
{
  "type": "intelligent_ui",
  "output_schema_version": 1,
  "catalog_version": 2,
  "id": "iu_<sha256(content)[:16]>",
  "format": "openui-lang",
  "content": "<raw openui lang>",
  "state": {}
}
```

- **Stable id** (content hash) → survives reload/regeneration; usable as a state key.
- **`format`** keeps the item schema engine-agnostic (OpenUI is not hard-coded into the schema).
- **Versioned independently**: `output_schema_version` (item shape) and `catalog_version`
  (component/action contract).
- Old messages without `output[]` still render from `content`.

## Rendering & compatibility

- Rendering remains content-based (adapter parses the fence). The `output[]` item is durable
  metadata; `structuredOutput.ts` ignores `intelligent_ui` items so they never render as text.
- Preferring `output[]` for render (when present, validate then render; else fall back to
  `content`) is planned but not wired in M4 (the fence block cannot see the parent message).

## State

- Durable state key: `intelligent-ui-state-v1:{chatId}:{blockId}` (bounded 4 KB).
- Only meaningful state is persisted (selections, confirmed values); ephemeral UI state is not.
- Server-side durable state (cross-device) is a future step: extend the `output[]` item's
  `state` and write it via the existing chat-update API on interaction (debounced).

## Migration

- `catalog_version` {1,2} accepted; unknown → fallback (never silently interpreted).
- `output_schema_version` must equal 1; unknown → item ignored, `content` fallback used.
- No DB migration required (chat is stored as a JSON blob; `output[]` is an existing field).
