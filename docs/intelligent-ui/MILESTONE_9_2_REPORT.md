# Milestone 9.2 Report — Local declarative actions (@Set / @Reset)

Branch: `intelligent-ui-foundation`. Status: **Phase A complete and validated; Phase B deferred by
design** (see rationale). Zero new dependencies.

## Phase A — @Set / @Reset (complete)

Implemented on `@openuidev/lang-core` (no parallel engine):

- **`Button` component** added to the catalog (label + an action prop). 16 components total.
- lang-core parses `@Set`/`@Reset`/`@ToAssistant`/`@OpenUrl` into an **`ActionStep`**; the engine
  **normalizes** it into a safe, serializable `OpenUIAction` (allow-list; `@Run` dropped).
- `IntelligentUIBlock` dispatches: `set`/`reset` → store (+ reactive re-evaluation); `send_prompt` →
  Open WebUI's prompt channel; `open_url` → native confirmation.
- **No model call** for local actions; no arbitrary JS/object mutation; unknown actions dropped.

Verified end-to-end (Playwright): pricing calculator `8 → 232`, `10 → 290`, `20 → 580`,
`50 → 1450`, `Reset → 232`, 0 errors.

Details: `LOGIC_ACTIONS.md`.

## Phase B — Query / Mutation / tool bindings (deferred, designed)

Not implemented. It introduces a backend data + permission + confirmation surface that must reuse
Open WebUI's tool/permission infrastructure and must not be rushed into a parallel privileged
executor. The full target architecture (allow-listed query registry, mutation risk model, host
confirmation, result normalization, limits, security tests) is captured in `QUERY_MUTATION.md`.

Rationale: the project's own safety rules ("no parallel privileged execution system"; "STOP and
explain before broadening scope") favour a dedicated, well-tested milestone over a rushed slice.

## Tests

- **vitest: 60 passed** — adds @Set/@Reset normalization tests; catalog/registry updated to 16 components.
- **pytest: 46 passed**.
- **Production build: green.**
- **Playwright: 3 screenshots**, 0 errors.

## Screenshots (`audit/local/intelligent-ui/tool-bindings/`)

`01-set-before`, `02-set-after`, `03-reset`.

## Upstream / core files changed (M9.2)

**None.** Phase A is entirely our own files (`src/lib/intelligent-ui/{catalog,schema,types,registry,
engines/openui,adapter}.ts`, `components/{Button,NodeRenderer,IntelligentUIBlock}.svelte`,
`scripts/intelligent-ui/generate-prompt.ts`, `catalog_prompt.py`, tests, audit script). No core edits.

**Cumulative M1–M9.2:** ~20 core files, ~235 lines.

## Regressions

None. M1–M9.1 tests remain green; OFF remains a true no-op; native/rich independence intact.

## Limitations

- `@Run` (query/mutation) not executed yet (Phase B).
- `@Set` with a non-literal expression is evaluated at render time; literals behave identically.

## Readiness for the next milestone

Phase A (local actions) is done. The next milestone is **Phase B: Query / Mutation / tool bindings**
(design in `QUERY_MUTATION.md`), then the remaining native component families.

## Stop
