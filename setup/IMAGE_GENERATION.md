# Image Generation

Goal (later): generate realistic UI mockups from a multimodal design analysis.

## What is actually available

| Mechanism | Available now? | Notes |
|---|---|---|
| OpenCode built-in image tool | ❌ none | OpenCode's active model is text/image **input** only; it cannot generate images. |
| Project `ImageEngine` → OpenAI Images API (`gpt-image-1`) | ⚠️ code path exists, needs a key | `packages/artifact_tools/image_engine.py` calls an OpenAI-compatible images endpoint when configured; otherwise returns an honest offline placeholder (`is_ai_generated: False`, `provider: offline_placeholder`). |
| Project `ImageEngine` → local ComfyUI (GPU profile) | ⚠️ needs NVIDIA GPU + `compose.gpu.yaml` | Not available on macOS/arm64. |
| OpenAI account (OAuth) already in OpenCode | ✅ for **chat** only | `~/.local/share/opencode/auth.json` has an OpenAI OAuth session, but the images API requires an **API key**, not the OAuth chat session. |

**Conclusion:** there is **no image-generation capability callable directly from the
current OpenCode session**. The practical providers require credentials (an OpenAI
API key or a GPU/ComfyUI host).

## Recommended provider

OpenAI Images API, model `gpt-image-1` (already wired into the project).

## Configuration (environment variables only — never hardcode)

Add to a local, gitignored `.env` (or export in the shell that starts the BFF/Open WebUI):

```
ENABLE_IMAGE_GENERATION=true
IMAGE_GENERATION_ENGINE=openai
IMAGES_OPENAI_API_BASE_URL=https://api.openai.com/v1
IMAGES_OPENAI_API_KEY=<your-key>       # required
IMAGE_GENERATION_MODEL=gpt-image-1
```

Credential variable names: `IMAGES_OPENAI_API_KEY` (also accepted: `OPENAI_API_KEY`).

## Invocation

```bash
curl -s -X POST http://127.0.0.1:8000/api/v1/images/generate \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Dark, minimal chat workspace UI mockup, slate/indigo palette"}'
```

## Where generated mockups are stored

- Via the API: the project Library / `data/paw/library/<sha256>`.
- Design mockups for review: `design/mockups/` (gitignored).

## Fallback if no image generation is available

Use a **visual-first, render-not-generate** workflow (see
`docs/VISUAL_DESIGN_WORKFLOW.md`): produce proposed target designs as **HTML/CSS +
Tailwind / SVG mockups** (or lightweight React prototypes) rendered and screenshotted
with Playwright, then reviewed with the vision model. This needs no external provider
and keeps mockups faithful to the actual component system.
