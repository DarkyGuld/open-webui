# Intelligent UI — UX Guidelines (rulebook)

The long-term rulebook for **model-generated native UI**. Target:
"ChatGPT-quality functionality and interaction quality expressed through Open WebUI's visual
language." Never copy ChatGPT branding or skin; use Open WebUI tokens.

## 1. When to use UI vs. prose

- **Markdown is the default.** Use UI when information is structured or interactable.
- Presentation selection:
  - alternatives / "compare" → **Comparison** (or **Table**)
  - exact dataset / list of values → **Table**
  - a few important numbers → **Metric**
  - trend or comparison over categories/time → **Chart** (only when it adds value)
  - interactive calculation / input → **state + form** UI
  - ordered events → **Timeline**
- **Never duplicate**: if the UI already shows the data, prose explains meaning, reasoning, caveats
  and recommendations — it does not restate the numbers. Never hide a conclusion from the text.
- If unsure, answer with Markdown.

## 2. Composition

- Root with **Stack**. Use **Row** for a few horizontal peers, **Grid** for peer cards, **Section**
  to group related content, **Card** only when a titled surface helps.
- **Do not wrap every component in a Card.** Avoid nested bordered cards and empty decorative
  sections. Do not nest Stack inside Stack.
- Prefer one clear hierarchy per response.

## 3. Density & spacing (component defaults, not model pixels)

- Normal density: a single 12px (`gap-3`) vertical rhythm, applied by the parent — never cumulative.
- The model **cannot** set pixel values; components choose sensible defaults.
- No giant padding, no excessive whitespace, no "box soup".

## 4. Information hierarchy

- Metric value (`text-2xl`, tabular) dominates its uppercase label.
- Section/Card titles: `text-sm font-semibold`, muted. They must not compete with response-level
  Markdown headings.
- Titles consistent across Card/Chart/Table/Timeline. Avoid redundant titles.

## 5. States (mandatory)

Every data-bound component implements **loading / empty / error**; interactive components implement
**focus / hover / pressed / disabled**.
- Loading: subtle skeleton that preserves layout height (no jump).
- Empty: concise, non-alarming ("No data").
- Error: concise, safe ("Couldn't load this data") with an optional Retry. Never expose parser
  internals, engine names, or stack traces.
- Success replaces loading smoothly.

## 6. Interaction

- Local actions (`@Set`/`@Reset`) are **instant** — no spinner.
- Mutations: idle → click → **native confirmation** → executing → success/error (toast). Prevent
  double submit. The model can never bypass confirmation; mutations run only from an explicit click
  (replay-proof).
- Never add arbitrary submit handlers or client validation code.

## 7. Streaming

- Root first, then components, then leaf data (hoisting).
- No flashing, no repeated mount/unmount; keep the last-known-good tree; preserve local user state.

## 8. Accessibility

Native semantics first: `progressbar`, `tablist/tab/tabpanel` (+Arrow/Home/End), `fieldset/legend`,
`ol`, `figure/figcaption`, `role="img"` + `sr-only` chart summary, `role="alert"` validation,
visible focus, no keyboard traps, native confirmation dialog focus handling.

## 9. Theme

Dark and light via Open WebUI tokens (`gray-*`, indigo accent). No hardcoded theme colors outside
established tokens; charts follow the `dark` class.

## 10. Safety (unchanged)

Allow-listed components/queries/mutations only; no arbitrary HTML/CSS/JS/URLs/code; query results
normalized and bounded; media via the existing safe `Image` policy; OFF is a stock no-op.

## 11. Prompt discipline

Keep the catalog prompt compact and correct. Prefer smart defaults + a few high-value examples over
verbose prose. Guidance (hygiene, result-context, AUTO preferences) is part of the product contract
and must stay in sync with the catalog.
