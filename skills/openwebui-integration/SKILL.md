---
name: openwebui-integration
description: Protect upstream Open WebUI compatibility when integrating features into Personal AI Workspace. Use when touching the Open WebUI adapter, adding features that overlap upstream, or when deciding how to extend rather than fork Open WebUI.
---

# Open WebUI Integration

Upstream Open WebUI (`v0.12.0`, pinned, unmodified) is the AI core and visual
foundation. Integrate **around** it, not into it. Keep future upstream upgrades cheap.

## Rules

- **Minimize upstream changes.** Prefer consuming the pinned image as-is.
- **Reuse existing abstractions.** Route all upstream communication through
  `packages/openwebui_adapter/adapter.py` (the single versioned integration point).
- **Prefer wrappers/adapters** over patching or monkeypatching upstream.
- **Isolate custom modules** (`packages/*`, `apps/api`) from upstream code.
- **Document core modifications** explicitly if any are ever unavoidable; record the
  upstream version they target.
- **Avoid large rewrites.** Extend incrementally.
- **Keep upstream merges practical.** No vendoring of Open WebUI source.

## Before adding a feature

1. Does upstream Open WebUI already provide it? (`docs/STATUS_REPORT.md` marks
   `upstream_native` features.) If yes, configure/reuse instead of rebuilding.
2. Can it be a thin BFF endpoint or adapter method?
3. Does it duplicate upstream state? Avoid dual sources of truth.

## Contract safety

- Pin and test against a specific upstream version (`versions.lock`, v0.12.0).
- Add/extend contract tests when adapter endpoints change.
- Never depend on undocumented upstream internals; prefer documented REST endpoints.
