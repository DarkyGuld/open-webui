# Free-endpoint evaluation path (no paid spend)

**Status: prepared, not executed.** No model call has been made from this path. The locally stored
OpenCode key is expired, so execution is blocked until a valid key is provided. This document
describes exactly what will run, under which conditions, and how the result may — and may not — be
interpreted.

## Why this path exists

The paid 3× run of the frozen holdout needs an explicit budget approval (see `PLAN.md`). A free
endpoint with an unlimited monthly allowance removes the spend question, so the contract can be
measured against the frozen holdout **at zero cost**.

That is the only thing this path buys. It does **not** replace the paid run:

- The paid series (`deepseek-v4.1-flash`) is the comparable series. A free-endpoint result is a
  **standalone measurement**, never an update of that series.
- Free endpoints are _limited time_ and may be withdrawn, replaced or re-pointed. A number measured
  today may not be reproducible later. Every result therefore records the requested model, the
  **model id the provider actually answered with**, the endpoint and the date.

## Approved models

| Model id                   | Tier | Endpoint                                                      | Allowance                            | Retention / training          | Comparable with           |
| -------------------------- | ---- | ------------------------------------------------------------- | ------------------------------------ | ----------------------------- | ------------------------- |
| `minimax-m3.1-flash-free`  | free | `https://opencode.ai/inference/go/openai/v1/chat/completions` | unlimited monthly                    | no training, 0-day retention  | nothing (new-free)        |
| `longcat-2.5-preview-free` | free | same                                                          | unlimited monthly                    | no training, 0-day retention  | nothing (new-free)        |
| `beam-free`                | free | same                                                          | unlimited monthly, region-restricted | no training, 30-day retention | nothing (new-free)        |
| `deepseek-v4.1-flash-free` | free | `https://opencode.ai/inference/openai/v1/chat/completions`    | unlimited monthly                    | no training, 0-day retention  | nothing (new-free)        |
| `cat-jam-free`             | free | Go endpoint                                                   | historic pilot model                 | historic                      | historic-free series only |
| `deepseek-v4.1-flash`      | paid | Go endpoint                                                   | metered                              | no training, 0-day retention  | historic-paid series      |

The registry and its guards live in `scripts/intelligent-ui/bench-models.ts`; the runner
(`audit/lib/routing-benchmark-v6.mts`) refuses any model outside it.

## Requirements

1. A valid OpenCode API key. The Go endpoint requires an active Go/Go Plus subscription; the
   pay-as-you-go endpoint requires billing details on file even for $0 models. The key is passed as
   `OPENCODE_KEY` and is never written to disk or to the results.
2. `ffmpeg` is not needed here (no media fixtures), but the local Python environment
   (`.venv`, Python 3.11) is: the runner reads the real production AUTO/Rich prompt from
   `backend/open_webui/intelligent_ui/`.

## Commands

Preflight — zero API calls, prints the plan, comparability and endpoint:

```bash
BENCH_MODEL=minimax-m3.1-flash-free BENCH_RUNS=3 \
  BENCH_DATASET=docs/intelligent-ui/m9-12-evaluation/holdout.json \
  npx tsx audit/lib/routing-benchmark-v6.mts
```

Execution — requires the free acknowledgment and a fresh output directory:

```bash
BENCH_EXECUTE=1 BENCH_FREE_ACKNOWLEDGED=1 \
BENCH_MODEL=minimax-m3.1-flash-free BENCH_RUNS=3 \
BENCH_DATASET=docs/intelligent-ui/m9-12-evaluation/holdout.json \
BENCH_OUTDIR=docs/intelligent-ui/m9-12-evaluation/results-free-minimax-m3-1-flash \
OPENCODE_KEY="$OPENCODE_KEY" \
  npx tsx audit/lib/routing-benchmark-v6.mts
```

`BENCH_FREE_ACKNOWLEDGED=1` is required because the endpoint is limited-time and the result is not
comparable with the paid series. `BENCH_PAID_APPROVED=1` remains required for metered models and
is never accepted for a free model (and vice versa).

## What the result records

Per run: contract version, requested model, **response model ids actually observed**, tier,
series, `comparableToHistoricalSeries`, endpoint, model note, per-dimension counters, error count,
latency (avg/median) and token usage. Per case: the classification, the verdict, the response
model id, latency, tokens and the raw answer (capped at 4 000 characters).

## Interpretation rules (unchanged from `PLAN.md`)

- `overallOk` means the **heuristically checked dimensions** passed. It is not proof of factual or
  functional correctness; `factCheck` may be `unverified` and must be reported as such.
- A free-model score is a **standalone measurement**. Do not present it as the routing quality of
  the product, and do not compare it to the deepseek series.
- Publish per-language and per-intent counts, include errors in the denominators, and report
  incomplete or unverifiable cases separately instead of silently counting them as successes.
- No prompt tuning against holdout failures. No repeated runs until a desired percentage appears.
  Maximum three runs, one dataset per output directory, and existing results are never overwritten.
- No 99 % claim is justified by 50 cases and three correlated runs, whatever the score is.

## Privacy

All holdout prompts are synthetic. `minimax-m3.1-flash-free` and `longcat-2.5-preview-free` apply
zero data retention and no training use. `beam-free` retains requests for 30 days. No production
data, user data or confidential material may be sent through any of these endpoints.
