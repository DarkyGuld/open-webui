# Milestone 9 Report — AppBlock / rich widget escape hatch

Branch: `intelligent-ui-foundation`. Status: **complete** for the implemented slice.
Zero new dependencies.

## What it is

The **opt-in escape hatch** for fully custom layouts — the one place we deliberately relax
"no arbitrary HTML". A new fence carries self-contained HTML/CSS/JS, rendered in Open WebUI's
**existing sandboxed iframe**:

```
:::intelligent-ui-html{v="1"}
<div>…</div>
<script>…</script>
:::
   → MarkdownTokens (colonFence or intelligent-ui-html token) → RichWidget.svelte
   → FullHeightIframe (sandbox: allow-scripts, NO allow-same-origin)
```

## Safety (isolation)

- **Sandbox**: `allow-scripts` only — **no** `allow-same-origin`, no top-navigation; `allow-forms`
  on, popups off.
- **Strict CSP** injected into the document: `default-src 'none'; style-src 'unsafe-inline';
  script-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'`
  → **no network** (no fetch/images/beacons).
- **Opt-in flag**: global `intelligent_ui.html.enable` (Admin → Interface → *Rich widgets*),
  default **OFF**. When off, the block falls back to the safe text fallback.
- **Allow-listed bridge**: `GenUI.sendPrompt(text)` reuses Open WebUI's existing same-origin
  `input:prompt:submit` channel (the iframe is a registered embed window); `GenUI.copy(text)` uses
  the clipboard. No arbitrary host access.
- **Theme**: injected `--viz-*` CSS variables (text/muted/panel/card/border/accent) so widgets follow
  light/dark.
- **Autosize**: injected `ResizeObserver` posts `iframe:height`; `FullHeightIframe` resizes.

## Components / wiring

- New extension `src/lib/utils/marked/intelligent-ui-html-extension.ts` (open OR closed → progressive).
- `RichWidget.svelte` builds the sandbox document and reuses `FullHeightIframe`.
- Dispatch added in `MarkdownTokens.svelte` for both the `intelligentUiHtml` token and the
  `colonFence` variant (closed fences are tokenized by colonFence, which has priority).

## Opt-in flag (core edits)

`config.py` (`ENABLE_INTELLIGENT_UI_HTML`, `intelligent_ui.html.enable`), `routers/chats.py`
(`ChatConfigForm`), `main.py` (`/api/config` feature `enable_intelligent_ui_html`),
`stores/index.ts` (type), `admin/Settings/Interface.svelte` (admin row), i18n (`Rich widget`,
`Rich widgets (custom HTML)`) in en-US + nb-NO.

## Verified (Playwright)

- Rich widget renders in the sandboxed iframe (native "Rich widget" chrome + theme vars).
- Counter button increments inside the sandbox (`Clicked 1 times`) — JS runs, isolated.
- `GenUI.sendPrompt(...)` bridge produced a normal user message.
- 0 page/console errors.

## Tests

- **vitest: 58 passed**; **pytest: 39 passed** (unchanged — M9 is UI/integration).
- **Production build: green.**
- **Playwright: 4 screenshots**, 0 errors.

## Screenshots (`audit/local/intelligent-ui/milestone-9/`)

`01-html-widget`, `02-html-interacted`, `03-html-bridge`, `04-html-mobile`.

## Upstream / core files changed (M9)

| File | Purpose | ~Lines |
|---|---|---|
| `Markdown.svelte` | register the html extension (before intelligentUi) | +2 |
| `MarkdownTokens.svelte` | dispatch `intelligentUiHtml` token + colonFence variant | +9 |
| `config.py`, `routers/chats.py`, `main.py` | opt-in flag + `/api/config` | +8 |
| `stores/index.ts`, `admin/Settings/Interface.svelte` | flag type + admin row | +10 |
| i18n en-US / nb-NO | 3 keys each | +6 |

New file (ours): `intelligent-ui-html-extension.ts`, `RichWidget.svelte`.

**Cumulative M1–M9:** ~18 core files, ~195 lines.

## Regressions

None. M1–M8 tests remain green; OFF remains a true no-op (the html fence is never generated when off;
even if present, it renders the safe fallback when the flag is off).

## Limitations

- Flag is **global** (not per-user/per-chat yet); `openLink` bridge not exposed (sendPrompt + copy only).
- No separate-domain isolation (unlike ChatGPT's `*.oaiusercontent.com`); we rely on sandbox + CSP.
- The strict CSP blocks external assets by design — widgets must be self-contained.
- The widget does not see model/UI state (no back-channel beyond sendPrompt).

## Readiness for M10

Ready. Remaining: M10 planner/router (only if one-pass routing proves insufficient), `Query`/`Mutation`
tool bindings, `@Set`/`@Reset`, and the remaining M5 component families (tabs/charts/media).

## Do not start M10 automatically.
