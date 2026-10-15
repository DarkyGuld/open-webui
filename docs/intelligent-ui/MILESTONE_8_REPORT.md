# Milestone 8 Report — Server normalization, fallbackMarkdown, @Each

Branch: `intelligent-ui-foundation`. Status: **complete** for the implemented slice; tool/data
bindings (`Query`/`Mutation`) are **prepared, not wired** (documented below).

## Delivered

### 1. `@Each` loops (frontend, lang-core)
`@Each` expands to a **nested array** of element nodes inside `children`. `engines/openui.ts` now
flattens those arrays (recursively) in `mapNode`, so loops render. Verified: a Section containing
`@Each($items, item, Badge(item))` renders all items.

### 2. Server `fallbackMarkdown` (Filter, Python)
`filter.py` `outlet` now adds `fallback_markdown` to each `intelligent_ui` output item — a static
text rendering of the block (its string literals as Markdown bullets), so clients that cannot render
the UI still show something meaningful. The human prose in `message.content` is untouched.

### 3. Server normalization
The outlet already extracts blocks, assigns a stable content-hash id, records `output_schema_version`
and `catalog_version`, and enforces the payload path. M8 adds the fallback and keeps the item
engine-agnostic.

## Not wired (prepared / documented)

- **`Query`/`Mutation` → Open WebUI tools** (server-resolved data, e.g. `AsyncImage`, tool-result
  bindings). Design: the frontend would supply a `ToolProvider` backed by an Open WebUI endpoint;
  lang-core's `createQueryManager` + `QuerySnapshot` already exist in our dependency. This needs a
  new backend endpoint + permission model — deferred to keep M8 bounded.
- **`@Set`/`@Reset` action steps → store.** Design: map OpenUI action plans to `store.set`. Our
  dispatcher already validates actions; the remaining work is exposing `ActionPlan` from the parser
  and executing steps against the store.

## Tests

- **vitest: 58 passed** — adds `@Each` expansion test; versioning test accepts `fallback_markdown`.
- **pytest: 39 passed** — adds fallback tests (strings listed, code dropped, empty → placeholder,
  outlet item includes fallback).
- **Production build: green.**
- **Playwright: 2 screenshots**, 0 errors — `@Each` renders all items.

## Screenshots (`audit/local/intelligent-ui/milestone-8/`)

`01-each-loop`, `02-each-mobile`.

## Upstream / core files changed (M8)

**None.** All changes are our own files (`engines/openui.ts`, `schema.ts`, `types.ts`,
`filter.py`, tests). No new dependencies.

**Cumulative M1–M8:** still ~13 core files, ~160 lines.

## Regressions

None. M1–M7 tests remain green; OFF remains a true no-op.

## Limitations

- `fallbackMarkdown` is heuristic (no server-side OpenUI parser) — it lists string literals rather
  than a structured text rendering.
- `Query`/`Mutation` and `@Set`/`@Reset` not wired (see above).
- Remaining M5 component families (tabs/charts/media) still pending.

## Readiness for M9

Ready. Next: **M9 AppBlock escape hatch** — reuse Open WebUI's existing sandboxed iframe
(`FullHeightIframe`) with theme CSS variables + autosize, behind an opt-in flag, with an allow-listed
`sendPrompt`/`openLink` bridge and native/Markdown fallback.

## Do not start M9 automatically.
