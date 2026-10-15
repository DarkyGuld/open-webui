# Milestone 9.4 Report — Native composition and component breadth

Branch: `intelligent-ui-foundation`. Status: **complete**. Zero new dependencies. No core changes.
No planner/router. Rich Widgets untouched.

Goal: expand native Intelligent UI until it can reproduce most ChatGPT-style structured UI without
falling back to Rich Widgets. Full catalog: `NATIVE_COMPONENT_CATALOG.md`.

## 1. Composition primitives (first)

Already present from M5 and strengthened this milestone: **Stack, Row, Grid, Section, Card,
Divider** compose recursively and nest existing components. They are responsive (Grid: 1/2/3
columns; Row wraps), mobile-safe, dark/light (Tailwind `dark:` tokens), and bounded by the central
limits (depth/node/children). They render inline in `NodeRenderer.svelte` via `<svelte:self>`, so
they work with streaming, durable output, and reactive state unchanged.

## 2. Tabs

`Tabs([Tab("Label", [children]), …])`. Local selected-tab state (no model call). Rendered inline
with `role="tablist"`/`role="tab"`/`role="tabpanel"`, `aria-selected`, and **Arrow/Home/End**
keyboard navigation. Tab panels can contain queries, state and actions. Tab children may be any
container/leaf. Mobile-safe (tab bar wraps).

## 3. Charts

`Chart(chartType, title?, labels, series)` where `chartType ∈ line|bar|area|pie|donut` and `series`
is `[{name, values:[number]}]`. Backed by **chart.js**, already an Open WebUI dependency
(`ModelActivityChart.svelte`, `FullHeightIframe.svelte` import `chart.js/auto`) — **no new package**.
Typed data only; **no arbitrary JS callbacks**. Supports title, labels, datasets, axes (line/bar/
area), legend + tooltip (via chart.js), responsive resize, theme integration (reads the `dark`
class, re-renders on theme change via a `MutationObserver`), and loading/empty/error states.
**Query-backed**: pass an allow-listed `source`; column 0 → labels, numeric columns → series (see
`chartDataFromQuery`).

## 4. Progress

`Progress(label?, value, status?, source?)`. Bounded 0–100 (`role="progressbar"`,
`aria-valuenow/min/max`). `value` may be a `$state` expression; with `source` the value derives from
the first numeric cell of the query result.

## 5. Timeline

`Timeline(title?, items, source?)`; items are `{title, timestamp?, description?, status?}` with
`status ∈ done|active|pending|error`. Rendered as a semantic `<ol>` with status dots. Query-backed
via `[title, timestamp, description, status]`.

## 6. Media / Gallery

`Gallery(title?, items)` with items `{src, caption?, alt?}`. **Reuses Open WebUI's `Image.svelte`**,
which enforces the existing media policy (`safeImageUrl`, `allowExternal=false`): only same-origin,
relative, `data:` and gravatar URLs load — **no arbitrary remote origins**, so no client-side
IP/UA/Referer leaks. Rendered as `<figure>/<figcaption>`; single image or responsive grid.

## 7. Richer forms

Added **Textarea**, **Radio** (radio group), **Field** (labelled group with optional description and
**validation message**), and **Form** (grouped fields). They use local `$state` + `@Set`/`@Reset` +
Query/Mutation bindings. Side effects only through a `Button` (registered mutation id → native
confirmation) — **no arbitrary submit handlers**. Form/Field render semantic elements; Radio uses
`fieldset`/`legend`.

## 8. Map — evaluated, deferred

`leaflet` **is** an Open WebUI dependency (`MapSelector.svelte`), so no new package would be needed.
It is **deferred** anyway: the map's only useful form loads **remote tiles** (`tile.openstreetmap.org`)
on every render, i.e. an external network request driven by model-supplied coordinates — which
conflicts with the "no arbitrary remote loading for model content" rule and would leak the user's
IP to a third party. Reusing it safely would require a self-hosted/same-origin tile policy. Documented
as deferred; the zero-dependency rule is not weakened.

## 9. Catalog design

The OpenUI catalog (`catalog.ts`) is now a compositional tree, not a flat list, e.g.
`Grid(Card(Metric), Card(Chart))` and `Section(Tabs(Tab(...)))`. `catalog_version` bumped **3 → 4**;
v1–v3 items still render (`SUPPORTED_CATALOG_VERSIONS = [1,2,3,4]`). Schemas stay strict
(`.strict()`, `.max()`); the server prompt is regenerated from the catalog.

## 10. Limits (centralized in `limits.ts`)

`MAX_DEPTH 6`, `MAX_NODES 120`, `MAX_CHILDREN 12`, **`MAX_TABS 6`, `MAX_CHART_POINTS 60`,
`MAX_CHART_SERIES 6`, `MAX_TIMELINE_ITEMS 30`, `MAX_GALLERY_ITEMS 12`, `MAX_FORM_FIELDS 20`,
`MAX_RADIO_OPTIONS 12`**. Oversized model output is rejected safely → fallback (never breaks chat).

## 11. Query / Mutation composition

Validated: Query → Table (`Data`), Query → Chart, Query → Timeline, Query → Progress, Form →
Mutation, Tabs containing query-backed content. **No second data-binding mechanism** — all
components use the same `runQuery` registry via `query-binding.ts` (lifecycle + typed derivations).

## 12. State / logic composition

Validated inside nested layouts: `$state`, expressions, ternary, `@Each`, `@Set`, `@Reset`. Examples:
slider → chart/metric, select/switch → visible content, button resets form, tabs preserve local
state. No model call for local interactions.

## 13. Streaming

All new components flow through the same streaming pipeline (`parseIntelligentUIPartial`, last-good
tree, state preserved across recompilation, final complete validation authoritative). Unit tests
cover partially-received nested layouts (never throws) and complete-program parsing.

## 14. Accessibility

Native semantics: `progressbar`, `tablist/tab/tabpanel` + arrow keys, `fieldset/legend`, `ol`,
`figure/figcaption`, labels, `role="img"` chart with an `sr-only` data summary, `role="alert"` for
validation. Focus visibility and tab order preserved.

## 15. Visual language

All components use Open WebUI tokens (spacing, `rounded-xl`, borders, `dark:` variants, indigo
accent, existing icons). Capability mirrors ChatGPT; the look is Open WebUI's.

## 16–17. Fixtures & Playwright

Deterministic fixtures in `tests/fixtures/intelligent-ui/m94-*.txt` (dashboard, pricing, analytics,
form, gallery, nested, invalid-limit). **13 screenshots** in
`audit/local/intelligent-ui/milestone-9.4/` (dashboard dark/light/mobile, tabs, chart,
query-backed chart, progress, timeline, gallery, form, form confirmation, nested, invalid-limit
fallback). **0 unexpected console errors.** Chart canvas, tabs, progressbar, gallery figures,
form radios and the confirmation dialog all verified.

## 18. Tests

- **vitest: 104 passed** (adds `components-9_4.test.ts`, 35 tests: fixtures, nesting/depth/node
  limits, tabs, chart validation/limits, progress bounds, timeline limits, gallery validation, form
  state, query-backed derivations, streaming, durable state, fallback/OFF).
- **pytest: 46 passed** (catalog_version 4).
- **Production build: green.**
- All M1–M9.3 tests remain green.

## 19. Dependencies

**None added.** Chart reuses `chart.js`; Gallery reuses the `Image` primitive; everything else is
native HTML/Svelte/Tailwind.

## 20. Routing

No planner/router and no new model call. The catalog prompt gained the new components/examples only.

## Upstream / core files changed (M9.4)

**None.** All changes are our own files under `src/lib/intelligent-ui/`, the generated
`catalog_prompt.py`, fixtures, tests, and the audit scripts.

## Deferred

- **Map** (see §8).
- Server-side durable tab state (tab choice is transient view state; kept local).
- Additional chart types (radar/scatter) — deferred until needed.

## Readiness for ChatGPT-parity polish

Native breadth now covers layout, tabs, charts, progress, timeline, media, forms and data bindings.
Next: visual/interaction polish pass and (only if the routing benchmark proves it necessary) an M10
planner.

## Stop
