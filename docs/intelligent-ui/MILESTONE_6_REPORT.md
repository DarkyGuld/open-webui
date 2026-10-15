# Milestone 6 Report — Logic / state / expression layer (from lang-core)

Branch: `intelligent-ui-foundation`. Status: **complete** for the core logic layer.
Zero new dependencies. No parallel engine — we wrap and expose `@openuidev/lang-core`.

## What changed conceptually

Before: "the AI picks a visual card". After M6: **"the AI builds a small program"** — responses can
declare state, compute derived values, and expose inputs that update the UI **without a model call**.

## Architecture

The OpenUI engine now exposes a **runtime** built entirely on lang-core primitives:

```
parser.parse(content) → { root, stateDeclarations }
createStore() ; store.initialize(stateDeclarations, {})
evalCtx = { ctx: { getState, resolveRef }, library, store }
evaluateElementProps(root, evalCtx)      → resolves expressions / ternary against the store
mapNode(evaluated, store)                → canonical UINode tree
   ├─ non-reactive prop      → concrete value (e.g. `$seats * 29` → 232)
   └─ reactive prop (input)  → ReactiveAssign → { value: store.get(target), binding: target }
```

- `markReactive` is applied to each input's `value` prop, so lang-core keeps a `ReactiveAssign`
  through evaluation (detected with `isReactiveAssign`).
- On input change the component calls `store.set(binding, value)`; `store.subscribe` re-runs
  `evaluateElementProps` + `mapNode`, updating the tree. **No model call.**

OpenUI APIs used (all already in our dependency): `createStore`, `evaluateElementProps`,
`isReactiveAssign`, `markReactive`, `parser.parse` (`stateDeclarations`).

## Components added (M6)

Inputs (native, two-way bound): `slider`, `select`, `switch`, `checkbox`, `input`.
Total allow-list: **15 components**. `catalog_version` stays 3 (additive).

## Supported logic (verified)

- **State**: `$name = default` → store.
- **Expressions / derived values**: `total = $seats * 29` → resolved into props.
- **Ternary**: `$n > 3 ? "high" : "low"`.
- **Two-way binding**: inputs bound to `$state`; changing an input re-renders dependent values.

## Tests

- **vitest: 53 passed** — adds `logic.test.ts` (state+expression → 232; two-way binding +
  `setState` re-evaluation → 580; ternary; malformed logic safe). catalog/registry updated to 15.
- **pytest: 36 passed**.
- **Production build: green.**
- **Playwright: 4 screenshots**, 0 errors — a live pricing calculator: default `232`, after moving
  the slider to 20 → `580` (no model call).

## Screenshots (`audit/local/intelligent-ui/milestone-6/`)

`01-calculator-default`, `02-calculator-interacted`, `03-light`, `04-mobile`.

## Upstream / core files changed (M6)

**None.** All changes are our own files:
`src/lib/intelligent-ui/{types,catalog,schema,adapter,registry,engines/openui}.ts`,
`components/{Slider,Select,Switch,Checkbox,Input,NodeRenderer,IntelligentUIBlock}.svelte`,
`scripts/intelligent-ui/generate-prompt.ts`, `catalog_prompt.py`, tests, audit script.

**Cumulative M1–M6:** still ~11 core files, ~150 lines.

## Regressions

None. M1–M5 tests remain green; OFF remains a true no-op.

## Limitations

- **`@Each` loops** are not wired yet (next increment). `Query`/`Mutation` (server data) are not
  wired (M8).
- Action steps `@Set`/`@Reset`/`@Run` are not yet mapped to the store; the existing `select`/
  `toggle`/`set_value` actions update component-local durable state (comparison selection). Wiring
  actions to the store is the next increment.
- Streaming still activates on the closed fence (M7).

## Readiness for M7

Ready. Next: **M7 incremental streaming** using `createStreamingParser` (already in lang-core),
plus `@Each` and `@Set`/`@Reset` → store, then M8 server data/tool bindings + fallbackMarkdown.

## Do not start M7 automatically.
