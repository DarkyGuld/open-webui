# Git State

## Repository

| Field | Value |
|---|---|
| Project | Customized **fork of `open-webui/open-webui`** |
| Fork (origin, push target) | `https://github.com/DarkyGuld/open-webui.git` |
| Upstream (parent) | `https://github.com/open-webui/open-webui.git` |
| Local path | `/Users/adrian/OpenUI/workspace/open-webui` |
| Default branch | `main` |
| Working tree at clone | clean |

Verified via GitHub: `DarkyGuld/open-webui` → `isFork: true`, parent `open-webui/open-webui`.

## Remotes

```
origin    https://github.com/DarkyGuld/open-webui.git      (your fork)
upstream  https://github.com/open-webui/open-webui.git     (open-webui/open-webui)
```

## Branches

- `main` (tracks `origin/main`) — pristine, equals upstream at fork time
- `audit-and-design-foundation` — setup/tooling branch
- `spike/intelligent-ui` — engine comparison spike (OpenUI vs json-render)
- `intelligent-ui-research-foundation` — **current** research/architecture branch

## Workspace layout

```
/Users/adrian/OpenUI/workspace/
  custom   -> open-webui            (this fork)
  upstream -> upstream-open-webui   (clean upstream reference, v0.12.0)
  openwebui-custom/                 (PAW wrapper repo — source to mine from)
```

`research/intelligent-ui/` (gitignored) holds shallow clones of openui, a2ui, ag-ui,
open-intelligent-ui, OpenIntelligentUI for source review.

## Commits

Base commit (branch point):

```
bd495677ab7835a37a2914ada66f4541e5e7ce46
```

`main` is at this commit; latest upstream release reachable in history is **v0.12.1**
(the repo version is `0.12.1`, backend log reports `v0.12.1`).

## Tags

Full upstream tag history is present (e.g. `v0.12.1`, `v0.12.0`, `v0.11.x`, …). Tag
`v0.12.1` is the newest release tag.

## Fork / upstream status

- This **is** a fork with full history and tags; upstream merges are straightforward
  (`git fetch upstream && git merge upstream/main`).
- `main` currently equals the upstream `main` at fork time (`bd495677a`), i.e. **no custom
  commits yet** — the fork is a pristine copy plus this setup tooling.

## Rollback

The pristine base is the commit above (also `main`). To discard local setup commits:
`git reset --hard main`.

## Related repo (source to mine from)

`DarkyGuld/personal-ai-workspace` (PAW) — a separate wrapper project, cloned at
`/Users/adrian/OpenUI/workspace/openwebui-custom`. Not a fork, and not the product base.
