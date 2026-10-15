# Intelligent UI — Query / Mutation / Tool Bindings (design)

Status: **designed, not implemented** (deferred to the next milestone). Phase A of Milestone 9.2
(@Set/@Reset) is complete; Phase B introduces a data/permission surface that must not be rushed and
must reuse Open WebUI's existing tool/permission infrastructure rather than create a parallel
privileged executor.

## Principles

- The Intelligent UI layer is a **typed UI frontend to the normal Open WebUI tool system**, never a
  parallel privileged execution path.
- The model can **never** supply arbitrary URLs, code, tool names, or query ids.
- Everything is **allow-listed, schema-validated, permission-checked, limited, and (for mutations)
  confirmed**.

## Query architecture (target)

```
OpenUI Query("source")
 → adapter normalization (source id + args)
 → host-controlled query registry (allow-list)
 → approved Open WebUI data source (existing endpoint / read-only tool)
 → normalized + schema-validated result
 → store state  (idle | loading | success | error)
 → native UI re-render
```

Use lang-core's `createQueryManager` / `QuerySnapshot` where it fits; otherwise a thin host registry
against existing endpoints. No arbitrary HTTP.

### Query registry entry

| Field | Purpose |
|---|---|
| `id` | stable, allow-listed identifier |
| `inputSchema` | Zod schema for args |
| `outputSchema` | Zod schema for the result |
| `permission` | required Open WebUI permission |
| `timeout` | hard timeout |
| `maxResults` / `maxBytes` | result caps |
| `cache` | optional TTL |

### First read-only adapters (reuse existing infra)

- `models` → `GET /api/models` (user-authorized)
- `capabilities` → `GET /api/v1/capabilities`
- `config` → `GET /api/config` (public features)

Unknown query id → rejected safely.

### Limits

`MAX_QUERY_RESULTS`, `MAX_QUERY_BYTES`, `QUERY_TIMEOUT`, `MAX_CONCURRENT_QUERIES`. No polling loops,
no recursive queries, no query storms.

## Mutation architecture (target)

```
OpenUI Mutation("action")
 → adapter normalization
 → mutation registry (allow-list)
 → validate input (Zod)
 → permission check (Open WebUI)
 → risk classification (READ | SAFE_LOCAL | CONFIRM | FORBIDDEN)
 → host confirmation (native ConfirmDialog) for CONFIRM
 → existing Open WebUI tool/action
 → normalized result → state
```

- **READ**: may run automatically if explicitly allowed.
- **SAFE_LOCAL**: no backend write (already covered by @Set/@Reset).
- **CONFIRM**: external mutation / create-update-delete / account-affecting / tool side effects →
  native confirmation required; the model cannot bypass it.
- **FORBIDDEN**: unknown tool, arbitrary shell/python/js/http.

Never call arbitrary functions by string name. Reuse the existing action-safety framework
(`actions.ts`).

## Tool result normalization

Tool/query results are normalized → schema-validated → safe serializable data before entering UI
state. Never bind raw backend objects into components.

## Model visibility of state

- Local UI state stays local unless a user action requires a model follow-up (`@ToAssistant`).
- Query results are exposed to the model only when needed.
- Mutation results may be summarized back into conversation context.
- Avoid inflating context.

## Fallback

Query fails → native error state / fallback text. Mutation denied → no action. Mutation fails → safe
result message. Unknown binding / malformed schema → rejected / fallback. The conversation never breaks.

## Why deferred

Phase B adds a backend data + permission + confirmation surface. Implementing it safely requires new
backend endpoints, permission wiring, and a full security test matrix. It is scoped as the **next
milestone** rather than rushed, per the project's safety rules ("no parallel privileged execution
system"; "STOP and explain before broadening scope").
