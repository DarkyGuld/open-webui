# Upstream Open WebUI Access

## This repository **is** the Open WebUI source

Unlike a wrapper project, this repo is a **real fork of `open-webui/open-webui`**, so the
upstream source and history are already present locally:

- `origin` = `DarkyGuld/open-webui` (your fork)
- `upstream` = `open-webui/open-webui`

Keep the fork close to upstream so merges stay simple:

```bash
git fetch upstream
git log --oneline upstream/main -5
git merge upstream/main            # when ready; no merges are performed in setup
```

## Three objects of the later audit

| | Object | Where it runs | Purpose |
|---|---|---|---|
| A | Live ChatGPT | https://chatgpt.com | Functional / UX / IA reference |
| B | This fork (customized) | http://localhost:5173 (+ backend :8080) | Current implementation |
| C | Upstream **unmodified** Open WebUI | http://127.0.0.1:3001 | Visual foundation reference |

For C, a separate unmodified instance is run from the uv-tool install (`open-webui==0.12.0`)
so screenshots reflect the **pristine** Open WebUI, not our fork.

## Versions

- Fork version: **0.12.1** (`bd495677a`), latest tag `v0.12.1`.
- Reference instance: `open-webui==0.12.0` (uv tool).
- Related wrapper repo to mine from: `DarkyGuld/personal-ai-workspace` at
  `/Users/adrian/OpenUI/workspace/openwebui-custom`.

## Useful commands

```bash
# Keep the fork in sync view
git fetch upstream && git log --oneline --left-right main...upstream/main | head

# Capture fork UI (target B) and upstream reference UI (target C)
./scripts/audit/capture-local
./scripts/audit/capture-upstream

# Inspect upstream via gh
gh repo view open-webui/open-webui
gh release list -R open-webui/open-webui -L 10
```

No merge/rebase against upstream is performed in this phase.
