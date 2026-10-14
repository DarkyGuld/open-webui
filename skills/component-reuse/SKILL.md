---
name: component-reuse
description: Prevent duplicate UI components in Personal AI Workspace. Use before creating ANY new React component or UI primitive, to find and reuse existing project, Storybook, and Open WebUI-native components.
---

# Component Reuse

Never create a component before proving it does not already exist.

## Mandatory sequence before creating any UI component

1. **Search the project** — `apps/web/src/components/*` and shared primitives.
2. **Search Storybook** — http://localhost:6006 or the Storybook MCP tools
   (`stories-find-by-component`, `docs-list`). See `setup/mcp/STORYBOOK.md`.
3. **Search native Open WebUI components** — the upstream UI is the visual foundation;
   match its primitives and patterns (reference clone:
   `/Users/adrian/OpenUI/workspace/upstream-open-webui`).
4. **Compose existing components** where possible.
5. **Extend before duplicating** — add props/variants to an existing component.
6. **Create new only when necessary**, and place it in `apps/web/src/components/` with a
   matching story and the established design tokens.

## Anti-patterns

- A second Button/Modal/Menu/Card because the first did not quite fit.
- Copying a component to tweak styling.
- Introducing a component library instead of extending the native set.

## Evidence

When you do create something new, state what you searched and why reuse was not possible.
