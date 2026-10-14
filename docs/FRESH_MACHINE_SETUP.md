# Fresh Machine Setup

Goal: reach a working development environment with minimal guesswork.

## 1. Prerequisites

- macOS/Linux, 16 GB RAM recommended.
- Homebrew (macOS), Xcode CLT.
- `git`, `gh` (GitHub CLI), Node 22 (`brew install node@22`), Python 3.11 (via `uv`), `uv`,
  Google Chrome (for Playwright `channel: chrome`), `tsx` (dev dep, installed by npm).

## 2. Clone and branch

```bash
gh auth login            # authenticate (browser)
git clone https://github.com/DarkyGuld/open-webui.git
cd open-webui
git checkout intelligent-ui-foundation   # or the branch created by the handoff
```

## 3. Backend

```bash
uv venv --python 3.11 .venv
uv pip install --python .venv/bin/python -r backend/requirements-slim.txt
uv pip install --python .venv/bin/python pytest pytest-asyncio
```

`USE_SLIM_DOCKER=true` is required with the slim set (avoids chromadb). Data lives in
`backend/data/` (SQLite). To start the backend:

```bash
cd backend
USE_SLIM_DOCKER=true \
WEBUI_SECRET_KEY="$(openssl rand -hex 16)" \
CORS_ALLOW_ORIGIN="http://localhost:5173;http://localhost:8080" \
../.venv/bin/uvicorn open_webui.main:app --host 127.0.0.1 --port 8080 \
  --forwarded-allow-ips '*' --ws-per-message-deflate true
```

## 4. Frontend

```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
npm install
npm run dev      # http://localhost:5173 (proxies /api to :8080)
```

Build: `NODE_OPTIONS=--max-old-space-size=8192 npm run build` (larger heap required).

## 5. Environment file (names only — never commit values)

Create `.env` (gitignored) or export in your shell:

```
WEBUI_SECRET_KEY, ENABLE_SIGNUP, USE_SLIM_DOCKER, DATA_DIR, CORS_ALLOW_ORIGIN,
OPENAI_API_BASE_URLS, OPENAI_API_KEYS, OPENAI_API_CONFIGS, ENABLE_INTELLIGENT_UI,
SCARF_NO_ANALYTICS, DO_NOT_TRACK, ANONYMIZED_TELEMETRY, ENABLE_VERSION_UPDATE_CHECK,
OPENUI_TELEMETRY_DISABLED
```

## 6. Model provider

The app needs an OpenAI-compatible provider. This environment uses the opencode gateway; the
OpenAI connection is configured with a custom header so requests can be routed:

```json
{ "headers": { "x-opencode-session": "{{CHAT_ID}}" } }
```

(Configured in Admin → Connections; stored under config key `openai.api_configs`.) Any
OpenAI-compatible provider (OpenAI, OpenRouter, Ollama, LM Studio) works; Ollama is the easiest
fully-local option.

## 7. First admin user

```bash
# If signup is disabled, set ui.enable_signup=true in the config table, or set DEFAULT_USER_ROLE.
curl -X POST http://127.0.0.1:8080/api/v1/auths/signup \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@local","password":"<your-password>","name":"Admin"}'
```
The first user should be an admin (promote in the DB if needed: `update user set role='admin'`).

## 8. Enable Intelligent UI

1. Admin → Interface → **Intelligent UI** → ON (global).
2. Settings → Interface → **Intelligent UI** → ON (user).
3. Install the Filter: Admin → Functions → new Function → paste
   `backend/open_webui/intelligent_ui/filter.py` (or POST to `/api/v1/functions/create`),
   then activate it and make it global.
4. New chats default to **Auto**; switch per-chat in the composer **Controls** panel.

## 9. Playwright

```bash
cd audit && npm install && npx playwright install chromium
npx playwright test tests/smoke.spec.ts --project=local-desktop
```

## 10. Tests / smoke

```bash
PYTHONPATH=backend .venv/bin/python -m pytest tests/intelligent_ui -q
npx vitest run --reporter=dot
NODE_OPTIONS=--max-old-space-size=8192 npm run build
```

## 11. Docker (optional)

The repo's default deployment is Docker Compose (`compose.yaml`, `manage.sh`); Docker is optional
for development. Native dev (above) is what this project used.

## 12. MCP (optional)

`opencode.json` registers Playwright, Chrome DevTools, GitHub, Storybook, Figma, context7. Provide
`GITHUB_TOKEN` for the GitHub MCP. Restart OpenCode after editing.
