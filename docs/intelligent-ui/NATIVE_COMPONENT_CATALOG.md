# Intelligent UI — Native Component Catalog (catalog_version 4)

Single source of truth: `src/lib/intelligent-ui/catalog.ts` (model contract) and `schema.ts`
(runtime validation). Both are kept in sync by tests. `catalog_version` = **4** (v1–v3 still valid).

## Signatures

`?` = optional. `$binding<type>` = a `$variable` reference for two-way binding. Expressions
(`$x * 2`, ternary `$flag ? a : b`) are allowed in any prop.

### Leaves
| Component | Signature | Node type |
|---|---|---|
| `Data` | `Data(source, title?)` | `data` |
| `Metric` | `Metric(label, value, description?, action?)` | `metric` |
| `Comparison` | `Comparison(title?, items, selectable?, action?)` | `comparison` |
| `Table` | `Table(title?, columns, rows, action?)` | `table` |
| `Badge` | `Badge(label, action?)` | `badge` |
| `Divider` | `Divider()` | `divider` |
| `Progress` | `Progress(label?, value, status?, source?)` | `progress` |
| `Chart` | `Chart(chartType, title?, labels, series, source?)` | `chart` |
| `Timeline` | `Timeline(title?, items, source?)` | `timeline` |
| `Gallery` | `Gallery(title?, items)` | `gallery` |
| `Button` | `Button(label, action?, args?)` | `button` |
| `Slider` | `Slider(label, value, min, max, step?)` | `slider` |
| `Select` | `Select(label, value, options)` | `select` |
| `Switch` | `Switch(label, value)` | `switch` |
| `Checkbox` | `Checkbox(label, value)` | `checkbox` |
| `Input` | `Input(label, value, placeholder?)` | `input` |
| `Textarea` | `Textarea(label, value, placeholder?)` | `textarea` |
| `Radio` | `Radio(label, value, options)` | `radio` |

`value` on Slider/Select/Switch/Checkbox/Input/Textarea/Radio is a two-way `$state` binding.

### Containers
| Component | Signature | Node type |
|---|---|---|
| `Stack` | `Stack(children)` | `stack` |
| `Row` | `Row(children)` | `row` |
| `Grid` | `Grid(children)` | `grid` |
| `Section` | `Section(title?, children)` | `section` |
| `Card` | `Card(title?, children, action?)` | `card` |
| `Tabs` | `Tabs([Tab, …])` | `tabs` |
| `Tab` | `Tab(title, children)` | `tab` |
| `Field` | `Field(title, children, description?, error?)` | `field` |
| `Form` | `Form(title?, children)` | `form` |

### Data shapes
- `Chart` `series`: `[{name, values:[number]}]`; `chartType ∈ line|bar|area|pie|donut`.
- `Timeline` `items`: `[{title, timestamp?, description?, status?}]`, `status ∈ done|active|pending|error`.
- `Gallery` `items`: `[{src, caption?, alt?}]` (safe media paths only).
- `Comparison` `items`: `[{name, attributes:[string]}]`.

## Nesting rules

- `Stack` (root) may contain any leaf or container except `Tab` (Tab is only valid inside `Tabs`).
- `Section` ⊃ leaves, `Card`, `Row`, `Grid`. `Grid` ⊃ leaves, `Card`, `Row`. `Row` ⊃ leaves, `Card`.
- `Card` ⊃ leaves only. `Tabs` ⊃ `Tab` only. `Tab` ⊃ leaves, `Card`, `Row`, `Grid`, `Section`.
- `Field` ⊃ leaves (+ `Row`). `Form` ⊃ leaves, `Field`, `Row`, `Grid`, `Section`.
- `Divider` is a separator; do not nest `Stack` inside `Stack`.
- Depth ≤ **6**, nodes ≤ **120**, children ≤ **12** per container.

## Limits (centralized in `limits.ts`)

`MAX_DEPTH 6`, `MAX_NODES 120`, `MAX_CHILDREN 12`, `MAX_TABLE_ROWS 50`, `MAX_TABLE_COLUMNS 12`,
`MAX_COMPARISON_ITEMS 4`, `MAX_TABS 6`, `MAX_CHART_POINTS 60`, `MAX_CHART_SERIES 6`,
`MAX_TIMELINE_ITEMS 30`, `MAX_GALLERY_ITEMS 12`, `MAX_FORM_FIELDS 20`, `MAX_RADIO_OPTIONS 12`.
Violations → safe fallback (chat never breaks).

## Query / state / action integration

- **Query**: `Data`, `Chart`, `Timeline`, `Progress` accept an allow-listed `source`
  (`conversation.notes`, `library.files`, `knowledge.collections`). Same `runQuery` registry for all
  (`query-binding.ts`); idle/loading/success/error/empty states. Derivations: chart (col0→labels,
  numeric cols→series), timeline (`[title,timestamp,description,status]`), progress (first numeric).
- **State**: `$name = default`; inputs bind; expressions/ternary/`@Each` evaluated by lang-core.
- **Actions**: `Button(label, @Set/@Reset/@ToAssistant/@OpenUrl)` or `Button(label, registeredId, args)`
  for a mutation (native confirmation; click-only/replay-proof).

## Reused existing dependencies (no new packages)

- **chart.js** — `Chart` (already used by `ModelActivityChart`, `FullHeightIframe`).
- **Image primitive** (`$lib/components/common/Image.svelte` + `safeImageUrl`) — `Gallery` media
  policy (`allowExternal=false`).
- **ConfirmDialog** — mutation confirmation. **i18n**, Tailwind tokens, existing icons throughout.

## Deferred

- **Map** — `leaflet` exists but its tiles are remote network loads driven by model input; deferred
  pending a self-hosted/same-origin tile policy.
- Extra chart types, server-durable tab state.

## Accessibility & states

Native semantics (`progressbar`, `tablist/tab/tabpanel` + Arrow/Home/End, `fieldset/legend`, `ol`,
`figure/figcaption`, `role="img"` + `sr-only` chart summary, `role="alert"` validation). Every
data-bound component implements loading / empty / error; interactive components have focus/keyboard
states.

## Density & spacing (M9.5)

Spacing is centralized: the model cannot set pixels. Containers space their children with one
`gap-3` rhythm; `IntelligentUIBlock` applies a single outer margin. Component defaults are "normal"
density. See `UX_GUIDELINES.md` for the full policy.

## Standardized states (M9.5)

Query-backed components share `QueryState.svelte` (loading skeleton with stable height, "No data",
"Couldn't load this data" + Retry). Tables right-align numeric columns and use a sticky header inside
a bounded scroll area. Fallback wording is "Interactive view unavailable" (no internals exposed).
