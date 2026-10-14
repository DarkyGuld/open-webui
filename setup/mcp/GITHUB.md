# GitHub MCP

Status: **configured and enabled** in `opencode.json` (server name `github`), but
requires a token to authenticate at runtime.

## Purpose (later phases)

- Inspect upstream `open-webui/open-webui` source, commits, issues, PRs, releases.
- Compare our customized repo against upstream.
- Research Intelligent-UI OSS projects (e.g. `thesysdev/openui`).
- Track `versions.lock` pins and `./manage.sh check-updates`.

## Configuration (already applied)

```json
"github": {
  "type": "remote",
  "url": "https://api.githubcopilot.com/mcp/",
  "enabled": true,
  "headers": { "Authorization": "Bearer {env:GITHUB_TOKEN}" }
}
```

The `{env:GITHUB_TOKEN}` placeholder is interpolated by OpenCode at startup. No
token is stored in the repo.

## Provide the token

The GitHub CLI is installed and authenticated as `DarkyGuld`. Export a token into
OpenCode's environment **before launching OpenCode** (the MCP server reads it at
startup):

```bash
# In the shell that launches OpenCode:
export GITHUB_TOKEN="$(gh auth token)"

# Persist for future sessions (optional), e.g. in ~/.zshrc:
echo 'export GITHUB_TOKEN="$(gh auth token 2>/dev/null)"' >> ~/.zshrc
```

Do **not** paste the token into any file in this repository.

## Verification

```bash
gh auth status
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $(gh auth token)" https://api.githubcopilot.com/mcp/
```

## Fallback

Without the MCP server, use the `gh` CLI directly (authenticated):

```bash
gh repo view open-webui/open-webui
gh release list -R open-webui/open-webui -L 5
gh api repos/open-webui/open-webui/commits --jq '.[0:5][].sha'
gh search repos openui --limit 10
```
