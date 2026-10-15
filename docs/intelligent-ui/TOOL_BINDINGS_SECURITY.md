# Intelligent UI — Tool Bindings Security (M9.3)

## Model

Intelligent UI is a **typed frontend to existing Open WebUI REST capabilities**. It is **not** a
tool/runtime/backend of its own. All reads/writes go through allow-listed registries that call
existing endpoints with the user's token (so Open WebUI's auth/permission checks apply).

## Boundaries

| Allowed | Forbidden |
|---|---|
| Allow-listed query ids (`conversation.notes`, `library.files`, `knowledge.collections`) | Arbitrary URLs / routes / HTTP methods |
| Allow-listed mutation id (`notes.create`), confirm-risk | Arbitrary tool names / functions / code |
| Same-origin fetch with the user's token | Arbitrary Python / shell / SQL / JS |
| Normalized `{columns, rows}` results | Raw backend objects bound into components |

## Risk model

- **READ** — queries; no side effect.
- **LOCAL** — `@Set`/`@Reset`; store only.
- **CONFIRM** — mutations; native confirmation required.
- **FORBIDDEN** — unknown id, arbitrary code/HTTP/tool, privilege escalation → rejected.

## Confirmation

Host-controlled only. The model cannot forge or bypass it: mutations execute solely inside
`handleOpenUIAction` after the native `ConfirmDialog` resolves `true`. Cancel → no execution.

## Replay protection (mandatory)

Mutations are **user-event-driven only**. They never run because a chat reloads, history opens,
output re-parses, a component remounts, or streaming resumes. Verified by Playwright: reloading the
mutation chat produces **no** POST to `/api/v1/notes/create`.

## Limits

`MAX_QUERY_RESULTS 50`, `MAX_QUERY_RESULT_BYTES 64 KB`, `QUERY_TIMEOUT_MS 10000`,
`MAX_CONCURRENT_QUERIES 3`, `MAX_COLUMNS 12`. Prevents query storms, runaway polling, huge payloads.

## Error handling

Query/mutation failures are caught; the UI shows a safe state (error / no-op) and the raw error is
kept out of the UI (hidden node / console only). The conversation never breaks.

## Test matrix

| Attempt | Result |
|---|---|
| Unknown query id | rejected (safe error state) |
| Unknown mutation id | rejected (no execution) |
| Arbitrary URL / HTTP method | not possible (registry only) |
| Arbitrary tool/function name | not possible (registry only) |
| Arbitrary code / shell / python | not possible (no eval) |
| Oversized input/output | capped (limits) |
| Malformed args | validated; unknown id rejected |
| Permission denial (403) | safe failure, no crash |
| Mutation without confirmation | blocked (host dialog) |
| Forged confirmation | blocked (host-controlled) |
| Mutation replay on reload | blocked (user-event only) |
| Concurrent query abuse | capped (MAX_CONCURRENT) |
| Recursion / polling | none implemented |
| Query timeout | aborted (AbortController) |
| Model-hallucinated registry id | rejected |
