# Milestone 7 Report — Incremental streaming

Branch: `intelligent-ui-foundation`. Status: **complete** for the streaming increment.
Zero new dependencies.

## Problem

Before M7, the `:::intelligent-ui` block only rendered once the closing `:::` arrived (the generic
colon-fence tokenizer requires a closed fence). During streaming, the block showed as plain text.

## Approach

A dedicated marked extension tokenizes the fence **open or closed**, and the renderer parses
partial content with lang-core's **streaming parser**:

```
streaming message content
  → intelligent-ui-extension.ts   matches :::intelligent-ui (open OR closed); emits
                                   { type:'intelligentUi', text, partial: !closed }
  → MarkdownTokens.svelte         dispatches to IntelligentUIBlock (partial flag)
  → IntelligentUIBlock
        partial:   parseIntelligentUIPartial()  ← createStreamingParser (statement cache, auto-close)
                   render whatever is valid; KEEP last-good tree on failure (no flicker)
        complete:  createIntelligentUIRuntime() ← full parse + live store (two-way binding)
```

- The extension is registered **before** the colon-fence extension so it wins for this fence type.
- `parseOpenUIPartial` (`engines/openui.ts`) uses `createStreamingParser`; it ignores
  `missing-required` noise while `meta.incomplete` and only treats errors as fatal when complete.
- The complete token creates the interactive runtime; partial tokens are preview-only.

## OpenUI APIs used

`createStreamingParser(schema).push(text)` → `{ root, meta.incomplete, meta.errors }`, plus the M6
runtime (`createStore`, `evaluateElementProps`). All already in lang-core.

## Behavior (verified)

- An **open** fence renders progressively (screenshot `01-streaming-partial.png`): a Grid of Cards
  with Metrics renders with **no raw OpenUI Lang leaking** and no errors.
- A **closed** fence renders the interactive runtime (screenshot `02-streaming-complete.png`).
- Mid-stream parse failures keep the last-good tree (no flicker, no fallback flash).

## Tests

- **vitest: 56 passed** — adds `streaming.test.ts` (open program renders; very incomplete → no
  throw; partial Stack>Grid>Card).
- **pytest: 36 passed**.
- **Production build: green.**
- **Playwright: 4 screenshots**, 0 errors — open fence renders partial tree (`Monthly` present,
  `root = Stack` not leaked).

## Screenshots (`audit/local/intelligent-ui/milestone-7/`)

`01-streaming-partial`, `02-streaming-complete`, `03-mobile`, `04-light-partial`.

## Upstream / core files changed (M7)

| File | Purpose | ~Lines |
|---|---|---|
| `src/lib/components/chat/Messages/Markdown.svelte` | register the new extension (before colonFence) | +2 |
| `src/lib/components/chat/Messages/Markdown/MarkdownTokens.svelte` | dispatch the `intelligentUi` token | +8 |

New file (ours): `src/lib/utils/marked/intelligent-ui-extension.ts`. Everything else is our module
+ tests + audit script.

**Cumulative M1–M7:** ~13 core files, ~160 lines.

## Regressions

None. M1–M6 tests remain green; OFF remains a true no-op (the extension only activates on an
`:::intelligent-ui` fence, which is never generated when OFF).

## Limitations

- `@Each` loops and `@Set`/`@Reset` action steps are still not wired (next).
- Server data (`Query`/`Mutation`, AsyncImage, tool bindings) not wired (M8).
- Partial tokens are preview-only; two-way binding activates on the complete token.
- The partial path re-parses per content update (fine for typical sizes; streaming parser mitigates).

## Readiness for M8

Ready. Next: **M8 server normalization + data/tool bindings + fallbackMarkdown**, and folding in
`@Each` + `@Set`/`@Reset`.

## Do not start M8 automatically.
