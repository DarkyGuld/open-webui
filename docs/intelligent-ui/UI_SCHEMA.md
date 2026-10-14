# Intelligent UI — Response Contract

Principle: the model may choose **presentation**, never **code**. All UI is a **validated, allow-listed schema** rendered by native Open WebUI components. Unknown/invalid → graceful Markdown fallback.

## Wire format

Model emits a single fenced block in its normal response (streaming-friendly), e.g.:

```
:::intelligent-ui{v=1}
<schema-encoded UI here>
:::
```

Two interchangeable encodings behind the adapter:

- **OpenUI Lang (preferred)** — compact, streaming, token-efficient. Example:
  ```
  root = Stack([c1, m1])
  c1 = Card("Comparison", [t1])
  t1 = Table("", ["A","B"], [["$5","$7"]])
  m1 = Metric("Monthly cost", "$7", "badge:cheaper")
  ```
- **JSON (fallback / debug)** — `@json-render`-style flat tree:
  ```json
  { "root": "root", "elements": { "root": { "type": "Stack", "props": {}, "children": ["t1"] } } }
  ```

A minimal internal normalized form (what the renderer consumes) is:

```jsonc
{
  "mode": "intelligent_ui",
  "version": 1,
  "root": {
    "type": "stack",
    "children": [
      { "type": "metric", "props": { "label": "Monthly cost", "value": "$7", "delta": "-30%" } },
      { "type": "comparison", "props": { "columns": ["VPS A","VPS B"], "rows": [["CPU","2","4"]] } }
    ]
  }
}
```

## Component registry (initial allow-list)

| type | purpose | native component to reuse |
|---|---|---|
| `text` | short text | inline text |
| `markdown` | safe markdown | existing `Markdown.svelte` |
| `stack` / `row` / `grid` | layout | Tailwind flex/grid |
| `card` | titled surface | `common/Collapsible.svelte` styling / surface tokens |
| `metric` | KPI value | new small component (surface + text) |
| `table` | data table | existing markdown table styles (`MarkdownTokens.svelte:218`) |
| `comparison` | side-by-side compare | table/card composition |
| `chart` | bar/line/pie | existing `chart.js`/vega (`CodeBlock` vega path; `ChartLine`) |
| `tabs` | grouped views | `common/` + new tab wrapper |
| `form` | inputs | `common/Input/Select/Switch/Checkbox` |
| `button` | action/follow-up | existing inline button recipe (add `common/Button.svelte`) |
| `file` / `image` / `gallery` | assets | `common/FileItem.svelte`, `Image.svelte` |
| `map` | geo | out of scope v1 |
| `progress` | progress/step | `common/` |
| `confirmation` | approve action | `common/ConfirmDialog.svelte` |
| `source`/`citation` | references | existing `Source.svelte`/`Citations.svelte` |

Extend deliberately; each new type needs a Zod prop schema, a Storybook story, and responsive/a11y review (`skills/component-reuse`).

## Schema tooling comparison

| Tool | Pros | Cons | Use |
|---|---|---|---|
| **OpenUI Lang + Zod** (lang-core) | token-efficient, streaming parser, prompt-gen from catalog, validation, actions/state | Svelte runtime behind (0.5); positional args require frozen prop order | **Primary encoding** |
| **Zod** | TS-native, works with both engines, type inference | runtime-only (not a wire format) | Prop schemas |
| **JSON Schema** | portable, standard | verbose; weaker TS ergonomics | Exchanged to parser (`toJSONSchema`) |
| **Pydantic** | backend validation/settings | not the wire format for the frontend | Server-side validation |
| **json-render JSON** | official Svelte renderer, simple | verbose | Fallback encoding |
| **A2UI JSON** | rigorous, multi-language | pre-1.0, no official Svelte | Future interop target |

## Validation & failure behavior

1. Parse in a try/catch; on parse error → render raw block as Markdown + a subtle "UI unavailable" note.
2. Validate every node against the allow-list + Zod prop schema; drop unknown nodes (non-fatal), keep the rest.
3. Enforce limits: max nodes, max depth, max string length, max payload bytes.
4. If the whole schema is unusable → Markdown fallback (never a blank message).
5. During streaming, render only closed/valid statements; show a skeleton otherwise.

See `SECURITY.md` for the full threat model.
