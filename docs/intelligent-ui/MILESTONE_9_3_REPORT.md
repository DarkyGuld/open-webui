# Milestone 9.3 Report — Query / Mutation / Open WebUI tool bindings

Branch: `intelligent-ui-foundation`. Status: **complete**. Zero new dependencies. No core changes.

## Reused Open WebUI integration points

Intelligent UI is a **typed frontend to existing Open WebUI REST capabilities** — no parallel
executor, no new backend. All calls are same-origin with the user's token, so Open WebUI's own
auth + permission checks apply.

| Capability | Endpoint | Type |
|---|---|---|
| `conversation.notes` | `GET /api/v1/notes/` | read-only query |
| `library.files` | `GET /api/v1/files/` | read-only query |
| `knowledge.collections` | `GET /api/v1/knowledge/` | read-only query |
| `notes.create` | `POST /api/v1/notes/create` | confirm-risk mutation |

## Query registry (`src/lib/intelligent-ui/queries.ts`)

Allow-listed, host-controlled. Each entry: stable id + `run(token, signal)`. The model references a
source id via the `Data` component: `Data("conversation.notes", "My notes")`.

- **Normalization**: results reduced to safe `{columns, rows}` (no raw backend objects).
- **Limits**: `MAX_RESULTS 50`, `MAX_RESULT_BYTES 64 KB`, `TIMEOUT_MS 10000`, `MAX_CONCURRENT 3`,
  `MAX_COLUMNS 12`. `AbortController` timeout; concurrency guard; no polling.
- **Unknown source** → safe error state.
- **States**: `idle → loading → success | error` (native skeleton / empty / error; never raw
  exceptions — errors are logged to a hidden node only).

## Mutation registry (`src/lib/intelligent-ui/mutations.ts`)

Allow-listed, `risk: 'confirm'`. First mutation: `notes.create`. The model passes a registered id as
the Button's second argument: `Button("Save note", "notes.create", {title, content})`.

- **Risk model**: READ (query) / LOCAL (@Set/@Reset) / CONFIRM (mutation) / FORBIDDEN (everything
  else — unknown ids, arbitrary HTTP/code/tool).
- **Host confirmation**: the mutation runs only after the native `ConfirmDialog` is approved; the
  model cannot bypass it.
- **Replay protection (mandatory)**: mutations run **only from an explicit user click**
  (`handleOpenUIAction`), never on render, reload, history open, or streaming resume. Verified:
  reloading the chat produces **no** POST.
- **Unknown mutation id** → rejected (no execution).

## @Run

`@Run` remains dropped for the model (not interpreted as arbitrary execution). The safe bridge is the
Button **registered-id string** form above, which maps to the allow-listed registry only.

## Model visibility / context

Query results are **UI-only** by default (never auto-added to conversation context). Mutations are
user-initiated; their result is not echoed into context automatically.

## Tests

- **vitest: 69 passed** — adds query/mutation registry tests (allow-list, unknown id rejection,
  normalization, row caps, backend-error propagation, confirm-risk).
- **pytest: 46 passed**.
- **Production build: green.**
- **Playwright: 10 screenshots**, 0 unexpected errors.

## Screenshots (`audit/local/intelligent-ui/milestone-9.3/`)

`01-query-loading`, `02-query-success`, `03-query-empty`, `04-query-error`, `05-query-reactive-ui`,
`06-mutation-confirmation`, `07-mutation-cancelled`, `08-mutation-success`,
`09-mutation-permission-denied`, `10-reload-no-replay`.

Verified behaviours: success table (`Seed note`), empty (`knowledge`), error (unknown source),
confirmation dialog, cancel → no POST, confirm → POST, permission-denied (403) → safe, reload → no
replay.

## Performance (rough)

- Query: fetch-bound; normalization is O(rows); UI re-render immediate.
- Mutation: confirmation → single POST. No measurable overhead added.

## Security

See `TOOL_BINDINGS_SECURITY.md`. No arbitrary URL/route/tool/code; allow-listed registries only;
confirmation required for side effects; replay-proof; result normalization + limits; OFF gating
preserved (no new query/mutation UI when native generation is OFF).

## Upstream / core files changed (M9.3)

**None.** All new code is our own files (`queries.ts`, `mutations.ts`, `components/Data.svelte`,
catalog/schema/types/registry/engine/IntelligentUIBlock updates, prompt, tests, audit script).

**Cumulative M1–M9.3:** ~20 core files, ~235 lines. **No new dependencies.**

## Known gaps

- Only 3 read-only queries + 1 mutation are registered; expand deliberately.
- Query results are not fed back to the model automatically (by design).
- `library.files`/`knowledge.collections` assume the standard response shapes; adjust if upstream
  changes.
- No background polling (intentional).

## Readiness for the next milestone

Component breadth (tabs/charts/media/progress/timeline/forms/map) is the next milestone; the
query/mutation substrate is in place for data-driven components.

## Stop
