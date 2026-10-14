# Vision Model / Screenshot Review

Goal (later): inspect screenshots, compare UIs, read ChatGPT screens and the local
PAW / upstream Open WebUI screens.

## Preferred model

**`opencode-go/deepseek-v4.1-flash`** — the currently active model.

Verified from the OpenCode model registry (`~/.cache/opencode/models.json`):

```
attachment: true
modalities: { input: ["text", "image"], output: ["text"] }
```

It accepts image input, which is what screenshot review needs.

## Fallbacks

| Model | Input modalities | Notes |
|---|---|---|
| `opencode-go/gpt-5.6-luna` | text, image, **pdf** | Strongest multimodal option available in the same provider; also handles PDFs. |
| `opencode-go/deepseek-v4-flash-vision-exp` | text, image | Vision-focused experimental variant. |

## How OpenCode passes screenshots

- The `Read` tool can read image files (PNG/JPEG) and returns them to the model as
  image attachments. Point it at generated screenshots under `audit/**` or
  `design/**`, or the `mcp` browser tools' snapshots.
- The Playwright MCP / Chrome DevTools MCP servers can also supply page snapshots.

## Supported image formats

PNG and JPEG are the safe choice (the audit harness writes PNG). PDFs are supported
by `gpt-5.6-luna` only.

## Limitations / cautions

- Model vision quality for dense UI screenshots varies; crop to regions (e.g. an
  element screenshot) when precision matters. The harness supports element
  screenshots (`audit/lib/browser.mjs` → `screenshotElement`).
- The `audit/visual-diff` tool gives an objective pixel/similarity signal; use it to
  complement (not replace) model judgment.
- Do not send private data — ChatGPT screenshots may contain personal content.
