# Parity Visual Audit — ChatGPT reference vs. custom Open WebUI vs. upstream

Purpose: record the interaction/layout **principles** used to polish native Intelligent UI. We
compare three references:

- **A — ChatGPT reference behavior** (functional/interaction/IA reference).
- **B — current custom Open WebUI Intelligent UI** (our product).
- **C — upstream Open WebUI design language** (visual language we must match).

We deliberately do **not** copy ChatGPT CSS/branding. We extract principles, then express them with
Open WebUI's tokens (typography, spacing, borders, radii, controls, icons, colors).

> Environment note: live ChatGPT was not captured from this dev machine (no authenticated clean
> session available here). The A-column principles below are the documented/observed behavior of
> ChatGPT structured answers and are consistent with the `chatgpt-reference-audit` skill. Where a
> live capture would help, it is flagged.

## Representative examples

### 1. Dashboard (metrics + chart + table + tabs)

| | Observation |
|---|---|
| A | Compact KPI strip; charts in a single restrained panel; tabs for secondary detail; prose gives the takeaway. |
| B (before) | Metrics/chart/table each carried their own margins → loose, "box soup"; 3 nested bordered surfaces. |
| C | Open WebUI cards use `rounded-xl`, 1px `gray-100/gray-800` border, `gray-900` dark surface. |
| **Gaps** | spacing (cumulative), density (too airy), hierarchy (chart card vs metric cards inconsistent). |
| **Fix** | centralized gap spacing; `font-semibold` titles; metric value `text-2xl tabular-nums`; chart in one Card. |

### 2. Comparison / exact table

| | Observation |
|---|---|
| A | Side-by-side comparison, then an exact table; numeric columns right-aligned; a recommendation. |
| B (before) | Table values all left-aligned; long tables could overflow vertically with no header anchor. |
| C | Open WebUI tables: `text-sm`, uppercase muted header, row separators `gray-100/gray-800`. |
| **Gaps** | density (no numeric alignment), feedback (header not anchored), overflow. |
| **Fix** | `columnAlign` right-aligns numeric/unit columns + `tabular-nums`; sticky header in a bounded scroll area; horizontal scroll contained. |

### 3. Query-backed data (loading/empty/error/success)

| | Observation |
|---|---|
| A | Skeletons that preserve layout; calm empty state; concise error with retry. |
| B (before) | Each component had its own ad-hoc loading/empty/error markup and wording; loading shifted height. |
| C | Open WebUI uses subtle pulse skeletons and muted text. |
| **Gaps** | state consistency, feedback, layout stability. |
| **Fix** | shared `QueryState.svelte`: staggered pulse skeleton (stable height), "No data", "Couldn't load this data" + Retry. |

### 4. Interactive calculator / local actions

| | Observation |
|---|---|
| A | Instant local recompute; clear pressed state; visible reset. |
| B (before) | Local actions worked but buttons had no pressed/focus affordance. |
| C | Open WebUI buttons: bordered, `hover:bg-gray-50`, focus ring. |
| **Gaps** | interaction feedback. |
| **Fix** | `active:scale-[0.98]`, focus-visible ring; no spinner for local-only actions. |

### 5. Mutation-backed form

| | Observation |
|---|---|
| A | Confirm → executing → success/error, never ambiguous; no double submit. |
| B (before) | Confirmation existed; execution gave no visible feedback; possible repeat. |
| C | Open WebUI uses `svelte-sonner` toasts. |
| **Gaps** | feedback/state gap. |
| **Fix** | toast loop (Saving… → title → error) + busy flag. |

### 6. Mixed response (Markdown + UI)

| | Observation |
|---|---|
| A | Short prose → structured UI → interpretation; no duplicated data. |
| B (before) | Possible duplication (UI + prose repeating the same numbers). |
| **Gaps** | IA / redundancy. |
| **Fix** | prompt rule: do not repeat UI data in prose; keep conclusions in text. Captured in `18-mixed-response`. |

### 7. Streaming

| | Observation |
|---|---|
| A | Progressive reveal, structure first, no flashing. |
| B | Already progressive (partial token + last-good tree). |
| **Gaps** | none material. |
| **Fix** | verified via unterminated-fence partial capture. |

## Responsive & theme

Tested narrow phone (390×844), desktop (1280×1000) and light/dark. Grid collapses to 1 column; rows
wrap; tables scroll horizontally within their card (no page overflow); charts resize; tabs scroll;
gallery reflows; forms stay readable; buttons remain tappable.

## Result

Composition is tighter and more hierarchical; states are consistent; interaction feedback is clear;
the look remains Open WebUI's. Remaining gaps are listed in `MILESTONE_9_5_REPORT.md`.
