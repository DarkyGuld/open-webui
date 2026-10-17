# Continue on a New Machine — ready-to-paste prompt

Copy everything in the block below into a fresh OpenCode session on the new machine.

---

```text
You are continuing an existing project. Do NOT re-research or redesign the existing
architecture unless tests or source show it is broken.

Repository: DarkyGuld/open-webui (fork of open-webui/open-webui)
Branch to check out: intelligent-ui-foundation

Before doing anything, read, in order:
1. AGENTS.md
2. HANDOFF.md
3. docs/intelligent-ui/RECOMMENDATION.md
4. docs/intelligent-ui/MILESTONE_1_REPORT.md
5. docs/intelligent-ui/MILESTONE_2_REPORT.md
6. docs/intelligent-ui/MILESTONE_3_REPORT.md
7. docs/intelligent-ui/MILESTONE_4_REPORT.md
8. docs/intelligent-ui/MILESTONE_9_5_REPORT.md (and the other M5–M9.x reports)
9. docs/intelligent-ui/UX_GUIDELINES.md + NATIVE_COMPONENT_CATALOG.md + PARITY_VISUAL_AUDIT.md
10. docs/intelligent-ui/MILESTONE_9_10_REPORT.md + MODEL_CEILING_DEEPSEEK_V4_1_FLASH.md +
    ROUTING_BENCHMARK_V2.md + ROUTING_BENCHMARK_V3.md (routing/capability evals; cat-jam-free
    plateaus ~66–85%, deepseek-v4.1-flash v3 92.8%/clear 92.8%, new holdout 82.1%; M10 deferred/
    unnecessary; v1 not yet declared complete)
11. docs/intelligent-ui/M9_11_STATUS.md (merged via PR #1, evaluation contract v8)
12. docs/library/STATUS.md + DESIGN.md + SERVER_STATE_REVIEW.md (independent read-only Library;
    PR #2 is a separate branch; no server sync or paid evaluation enabled)
13. docs/FRESH_MACHINE_SETUP.md

Then:
- Inspect git history (git log --oneline -20) and the current branch/commit.
- Set up the local environment per docs/FRESH_MACHINE_SETUP.md.
- Run the baseline tests:
    PYTHONPATH=backend .venv/bin/python -m pytest tests/intelligent_ui -q
    npx vitest run --reporter=dot
    NODE_OPTIONS=--max-old-space-size=8192 npm run build
- Start the app (./scripts/audit/start-local) and verify the frontend and backend respond.
- Confirm the Intelligent UI contract: with effective mode OFF, the request is unchanged;
  with AUTO/ON the catalog prompt is injected; the :::intelligent-ui block renders natively.

M9.11 was merged as 110008de6. Inspect current PRs before continuing: PR #2 contains the separate
M9.12 safe-state/evaluation preparation, while feat/read-only-library adds an independently tested
read-only Library over existing Files. Next useful slice: image-grid/Gallery binding using real
authorized file ids. Server sync needs the reviewed atomic/privacy design; paid calls need approval.

Constraints (unchanged):
- Native Open WebUI styling only; no external visual layer.
- No arbitrary HTML/JS; strict schema + safe Markdown fallback.
- OFF = byte-for-byte stock Open WebUI.
- Keep upstream/core edits minimal.
- Do not push to main; work on a feature branch.
```

---

## Notes

- If a test fails, check `setup/BASELINE_STATUS.md` — some failures are documented as
  pre-existing/environmental (e.g. `svelte-check`).
- The provider requires a session header; see `docs/FRESH_MACHINE_SETUP.md` ("Model provider").
- Research clones are intentionally not committed; conclusions live in `docs/intelligent-ui/`.
