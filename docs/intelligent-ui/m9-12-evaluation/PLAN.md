# M9.12 — frozen evaluation plan and cost approval request

**Preparation only. No model calls (paid or free) executed in M9.12.** Production AUTO/catalog
prompts, schemas and contract v8 are unchanged from merged M9.11. Historical runs stay untouched.

## Freeze and independence

- Development set: the existing 44 cases in `routing-benchmark-v6/prompts.json`.
- **Independent holdout: 50 new cases, 26 English / 24 Norwegian**, in `holdout.json`. It contains
  supplied datasets, safe available `/favicon.png` references, explicit unavailable-data scenarios,
  prose, calculators, custom Rich cases, mixed answers, authorized Query and approved Mutation UI.
- Labels were written before execution; none were sent to a model. No holdout responses exist.
- `freeze.json` registers dataset, evaluator and prompt hashes. An offline checksum regression
  catches silent edits. No exact duplicates of old tuning/holdout prompts were found; this does
  not prove statistical independence from familiar presentation concepts.
- `npx tsx scripts/intelligent-ui/evaluation-preflight.ts` is read-only and makes **zero API calls**.

## Method after explicit approval

Run each dataset 3 times per model (`cat-jam-free` and exactly `deepseek-v4.1-flash` if still
available), same frozen production AUTO + Rich instructions and real adapter/schema path.
Report the provider defaults (sampling parameters are currently omitted), response model id,
system/data/evaluator hashes, usage, failures and latency. No silent model substitution.

Runner now defaults to **preflight/no execution**. `BENCH_DATASET` selects a dataset independently
of a fresh `BENCH_OUTDIR`. Existing results cannot be overwritten. Execution requires
`BENCH_EXECUTE=1`; paid execution also requires an explicitly approved run and
`BENCH_PAID_APPROVED=1`. That flag is an accidental-spend guard, not a substitute for approval.

Example **safe preflight** (does not send a request):

```bash
BENCH_MODEL=deepseek-v4.1-flash BENCH_RUNS=3 \
  BENCH_DATASET=docs/intelligent-ui/m9-12-evaluation/holdout.json \
  npx tsx audit/lib/routing-benchmark-v6.mts
```

Use a new output directory per model and run-set after approval. Perform no prompt tuning against
holdout failures, and do not repeat evaluations until a desired percentage appears.

## Correctness dimensions

Keep separate: channel, family, data availability, missing-data explanation, supplied-value
coverage, invented references, authorized query **binding** (not retrieval success), native parse
validity, Rich static compatibility (not runtime success), mixed presentation and API failures.

Contract v8's `overallOk` means the **heuristically checked dimensions passed**. It is not proof
of factual or functional correctness. In particular:

- Numeric tokens can match metadata or control parameters; matching does not verify associations,
  formulas or arithmetic. `manualExpectedResult` in holdout is a human verification label, not an
  input to the model or automatic evidence of correct computation.
- Missing-data question detection and mixed-prose-length checks are heuristics. Review each miss
  and a sample of passes independently. Mark facts/functional correctness **unverified** until
  demonstrated. Do not call the old single-run 90.9% pilot product reliability.
- For unavailable-data cases, a question/explanation is useful behavior. Provided-image cases
  separately test Gallery intent and source correctness; missing-image cases do not become parser
  errors merely because an image is absent.
- Query references must use real allowed ids. Actual loading/permissions need browser/backend
  tests. Mutation UI never executes during a routing benchmark; approval/replay protections need
  separate tests. Rich needs browser interaction and sandbox/CSP verification.
- Publish both per-language/per-intent counts and mean/min/max for all three runs. Include errors
  in denominators; separately report incomplete/unverifiable cases, not silently successful ones.

No 99% claim is justified by 50 cases and three correlated runs, even if observed scores are high.

## Current public pricing and estimated expense

Read **2026-10-17**, official OpenCode Go documentation: <https://opencode.ai/docs/go/>.
DeepSeek V4.1 Flash prices per 1M tokens:

| Period | Input | Output | Cache read |
|---|---:|---:|---:|
| Off-peak | USD 0.15 | USD 0.60 | USD 0.003 |
| Peak | USD 0.30 | USD 1.20 | USD 0.006 |

The source lists Go / Go Plus subscription plans and quotas; spending can consume subscription
allowance, and optional balance fallback may create extra charges. Peak is weekdays 01–04 and
06–10 UTC. Current docs use a newer gateway URL than the historically configured
`https://opencode.ai/zen/go/v1/chat/completions`; whether that legacy route has identical billing
and permits these general UI-evaluation requests **must be confirmed** before execution. Go is
primarily documented for coding-agent traffic. Do not infer authorization from model availability.

Observed M9.9–9.10 DeepSeek usage was about 3,800–4,000 prompt and 1,100–2,000 completion
tokens per request, often 7–14 seconds average, with long tails. Planning conservatively at
4,000 input + 2,000 output:

- DeepSeek: `3 × (44 + 50) = 282` calls.
- Approximately **1,128,000 input + 564,000 output = 1,692,000 total tokens**.
- At uncached published rates: **USD 0.5076 off-peak / USD 1.0152 peak** allowance-equivalent.
- Budgeting 2× usage for variation: **about USD 1.02–2.03**; this is not a hard billing cap or a
  promise about the account's invoice. Subscription charge, taxes, retries, and unusually long
  reasoning/completions can differ. Cache savings are not assumed.
- Serial execution: about **33–66 minutes**, allow 60–90 minutes for slow calls/limits. Never
  retry model-output failures for a higher score; separately record provider failures/retries.

An equal free-model comparison would add 282 calls (historically about 12 minutes at 2.5 s/call);
its current zero-cost availability must also be confirmed. No calls are authorized by this document.

**Approval needed:** confirm the model/provider and request a monetary limit (suggested provisional
maximum USD 3, conditional on billing/usage-policy confirmation). Stop rather than substitute a model
or run beyond the approved limit.
