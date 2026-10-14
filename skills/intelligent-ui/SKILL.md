---
name: intelligent-ui
description: Guide optional ChatGPT-style Intelligent UI in the Open WebUI fork. Use when a model should choose richer presentation (cards, tables, charts, metrics, forms) instead of plain Markdown, or when integrating external generative-UI engines, schemas, or protocols.
---

# Intelligent UI

Intelligent UI is an **optional, modular** capability. The model may choose the *presentation* of a response, never execute code. Normal Markdown always remains the fallback.

## Rules

- **Optional and modular.** Must be cleanly togglable (global / user / chat Auto|On|Off / model). When OFF, Open WebUI behaves exactly as stock — no planner, no schema, no extra prompt, no extra call, no extra latency.
- **Model decides presentation in Auto mode.** `AUTO` = model may choose; `ON` = UI encouraged; `OFF` = normal Markdown only.
- **Strict schema.** Model output maps to a fixed, validated, allow-listed schema. Unknown components fail gracefully.
- **No arbitrary HTML/JS.** Never `eval`, never inject model HTML. No iframe/embed of external visual layers.
- **Native Open WebUI renderer.** Render through the project's own Svelte components and design tokens. External engines (OpenUI, json-render, A2UI) provide schemas/parsers/protocols only, behind an adapter.
- **Graceful Markdown fallback.** Any parse/validation failure degrades to normal Markdown — never a blank or broken message.
- **Open WebUI design language always wins.** See `design-language` and `component-reuse`.

## Architecture (see docs/intelligent-ui/)

- Filter (inlet) = planner/gating/system-prompt injection + valves.
- Engine adapter (`src/lib/intelligent-ui/`) = OpenUI `lang-core` (primary) / json-render (fallback).
- Native renderer = new marked token `:::intelligent-ui` → allow-listed Svelte components.
- Full analysis: `docs/intelligent-ui/RECOMMENDATION.md`, `ARCHITECTURE_OPTIONS.md`, `UI_SCHEMA.md`, `SECURITY.md`, `UPSTREAM_IMPACT.md`.

## Process

1. Define/extend the component catalog (Zod schema + native component + story).
2. Validate + bound every schema (nodes, depth, size); allow-list actions/URLs.
3. Render with native components; provide loading/empty/error states and responsive layout.
4. Capture desktop + mobile screenshots; run `ui-review` + `visual-regression`.
5. Prove OFF = untouched upstream behavior.
