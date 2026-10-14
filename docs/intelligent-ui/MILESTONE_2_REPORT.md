# Milestone 2 Report — Native Intelligent UI Rendering Slice

Branch: `intelligent-ui-research-foundation`. Scope: renderer infrastructure only.
**No planner, no system-prompt changes, no model-generated schema, no extra model call.**

## Architecture implemented

```
:::intelligent-ui{v="1"}            (existing colonFence tokenizer produces the token)
   <payload>                        (engine payload; OpenUI Lang by default)
:::
        │
        ▼  MarkdownTokens.svelte  (ONE core edit: dispatch by fenceType)
   IntelligentUIBlock.svelte
        │
        ▼  src/lib/intelligent-ui/adapter.ts   ← the ONLY boundary
   version check → optional envelope unwrap → engine.parse → strict Zod validation
        │
        ├── engines/openui.ts      (@openuidev/lang-core)   ← primary, default
        └── engines/json-render.ts (json-render shape)      ← fallback capability
        │
        ▼  registry.ts  (metric | comparison | table)
   Metric.svelte / Comparison.svelte / Table.svelte   (native Open WebUI styling)
        │
        └── on any failure → IntelligentUIFallback.svelte (safe, never breaks chat)
```

Module layout matches the requested structure (`schema.ts`, `types.ts`, `registry.ts`,
`validation.ts`, `adapter.ts`, `engines/*`, `components/*`) under `src/lib/intelligent-ui/`.

## Actual token format

```
:::intelligent-ui{v="1"}
root = Metric("Monthly cost", "5 294 kr", "Estimated for 60 months")
:::
```

- `fenceType` = `intelligent-ui` (produced by the existing generic colonFence tokenizer).
- Attribute `v` = transport/envelope version (colonFence attributes are quoted; omitted
  defaults to `1`).
- Payload = engine content. Default engine (`openui`) expects **OpenUI Lang**.
- A JSON envelope (`{"version":1,"catalog_version":1,"content":"..."}`) is also accepted
  (forward-compatible) and unwrapped by the adapter.

## Persisted representation

The **raw token text is stored verbatim inside the normal assistant `message.content`** —
no new DB field, no second representation, no message-model change. On reload the same
`Markdown → MarkdownTokens → IntelligentUIBlock` path re-parses and re-renders identically
(verified: `08-persisted-reload.png`). Old/future versions fail gracefully (unsupported
version → fallback). The engine is **not** persisted, so replacing OpenUI later does not
invalidate stored messages.

## Adapter interface

`src/lib/intelligent-ui/adapter.ts`

```ts
parseIntelligentUI(
  input: { version?: string | number | null; content: string },
  engineId: IntelligentUIEngineId = 'openui'   // system-controlled; never model-selected
): ParseOutcome  // { ok: true, node, engine } | { ok: false, reason, engine? }
```

`IntelligentUIEngine` = `{ id; parse(content): UINode }`. Only the adapter imports engine
packages; the rest of the app imports the adapter (and `registry.ts` for tests).

## OpenUI APIs used (`@openuidev/lang-core`)

- `defineComponent({ name, description, props: z.object(...), component })` — for Metric,
  Comparison, Table. `component` is an opaque placeholder (lang-core never inspects it).
- `createLibrary({ components })` → `library.toJSONSchema()`.
- `createParser(schema)` → `parser.parse(text)` → `{ root: ElementNode | null, meta }`.
- `ElementNode.typeName` / `.props` (positional args → named props) → mapped to canonical nodes.

We deliberately do **not** depend on `@openuidev/svelte-lang`.

## json-render fallback status

Implemented in `engines/json-render.ts` and exercised by a unit test
(`parseIntelligentUI(spec, 'json-render')`). It maps the json-render flat spec
(`{root, elements}`) or a plain `{type, ...props}` object to canonical nodes. It is **not
executed on the normal path** (default engine = `openui`). No user-facing engine selector.

## Supported components (exactly three)

| type | props (validated) |
|---|---|
| `metric` | `label`, `value`, `description?` |
| `comparison` | `title?`, `items[{ name, attributes[] }]` (2–4 items) |
| `table` | `title?`, `columns[]`, `rows[][]` |

Nothing else (no charts, forms, maps, buttons, layout primitives, HTML, JS).

## Validation rules

Zod discriminated union (`.strict()` — unknown fields rejected), plus limits:
required fields, types, string max length, table row/column counts, comparison item/attribute
counts, payload byte size. Unknown components are rejected by the union and by the registry.
Envelope `version` must equal `SUPPORTED_VERSION`; `catalog_version` accepted.

## Security limits (`src/lib/intelligent-ui/limits.ts`)

```
SUPPORTED_VERSION = 1, CATALOG_VERSION = 1
MAX_PAYLOAD_BYTES = 16384
MAX_NODES = 1, MAX_DEPTH = 1            (single root component in M2)
MAX_STRING_LENGTH = 2000
MAX_TABLE_ROWS = 50, MAX_TABLE_COLUMNS = 12
MAX_COMPARISON_ITEMS = 4, MAX_COMPARISON_ATTRIBUTES = 12
```

No arbitrary HTML/JS/CSS, no event-handler strings, no component imports from the model,
no URLs. Rendering uses Svelte text interpolation only (never `{@html}`).

## Streaming behavior

The colonFence tokenizer only emits a token once the closing `:::` is present. Therefore an
**incomplete** `:::intelligent-ui` block is not tokenized and renders as ordinary text until
it closes — no partial/incorrect UI, no flashing, no exceptions. Normal streaming of the
surrounding message is untouched. We do **not** attempt incremental component streaming in
M2 (correctness first).

## Fallback behavior

Any failure (malformed token, unsupported version, malformed OpenUI Lang, unknown component,
invalid props, oversized payload, excessive nodes/rows/items, parser exception) →
`IntelligentUIFallback.svelte`: a muted, dashed panel "Intelligent UI unavailable" plus the
raw payload as **plain text** (no HTML). The chat never breaks; internal reasons are logged
(`console.debug`) and kept in a visually-hidden node, never thrown at the user.

## Tests / results

- **vitest: 21 passed** (3 files) — `adapter.test.ts` (14: valid metric/comparison/table,
  envelope unwrap, invalid version/component/openui/malformed/oversized, row/item/string
  limits, json-render engine, no HTML/JS in output), `registry.test.ts` (3: exactly three
  components, unknown rejected), plus the pre-existing `versionDiff.test.ts` (4).
- **pytest (Milestone 1): 22 passed** — unchanged, OFF contract intact.
- **Production build: green** (`NODE_OPTIONS=--max-old-space-size=8192 npm run build`).
- **Playwright: 8 screenshots**, all components found, fallback found, persisted-reload
  found, **0 page/console errors** (excluding the known pre-auth socket 403).

## Screenshots (`audit/local/intelligent-ui/milestone-2/`)

`01-metric-dark.png`, `02-metric-light.png`, `03-comparison-dark.png`,
`04-comparison-mobile.png`, `05-table-dark.png`, `06-table-mobile.png`,
`07-invalid-fallback.png`, `08-persisted-reload.png`.

## Upstream files changed

Exactly **one** core file: `MarkdownTokens.svelte` (+1 import, wrap the `colonFence` branch
in an `{#if token.fenceType === 'intelligent-ui'}`). Everything else is new files. See
`UPSTREAM_IMPACT.md` for merge-risk and future isolation.

## Known limitations

- No planner/generation yet (deliberate): components render only from deterministic fixtures.
- Single root component only (`MAX_NODES = 1`, `MAX_DEPTH = 1`) — no layout nesting.
- Cells accept plain text only; no rich formatting.
- New UI strings are literal English (i18n keys pending).
- `catalog_version` is validated but not yet used to gate catalog changes.

## Recommended Milestone 3 (not implemented)

1. **Catalog + prompt:** expose the OpenUI catalog and generate the system prompt via
   `openuiLibrary.prompt()` (server-side), versioned.
2. **Filter/planner integration:** wire `backend/open_webui/intelligent_ui/filter.py` `inlet`
   to the resolver — OFF = no-op; AUTO/ON inject the catalog prompt and (optionally) run a
   planner; emit the `:::intelligent-ui` block.
3. **Auto/On behavior + graceful degradation** per provider capability.
4. **Security hardening** for generated content; telemetry disabled.
5. **Durability:** consider persisting rendered UI as a structured `output[]` item (survives
   reload/arena) if needed.
6. **Tests:** provider-without-structured-output, streaming of real generated blocks,
   interaction, long responses.
