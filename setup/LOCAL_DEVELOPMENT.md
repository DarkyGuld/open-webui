# Local Development (native, macOS)

The repo ships a Docker workflow (`docker-compose*.yaml`, `Dockerfile`). Docker is **not
installed** on this machine, so the stack runs **natively** (slim backend + SvelteKit dev
server). All services were started and verified.

## Running services

| Service | URL | Port | How |
|---|---|---|---|
| Fork frontend (SvelteKit/Vite) | http://localhost:5173 | 5173 | `npm run dev` (repo root) |
| Fork backend (FastAPI, slim) | http://127.0.0.1:8080 | 8080 | `uvicorn open_webui.main:app` (in `backend/`) |
| Upstream unmodified Open WebUI (reference) | http://127.0.0.1:3001 | 3001 | `open-webui serve` (uv tool) |

Backend health: `curl -s http://127.0.0.1:8080/health` → `{"status":true}`
Frontend talks to the backend directly; dev CORS is set to `localhost:5173`.

## PATH note

`node@22` is keg-only: `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"`.

## Startup / shutdown

```bash
./scripts/audit/start-local              # backend :8080 + frontend :5173 + upstream ref :3001
./scripts/audit/stop-local               # stop fork backend + frontend
./scripts/audit/stop-local --with-upstream   # also stop the shared :3001 reference
```

Manual equivalents:

```bash
cd /Users/adrian/OpenUI/workspace/open-webui
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"

# Backend (run from backend/)
cd backend
USE_SLIM_DOCKER=true \
WEBUI_SECRET_KEY="$(openssl rand -hex 16)" \
CORS_ALLOW_ORIGIN="http://localhost:5173;http://localhost:8080" \
../.venv/bin/uvicorn open_webui.main:app --host 127.0.0.1 --port 8080 \
  --forwarded-allow-ips '*' --ws-per-message-deflate true

# Frontend (run from repo root)
npm run dev
```

## First-time install (already done)

```bash
# Backend (Python 3.11) — slim set avoids chroma/OCR/embeddings
~/.local/bin/uv venv --python 3.11 .venv
~/.local/bin/uv pip install --python .venv/bin/python -r backend/requirements-slim.txt

# Frontend
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
npm install
```

## Important environment notes

- **`USE_SLIM_DOCKER=true` is required** for the slim dependency set: `config.py` imports
  `chromadb` unless slim mode is on. Slim mode selects `pgvector` as the vector DB and skips
  the chroma import; RAG/embeddings are unavailable without the full set (acceptable for UI work).
- **Frontend build needs a larger Node heap.** `npm run build` OOMs at the default heap;
  run `NODE_OPTIONS=--max-old-space-size=8192 npm run build` (build output → `build/`).
- `npm run dev` also runs `pyodide:fetch` on first start (downloads Pyodide + wheels; needs network).
- Data lives in `backend/data/` (SQLite + uploads). Logs in `.local/logs/` (gitignored).
- First user created via the UI becomes admin (`/auth`).

## Data & secrets (gitignored)

| Path | Purpose |
|---|---|
| `backend/data/` | SQLite DB + uploaded files |
| `.local/logs/` | Service logs |
| `.local/openwebui-data/` | Upstream reference instance data (:3001) |
| `.local/browser-profiles/` | Persistent Playwright browser profiles (ChatGPT login) |

Never commit `.env`, `.local/`, `backend/data/`, or browser profiles.
