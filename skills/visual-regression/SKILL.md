---
name: visual-regression
description: Verify UI changes visually with Playwright in Personal AI Workspace. Use when a UI change must be proven not to regress, when comparing before/after screenshots, or when running the capture→diff→vision→fix loop.
---

# Visual Regression

Prove UI changes visually. Never claim a UI change is correct without screenshots.

## Loop

1. **Capture baseline** (before) — `./scripts/audit/capture-local` (or a specific page).
2. **Capture implementation** (after) — same target/viewport.
3. **Compare** — `./scripts/audit/visual-diff <baseline.png> <candidate.png> <diff.png>`
   → emits a similarity score and a highlighted diff image.
4. **Inspect with a vision-capable model** — read both images and the diff; judge whether
   differences are meaningful (see `setup/VISION_MODEL.md`).
5. **Fix meaningful differences** — ignore anti-aliasing/sub-pixel noise; fix real shifts.
6. **Re-run** until the diff is clean and the vision review agrees.

## Capture utilities (`audit/lib/browser.mjs`)

- headed Chrome / persistent profile
- full-page and element screenshots
- video recording and Playwright trace recording
- console-error and failed-request capture

## Rules

- Compare like-for-like: same viewport, same state, same data.
- Store baselines under `audit/<target>/` and diffs under `audit/diffs/` (gitignored).
- Report the similarity score and attach the diff for every UI PR.
