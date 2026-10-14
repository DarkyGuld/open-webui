# AGENTS.md — Development Contract

Primary contract for all agents and humans working on the **customized Open WebUI**
product. Read this before making changes.

- **This project:** a real **fork of `open-webui/open-webui`** → `DarkyGuld/open-webui`.
- **Source to mine from:** `DarkyGuld/personal-ai-workspace` (PAW), cloned at
  `/Users/adrian/OpenUI/workspace/openwebui-custom`. PAW is *not* the product base; it is
  a wrapper project whose pieces (Library, artifact tools, BFF endpoints, tests, ideas)
  may be ported in deliberately.

## PRODUCT PRINCIPLE

We are building a customized Open WebUI product with **ChatGPT-quality UX**.

- **ChatGPT** is the **functional**, **interaction**, and **information-architecture** reference.
- **Open WebUI** is the **visual language**, **application shell**, and **component foundation**.

Goal:

> **"ChatGPT-quality functionality and UX expressed through Open WebUI's visual language."**

## CORE RULES

1. One design language.
2. One icon language.
3. One component system.
4. Reuse before creation.
5. No external OSS UI rendered directly.
6. External projects must use adapter layers.
7. Minimize upstream conflicts.
8. Every feature requires responsive behavior.
9. Every feature requires loading / empty / error states.
10. Every interactive feature requires focus / keyboard states.
11. Major UI changes require Playwright screenshots.
12. Major UI changes require visual review.
13. Major new pages should be visually designed before implementation.
14. Never copy ChatGPT branding.
15. Never hardcode secrets.
16. Intelligent UI must degrade gracefully to normal Open WebUI behavior.

## Stack (source of truth: this repo)

- **Frontend:** SvelteKit 2 + Svelte 5 + TypeScript, **Vite 5**, **Tailwind CSS 4** (`src/`).
  UI library/tokens in `src/lib/`. i18n via `i18next`.
- **Backend:** FastAPI + uvicorn on **Python 3.11** (`backend/open_webui`). SQLAlchemy
  (async) + Alembic; SQLite by default. Vector DB: chroma (full) / pgvector (slim).
- **Auth:** PyJWT + bcrypt (Open WebUI native).
- **Tests:** frontend `vitest` (`npm run test:frontend`), backend `pytest` (under `backend/`).
- **Lint/format:** ESLint + Prettier (`svelte` plugin), ruff (backend), pylint.
- **Container:** `Dockerfile`, `docker-compose*.yaml` (deployment). Docker is **not
  installed** on this dev machine; run natively instead.

Detail: `setup/PROJECT_STACK.md`.

## Local development (native, macOS)

```bash
./scripts/audit/start-local     # fork backend :8080, fork frontend :5173, upstream ref :3001
./scripts/audit/stop-local
```

- Fork frontend (SvelteKit/Vite): http://localhost:5173
- Fork backend (FastAPI): http://127.0.0.1:8080 (`/health`)
- Upstream unmodified Open WebUI (reference): http://127.0.0.1:3001

Detail: `setup/LOCAL_DEVELOPMENT.md`.

## Skills (load when the task matches)

In `skills/` and registered in `opencode.json` (`skills.paths`):

- `design-language` — one visual language.
- `chatgpt-reference-audit` — inspect ChatGPT live as the functional reference.
- `openwebui-integration` — protect upstream compatibility (now doubly important: this *is* Open WebUI).
- `component-reuse` — never duplicate UI components.
- `ui-review` — strict UX/UI review checklist.
- `visual-regression` — Playwright capture → diff → vision → fix.
- `intelligent-ui` — safe, schema-driven generative UI.

## MCP servers

In `opencode.json`: enabled `playwright`, `chrome-devtools`, `github` (needs `GITHUB_TOKEN`);
`storybook` enabled only once Storybook runs (not set up for Svelte yet); `figma`/`context7`
disabled. Inventory: `setup/mcp/MCP_INVENTORY.md`.

**Restart OpenCode after changing `opencode.json` or any skill/agent/command file.**

## Working agreement

- Work on a branch (`audit-and-design-foundation`), never commit to `main` directly.
- Keep the fork reasonably close to `upstream/main` so upstream merges stay practical.
  Prefer adding custom code in isolated modules over editing upstream files in place.
- Never hardcode secrets or tokens; use `.env` (gitignored).
- Never commit `.local/`, browser profiles, build output, or model weights.
- Verify: `npm run check`, `npm run test:frontend`, `npm run build`, backend `pytest`, and
  the Playwright smoke test. Record pre-existing failures honestly (`setup/BASELINE_STATUS.md`).

## Current phase

Intelligent UI **research & architecture** phase complete. Read
`docs/intelligent-ui/RECOMMENDATION.md` before implementing. **Do not start the full
Intelligent UI implementation** until that recommendation is approved; a minimal
prototype (metric/comparison/table behind an Auto|On|Off toggle) is the agreed first slice.

Research outputs: `docs/intelligent-ui/` (render pipeline, Functions capabilities,
extension comparison, OSS research + matrix, architecture options, UI schema, security,
upstream impact, recommendation) and `docs/INTELLIGENT_UI_SPIKE.md`.

The **LIVE PRODUCT AUDIT** (compare A) live ChatGPT, B) this fork, C) upstream unmodified
Open WebUI) is still pending and can run before or alongside implementation.
