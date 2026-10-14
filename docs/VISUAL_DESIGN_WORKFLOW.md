# Visual-First Design Workflow

Prepare the project for a later visual-first workflow. This document defines the process;
the product redesign itself is **not** done in the setup phase.

## Workflow

```
ChatGPT reference screenshot
        +
Open WebUI visual reference
        +
current local implementation
        ↓
multimodal design analysis          (vision model: setup/VISION_MODEL.md)
        ↓
proposed target design              (written spec + annotated screenshots)
        ↓
optional generated mockup image     (setup/IMAGE_GENERATION.md — or render-not-generate fallback)
        ↓
implementation                      (React components, native tokens only)
        ↓
Playwright screenshot               (audit/)
        ↓
visual comparison                   (audit/visual-diff + vision review)
        ↓
automatic refinement                (iterate until clean)
```

## Inputs and where they live

| Input | Location |
|---|---|
| ChatGPT reference captures | `audit/chatgpt/` |
| Local implementation captures | `audit/local/` |
| Upstream Open WebUI captures | `audit/upstream-openwebui/` |
| External design references (Figma exports, inspiration) | `design/references/` |
| Proposed mockups | `design/mockups/` (gitignored binaries) |
| Approved designs | `design/approved/` |
| Superseded designs | `design/archive/` |
| Diffs | `audit/diffs/` |

## The vision step

Feed the three screenshots plus a written brief to the preferred vision model
(`opencode-go/deepseek-v4.1-flash`) via the `Read` tool. Ask for:
- functional gaps (from ChatGPT),
- visual deviations (from Open WebUI),
- a proposed target expressed **in Open WebUI's design language**.

## Mockup generation

Preferred: image generation via OpenAI `gpt-image-1` (needs a key; see
`setup/IMAGE_GENERATION.md`). Fallback (no provider): render a **render-not-generate**
mockup as HTML/Tailwind or SVG and screenshot it with Playwright. Generated/rendered
mockups are stored in `design/mockups/`.

## Guardrails

- Mockups must respect the design-language skill; a mockup is never itself a "second design system".
- Every implemented UI change is validated by the visual-regression skill.
- Never copy ChatGPT branding.
