# Project Stack

Source of truth: **this repository** (`DarkyGuld/open-webui`, a fork of
`open-webui/open-webui`). Version: **0.12.1**.

## Frontend (`src/`)

| Item | Value |
|---|---|
| Framework | **SvelteKit 2** (`@sveltejs/kit ^2.5.27`) |
| UI compiler | **Svelte 5** (`^5.53.10`) |
| Build | **Vite 5** (`^5.4.21`), `@sveltejs/vite-plugin-svelte ^4` |
| Language | TypeScript (`^5.5.4`; resolved 5.9.3) |
| CSS | **Tailwind CSS 4** (`^4.0.0`, `@tailwindcss/postcss`), typography + container-queries plugins |
| i18n | i18next (`npm run i18n:parse`) |
| Flux/flow diagrams | `@xyflow/svelte`; charts via `svelte-*` libs |
| PWA / SW | `src/service-worker` (SvelteKit service worker) |
| Frontend tests | `vitest` 1.6 (`npm run test:frontend`, `--passWithNoTests`) |
| E2E tests | **Cypress** (`cypress/`, `npm run cy:open`) |
| Lint/format | ESLint 8 + eslint-plugin-svelte, Prettier + prettier-plugin-svelte |
| Adapters | `@sveltejs/adapter-static` (build); node/auto present |

## Backend (`backend/`)

| Item | Value |
|---|---|
| Language | **Python 3.11** (Dockerfile `python:3.11-slim-bookworm`) |
| Framework | **FastAPI**, ASGI via **uvicorn[standard]** |
| ORM/DB | **SQLAlchemy 2 (async)** + **Alembic**; SQLite default (`DATABASE_URL`) |
| Auth | **PyJWT** + **bcrypt**, passlib |
| Data clients | openai, langchain-core, httpx, aiohttp |
| Vector DB | **chroma** by default; **pgvector** in slim mode; also mariadb-vector / oracle23ai paths |
| Embeddings/RAG | sentence-transformers / transformers (full install only) |
| OCR/Web | rapidocr, onnxruntime, opencv, unstructured, playwright (full install only) |
| Server entry | `open_webui.main:app` (uvicorn) |

## Dependency sets

- `backend/requirements.txt` — **full** (adds chromadb, transformers, sentence-transformers,
  onnxruntime, opencv, rapidocr, unstructured, playwright). Heavy.
- `backend/requirements-slim.txt` — **slim** core (web stack + openai + langchain-core, no
  chroma/OCR/embeddings). Used for this local dev/audit environment with
  `USE_SLIM_DOCKER=true`.

## Containers / deploy

`Dockerfile`, `docker-compose*.yaml` (gpu, api, data, otel, a1111-test, playwright),
`docker-compose-launcher.sh`, `Makefile`. Docker is **not installed** on this dev machine.

## Package managers

| Layer | Manager | Lockfile |
|---|---|---|
| Frontend | npm | `package-lock.json` (pins TypeScript 5.9.3) |
| Backend | pip / uv (`venv` + `requirements*.txt`, pinned `==` versions) | none |

## Local run (native)

- Backend: uvicorn `open_webui.main:app` on **:8080** (slim mode).
- Frontend: `npm run dev` (Vite) on **:5173**.
- Upstream unmodified Open WebUI reference: **:3001** (separate uv-tool install).
