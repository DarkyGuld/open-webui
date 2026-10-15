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
8. docs/FRESH_MACHINE_SETUP.md

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

Continue from the documented next milestone (Milestone 4) in HANDOFF.md:
durability (output[]), catalog expansion, provider capability matrix, i18n, interaction.

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
