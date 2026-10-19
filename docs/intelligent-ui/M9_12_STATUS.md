# M9.12 — safe implementation slice and prepared evaluation

## M9.11 finalized

PR #1 was reviewed at `429fe30db`, clean and mergeable, targeting
`intelligent-ui-foundation` with both required CI jobs passing and no review comments.
It was explicitly authorized and merged with a merge commit **`110008de6`**. The resulting
foundation push workflow completed successfully. `main` was not modified. M9.12 starts from that
merge on **`feat/intelligent-ui-m9-12`**; it is a separate PR, not automatically merged.

Versions remain Open WebUI **0.12.3**, pinned OpenUI Lang Core **1.0.1**, catalog **4**.

## What this PR actually delivers

1. **Local control restoration** across reload/navigation with user/chat/block/program scoping.
   Calculator slider values, boolean controls, enumerated choices and Comparison selections are
   revalidated against the current tree before save/restore. Raw Input/Textarea content and unknown
   state variables are never automatically saved. 4 KiB/entry, 32 entries, 30-day expiration.
2. Async restore cannot overwrite a newer interaction or a different runtime/chat; streaming input
   takes precedence. Temporary chats stay in memory. Old program content remains compatible.
3. **Server state design/security assessment**, not activated server sync. A working prototype used
   chat variables, but review found model-context exposure and whole-object replacement/lost-update
   risks. That prototype code was removed before commit. See `PERSISTENT_STATE_DESIGN.md`.
4. **Frozen independent holdout**: 50 cases, 26 English / 24 Norwegian, prewritten intent/data/
   channel/family labels and a checksum. Real supplied data and valid local image refs are distinct
   from explicit unavailable-data cases. It has not been executed or used for tuning.
5. **Read-only preflight + spend/overwrite guards** for future model evaluation. Default runner mode
   makes no model calls; paid execution requires approval; a fresh output directory is mandatory.
   Production prompt/catalog/schema/evaluator remain unchanged.
6. **Prioritized product roadmap** based on existing Open WebUI Files/Knowledge/Folders/Notes/
   Tools infrastructure: `docs/PRODUCT_BACKLOG_CURRENT.md`. Smallest useful next product view:
   an authorized, read-only Unified Library, followed by Gallery over real file refs.

## Evidence

- Local unit suite: **194 Vitest tests** (175 merged baseline + 14 persistence-policy tests +
  5 holdout/runner-guard tests). Backend Intelligent UI suite: **53 pytest**.
- Production build passed. Prompt regeneration has no drift. Focused Intelligent UI type check
  contains only the existing Comparison accessibility and unused `done` warnings; new type errors
  are not accepted. Repository-wide Svelte failures remain a separate pre-existing baseline.
- **Real app Playwright** (`audit/lib/milestone9_12-browser.mjs`): 23 checks, no unexpected console
  errors, zero model calls. Covers reload restoration, reset, chat isolation, typed-text exclusion,
  partial-stream interaction, dark/light/mobile, no horizontal page overflow, invalid fallback,
  unknown Query safe failure, mutation approval/cancel/reload no-replay, and actual Rich button
  interaction inside a restricted iframe. Tests create/delete only their synthetic fixture chats.
- Browser explicitly verifies a fresh device starts at defaults: **cross-device sync is NOT
  shipped**. Initial prototype captures are labeled as rejected-prototype evidence, not product proof.
- OFF-generation identity is covered by the existing pytest suite. Historical fences intentionally
  still render when generation is disabled. No real model-driven OFF conversation or paid generation
  was executed here. Partial-to-complete user-state carry-over remains covered by merged M9.11 unit
  tests; the browser partial fixture is deterministic, not a live LLM stream.

## Limits / decisions still pending

- Cross-device persistence is unfinished; do not confuse the safe local slice with the original
  end-to-end server goal. Need owner-only atomic block patching, revision conflict handling,
  sharing/export privacy semantics and authorization tests before enabling it.
- Existing unscoped M4 browser-state entries are not imported automatically (cannot establish
  ownership/program identity). Historical UI programs still render. Comparison selection now uses
  the same scoped local policy, not an unowned old key.
- Contract v8 is a static heuristic, not proof of factual/functional correctness; its old 90.9%
  pilot is not a production reliability guarantee. No new model-quality percentages are claimed.
- **No paid or free model evaluation calls in M9.12.** Three-run DeepSeek/free-model comparison is
  prepared, pending explicit approval and gateway/billing/policy confirmation. See
  `m9-12-evaluation/PLAN.md` for official source, formula and caveats.
- A stacked follow-up branch (`feat/intelligent-ui-m9-12-free-eval`) adds a **zero-cost
  free-endpoint** evaluation path: a reviewed model registry, a separate free acknowledgment that
  is never interchangeable with paid approval, and recording of the response model id. It is
  prepared and unexecuted; see `m9-12-evaluation/FREE_MODEL_NOTES.md`. A free-endpoint result is a
  standalone measurement, never an update of the paid series.
- Published token-rate estimate: **USD 0.51–1.02 allowance-equivalent** for 282 DeepSeek calls at
  4k input + 2k output/call; allow about **USD 1.02–2.03** for 2× usage. Not an invoice guarantee.
  Proposed provisional cap **USD 3**, conditional on current account/provider validation.
- No production prompt tuning, new components, new dependencies, planner, search/media integrations
  or database migration.

## Review / merge recommendation

This is a **reviewable safe subset**, not a claim that all M9.12 goals are finished. Merge only the
scoped local restoration + evaluation preparation after CI/review. Keep cross-device sync and paid
evaluation explicitly pending; do not auto-merge this branch.
