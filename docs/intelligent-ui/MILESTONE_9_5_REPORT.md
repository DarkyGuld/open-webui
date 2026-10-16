# Milestone 9.5 Report — ChatGPT-parity visual & interaction polish

Branch: `intelligent-ui-foundation`. Status: **complete**. Zero new dependencies. No core changes.
No planner/router. Rich Widgets not expanded. Component set unchanged (catalog_version 4).

Goal: raise model-generated native Intelligent UI toward ChatGPT-level product quality while
keeping Open WebUI's visual language. This milestone is polish, not breadth.

## 1. Composition defaults (no more "box soup")

- **Spacing centralized**: every leaf and container used to carry its own `my-3`, so nested layouts
  accumulated margins. All per-node vertical margins were removed; the tree now spaces itself via a
  single parent `gap-3`, and `IntelligentUIBlock` applies one outer `my-3`. Nested layouts are
  visibly tighter and more coherent.
- **Grid** stays predictable (1 / 2 / 3 columns) with a clean 1-column mobile fallback.
- **Row** wraps and gives children a smaller `min-w-[10rem]` so quick-action rows wrap naturally.
- **Section/Card** titles use `font-semibold` for a clear, consistent hierarchy; Card chrome is
  unchanged but no longer compounds with child margins.
- **Divider** is a subtle 1-unit rule.

## 2. Density & hierarchy

Policy: **smart component defaults over model-specified spacing** — the model cannot set pixels.
Defaults are "normal" density (12px rhythm). Metric values (`text-2xl`, `tabular-nums`) dominate
their uppercase labels; Section titles are `text-sm font-semibold` and do not compete with
response-level Markdown headings. Titles across Card/Chart/Table/Timeline are consistent.

## 3. Tables

- Numeric/unit-bearing columns are **right-aligned** with `tabular-nums` (detected via
  `table-utils.columnAlign`); text columns stay left.
- Header is **sticky** inside a `max-h-[28rem]` scroll area; horizontal overflow scrolls rather than
  overflowing the page; long cells wrap.
- Empty/error/loading standardized (see §5).

## 4. Charts

chart.js only. Improvements: sparse-series points are visible (`pointRadius` 3 when ≤12 points,
else 1), long x-axis labels are truncated, theme-aware text/grid colors, legend only when it adds
value, tooltip/empty/loading states, responsive resize. Large datasets are capped (60 points /
6 series).

## 5. Standardized query states

New `QueryState.svelte` renders **one** consistent loading (width-staggered skeleton that keeps
height stable — no layout jump), empty ("No data"), and error ("Couldn't load this data" + a safe
**Retry**) presentation, used by Data and Timeline; Progress/Chart align on the same wording.

## 6. Mutation & local-action feedback

- Mutation loop is now explicit: idle → click → **native confirmation** → executing (**toast**
  "Saving…") → success ("Create note") / error ("Could not complete the action"), reusing
  `svelte-sonner` (existing Open WebUI dependency). Double-submit is blocked by a busy flag.
- Local `@Set`/`@Reset` actions remain instant (no spinner), with clearer pressed/`active:scale`
  and focus-visible states on buttons. Reset visibly restores the initial state.

## 7. Tabs

Native tablist with a clear selected underline, `overflow-x-auto` for many/long tabs, truncated
labels, Arrow/Home/End keyboard navigation, and a focus-visible ring. Looks like Open WebUI, not an
embedded third-party widget.

## 8. Forms

Field/Input/Textarea/Select/Radio/Checkbox/Switch/Slider/Button/Form keep native semantics and
tightened spacing; Field supports description + validation message (`role="alert"`); Radio uses
`fieldset/legend`. No arbitrary client validation was added.

## 9. Streaming

Unchanged architecture, verified stable: an unterminated fence deterministically renders in partial
mode (last-good tree, no flashing) and the final closed fence renders complete — captured as
`19-streaming-partial` / `20-streaming-complete`.

## 10. Fallback

Restrained wording: **"Interactive view unavailable"** (was "Intelligent UI unavailable"). Parser
internals are no longer in the accessibility tree; the reason is kept only as a `data-*` attribute
for debugging (and console logging). Useful textual fallback is preserved.

## 11. Rich Widget chrome

Outer chrome harmonized with native UI (title typography/background/border/spacing). Iframe content
remains isolated (sandbox + CSP). No capability change.

## 12. Dark / light

Every component uses Tailwind `dark:` tokens; charts read the `dark` class and re-render on theme
change. Dedicated light captures: `02-pricing-light`, `06-dashboard-light`.

## 13. Accessibility

Semantics preserved and improved: progressbar, tablist/tab/tabpanel + arrow keys, fieldset/legend,
`ol`, `figure/figcaption`, `role="img"` chart with `sr-only` data summary, `role="alert"` validation,
focus-visible rings on buttons/tabs/retry. No keyboard traps; confirmation uses the native dialog.

## 14. Catalog prompt cost (important)

- **Before (M9.4):** `PROMPT` = 14 467 chars (~3 617 tokens at ~4 chars/token).
- **After (M9.5):** `PROMPT` = 12 286 chars (~3 072 tokens).
- **Δ ≈ −2 181 chars, −15.1% (~−545 tokens per UI-enabled call).**

How: (a) `tagSchemaId(actionSchema, 'Action')` collapses the action union (previously re-expanded for
Metric/Comparison/Table/Badge) to `action?: Action` in every signature; (b) examples trimmed from 13
to 7 high-value ones (comparison, dashboard, calculator, tabs, timeline, form+mutation, data, plus a
"no-UI" example); (c) rules consolidated. The AUTO header grew slightly (~+230 chars) to carry the
preference rules below — net still a reduction. A regression guard asserts `3000 < len(PROMPT) < 13000`.

## 15. AUTO prompt tuning (limited, benchmark-v2 comparable)

Known v1 failure mode: **under-use** of UI. `AUTO_HEADER` now adds concise preference rules
(compare→Comparison/Table; dataset→Table; one key value→Metric; trend→Chart; interactive
calc→state/form; events→Timeline) while keeping "do not force UI for normal explanatory questions".
`ON_HEADER` states a stronger preference. `PROMPT` gained output-hygiene rules (don't wrap everything
in a Card; Grid only for peers; don't repeat UI data in prose; never hide a conclusion). No benchmark
run here.

## 16. Performance observations

- Removed cumulative margins → less layout reflow on mount.
- Chart re-renders are bounded (destroy + recreate on data/theme change); `MutationObserver` only
  re-renders on the `dark` class toggle.
- Query components subscribe to one shared `runQuery`; no duplicate parsing; skeletons avoid
  layout thrash. No new dependency or performance library.

## 17. Representative fixtures & screenshots

Fixtures: `tests/fixtures/intelligent-ui/m95-*.txt` (pricing, vps, analytics, timeline, gallery,
form, query success/empty/error, mixed, rich, stream partial/complete). **21 screenshots** in
`audit/local/intelligent-ui/milestone-9.5/`, **0 unexpected console errors**.

## 18. Tests

- **vitest: 121 passed** (adds `polish-9_5.test.ts`: table alignment, mixed Markdown+UI parsing,
  partial-fence detection, fallback strings, parity fixtures).
- **pytest: 53 passed** (adds `test_prompt_m9_5.py`: prompt size guard, result-context/hygiene/AUTO
  rules).
- **Production build: green.** All M1–M9.4 tests green.
- Responsive/dark-light/mobile and keyboard behaviors are covered by the Playwright baseline set
  (visual), not unit tests.

## 19. Core / dependencies

**No core changes. No dependency changes.** (chart.js and svelte-sonner are pre-existing.)

## Remaining parity gaps

- No true ChatGPT live side-by-side capture in this environment (see `PARITY_VISUAL_AUDIT.md`).
- Tab selection is local (not server-durable).
- No in-UI chart type switching / data labels.
- Map still deferred (remote tiles).

## GitHub

- Commits + annotated tag `intelligent-ui-m9.5`; branch `intelligent-ui-foundation`.
  (Fill exact SHAs in HANDOFF after push.)

## Readiness for routing benchmark v2

Ready. The prompt was trimmed and AUTO guidance tuned with documented, benchmark-comparable changes;
no planner or extra model call was added.

## Stop
