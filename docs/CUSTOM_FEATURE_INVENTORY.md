# Custom Feature Inventory

Comparison target: **this fork (`DarkyGuld/open-webui`) vs upstream `open-webui/open-webui`**.

## Headline finding

The fork's `main` is **pristine** — it equals upstream at fork time
(`bd495677ab7835a37a2914ada66f4541e5e7ce46`, version 0.12.1). There are **no custom
feature commits**. The only local content beyond upstream is **uncommitted tooling and
documentation** added for this effort (see below), plus the experimental Intelligent UI
spike.

> The separate `DarkyGuld/personal-ai-workspace` (PAW) repo is **not** the base and not a
> fork; it is a wrapper project whose features are **candidates** to port later (bottom of
> this document).

## Local (uncommitted) additions — tooling/docs, not product features

| Item | Purpose | Status | Upstream risk |
|---|---|---|---|
| `AGENTS.md`, `opencode.json`, `skills/*`, `setup/*`, `design/*`, `docs/*` | Agent contract, MCP config, project skills, setup docs | Added | None (new files) |
| `scripts/audit/*`, `audit/*` | Playwright UI-audit harness + scripts | Added, verified | None (new files) |
| `src/lib/intelligent-ui-spike/*`, `src/routes/spike/+page.svelte` | Engine comparison spike (OpenUI vs json-render) | Experimental, branch `spike/intelligent-ui` | Additive route/lib |
| `.gitignore`, `vite.config.ts` (vitest `exclude`), `package.json`/lock (spike deps) | Build/test adjustments | Modified | Low |
| `research/intelligent-ui/*` | Shallow clones for source review | Local only (gitignored) | None |

## Custom product features vs upstream

**None.** Every product surface currently matches upstream Open WebUI. Documented
`upstream_native` surfaces (Knowledge/RAG, Memory, realtime voice, etc.) are upstream.

## Candidate features to port from PAW (future, not present here)

These exist in `DarkyGuld/personal-ai-workspace` and are the likely "custom" direction.
Each should be re-evaluated and re-implemented **natively** in Open WebUI (not embedded).

| Candidate | PAW source | Native-integration note |
|---|---|---|
| Central Library (SHA-256 CAS, favorites, folders, auto-retrieval) | `packages/library/store.py` | Map to Open WebUI's Knowledge/files model; avoid a parallel store |
| Document generation (PDF/DOCX/XLSX/PPTX/ZIP) | `packages/artifact_tools/generator.py` | Expose as a Tool + native file cards |
| Image generation/edit | `packages/artifact_tools/image_engine.py` | Use upstream image-gen settings + native gallery |
| Deep Research planning | `apps/api/main.py` `/research/*` | Represent as a native plan/progress UI (Intelligent UI candidate) |
| Projects/Workspaces | `packages/library` + `/projects` | Overlaps upstream folders/workspaces |
| Notes (Markdown + Syncthing) | `packages/sync/bridge.py` | Compare to upstream Notes |
| Automations/tasks | `packages/library` + `/automations` | Compare to upstream Automations |
| Android TWA/standalone APK | `apps/android*` | Deployment concern, not core UI |
| Intelligent UI (React widgets) | `apps/web/.../IntelligentUIWidget.tsx` | **Superseded** by the native Svelte approach in `docs/intelligent-ui/` |

## Method

`git status`/`git log` vs upstream; route/lib/backend inspection; `docs/intelligent-ui/*`
source review. No custom feature was found to inventory because none has been committed yet.
