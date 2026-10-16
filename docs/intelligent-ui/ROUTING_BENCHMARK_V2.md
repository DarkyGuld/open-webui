# Routing Benchmark v2 — cat-jam-free (cheap model only)

**Evaluation-only milestone.** No features, no schema/catalog changes, no new dependencies, no
planner. This measures whether the M9.5 AUTO prompt tuning + catalog-prompt reduction improved
one-pass routing on the **cheapest/free** model.

# Executive summary

- Model: **`cat-jam-free`** (only model tested; gateway `opencode.ai/zen/go/v1/chat/completions`).
- Same **50 prompts**, same expected-channel labels, same scoring as v1.
- **System prompt = the exact live production AUTO prompt** (AUTO_HEADER + PROMPT read from the
  Python source), frozen before the run.
- Three full runs (150 calls, 0 generation errors):

| Metric | v1 (1 run) | v2 (mean of 3) | v2 range |
|---|---|---|---|
| Channel accuracy | **78 %** | **82.7 %** | 78 – 88 % |
| Component accuracy | 78 % | **82.0 %** | 76 – 88 % |
| Invalid OpenUI | 0 % | **1.3 %** | 0 – 2 % |
| Fallback | 0 % | **1.3 %** | 0 – 2 % |
| Avg latency | ~2 235 ms | **~1 676 ms** | 1 610 – 1 739 ms |
| System prompt | ~14 700 chars | **12 784 chars** | — |
| Avg tokens/call | ~3 073 | **~3 746** | 3 729 – 3 764 |

**Bottom line:** cat-jam-free improved modestly (**+4.7 pp** mean channel accuracy) and got faster
(**−25 %** latency), but the improvement is **within the model's run-to-run variance** (its worst v2
run, 78 %, equals v1). Invalid/fallback stayed **near zero** (≤2 %). The prompt shrank **−13 %**. The
cheapest model is **acceptable** for conservative AUTO; **M10 is not justified**.

# Method

- **Prompts / labels / scoring:** identical to v1 (`audit/lib/routing-benchmark.mts`); copied
  verbatim into `audit/lib/routing-benchmark-v2.mts`. Expected labels were **not** altered.
- **Production prompt:** `AUTO_HEADER` and `PROMPT` are read at run time from
  `backend/open_webui/intelligent_ui/{filter,catalog_prompt}.py` (via the venv Python) — i.e. exactly
  what the Filter injects in AUTO after M9.5. `SYSTEM = AUTO_HEADER + "\n\n" + PROMPT`.
- **Real parser:** responses classified by the production adapter `parseIntelligentUI`; component
  match is tree-wide (root or any descendant).
- **Scoring (unchanged from v1):** channel OK if `actual == expected`, or expected `native` and got
  `native`/`rich`. Component OK for native cases if any expected component appears in the tree.
- **Model:** fixed `cat-jam-free`; no substitution. 0 generation errors across 150 calls.
- **Frozen:** prompt/catalog/schema/labels were not changed during or between runs.
- Raw data: `docs/intelligent-ui/routing-benchmark-v2/results.json` (run 1 full + `means`, `ranges`,
  `runs`), plus `results-run1..3.json`.

# V1 baseline

`cat-jam-free`, 50 prompts, 0 errors: channel **78 %**, component **78 %**, invalid **0 %**,
fallback **0 %**, avg latency **~2 235 ms**, avg tokens/call **~3 073**. Failure pattern: conservative
**Markdown under-use** (9 under-use, 2 over-use).

# V2 cat-jam-free result

Mean of 3 runs: channel **82.7 %** (78/88/82), component **82.0 %** (76/88/82), invalid **1.3 %**
(2/2/0), fallback **1.3 %**, avg latency **~1 676 ms**, median **~1 496 ms**, p95 **~3 398 ms**,
prompt tokens **3 210** (constant), completion tokens **~536**, total **~3 746**.

# V1 vs V2 table

| Metric | V1 | V2 (mean) | Δ |
|---|---|---|---|
| Channel accuracy | 78 % | 82.7 % | **+4.7 pp** (+6.0 % rel.) |
| Component accuracy | 78 % | 82.0 % | +4.0 pp |
| Invalid UI | 0 % | 1.3 % | +1.3 pp (regression) |
| Fallback | 0 % | 1.3 % | +1.3 pp (regression) |
| Avg latency | ~2 235 ms | ~1 676 ms | **−559 ms (−25 %)** |
| Prompt tokens | ~3 617 (estimate) | **3 210 (measured)** | −407 (see note) |
| Avg tokens/call | ~3 073 | ~3 746 | +673 (see note) |

**Token-measurement note (important):** v1 recorded **only `total_tokens`** (~3 073) and quoted a
prompt-token figure (~3 617) that is **internally inconsistent** with that total (prompt cannot
exceed total). The v2 gateway returns exact `prompt_tokens` (3 210) and `completion_tokens` (~536).
The reliable, comparable cost metric is therefore the **system-prompt size in characters**
(14 700 → 12 784, −13 %), not the cross-run token totals. The v2 total being *higher* than v1 is best
explained by longer completions (more UI emitted) plus possible tokenizer/accounting differences on
the free gateway; it is **not** evidence of a larger prompt.

# Token reduction (reliable metric)

- v1 system prompt: old AUTO_HEADER (~231 chars) + PROMPT 14 467 = **~14 700 chars**.
- v2 system prompt: AUTO_HEADER 496 + PROMPT 12 286 = **12 784 chars**.
- Reduction: **−1 916 chars (−13.0 %)**, ≈ **−479 tokens/call** (÷4), ≈ **−23 950 tokens over 50
  calls**. (Catalog `PROMPT` alone: 14 467 → 12 286, −15.1 %.)

# Latency comparison

v1 ~2 235 ms → v2 ~1 676 ms mean (−25 %), median ~1 496 ms, p95 ~3 398 ms. The free gateway's
latency varies run to run; the reduction is consistent across all three v2 runs.

# Error taxonomy

Across 150 calls (sum): **under-use 20**, **over-use 4**, **wrong-component 1**, **invalid 2**,
rich-unnecessary 0, generation-failure 0.

- **A. Under-use** (Markdown when UI expected) — dominant (≈13 %/run). Representative:
  *"Tabulate the quarterly sales numbers."*, *"What is 15% of 2400?"*, *"How many employees do we
  have in total? Just the number."*, *"Give me the headline total revenue figure."*, *"Summarize
  these three options for me to choose from."*, *"Compare these three VPS plans."*
- **B. Over-use** (UI when Markdown expected) — rare (≈2.7 %/run): *"Explain the difference between
  TCP and UDP."*, *"Explain the water cycle."*, *"Explain how HTTPS works."* (run-dependent).
- **C. Wrong native component** — 1 (run1): *"Compare iPhone and Android"* → `table` (expected
  `comparison`; a Table is a defensible alternative).
- **D. Invalid OpenUI** — 2 (both the loan-calculator case). Cause identified: the model emitted
  **JS method syntax** `monthly.toFixed(2)` inside a `Metric` value → `type-mismatch:Metric`. This is
  an **expression-capability gap**, not a routing failure.
- **E. Fallback** — equals invalid (1.3 %); the adapter rejects and the UI falls back safely.
- **F. Rich Widget unnecessarily chosen** — **0** (AUTO does not advertise the rich fence).

# Component-family observations

**v1-comparable (families present in v1 prompts):**
- **Table** — strong; correctly chosen for explicit "table"/"list"/"show data" phrasings.
- **Comparison** — good for explicit "comparison"; sometimes substituted by Table/Stack, and missed
  once ("Compare these three VPS plans").
- **Metric** — good when the word "metric"/"single number" appears; **weak** for "just the number" /
  "headline figure" phrasings (all under-use).
- **Slider/Form/interactivity** — strong (form, stack-with-slider) except the loan calculator which
  produced invalid output.
- **Composed Stack/Grid/Card** — frequently produced for dashboard/overview prompts.
- **Markdown** — correctly used for 13/15 explanatory prompts; 2 over-use.

**New families (not exercised by v1 prompts — observations only, not scored):** Chart and Timeline
had **no** v1 prompts, so trend/chronology triggers are unmeasured here; Gallery/media likewise. The
expanded catalog is available to the model but this benchmark cannot score those families without
new prompts (out of scope for a v1-comparable run).

# M9.5 trigger analysis

| Trigger family | v1 cases | v2 outcome |
|---|---|---|
| compare / alternatives → Comparison or Table | 5 (+1 "summarize options") | ~half: 2 Comparison, 1 Table, 2 Stack, **2 under-use** |
| table / dataset → Table | 5 (+1) | strong: 5 Table/Stack-with-table, **1 under-use** ("Tabulate…") |
| single value → Metric | 6 | weak: 2 Metric/Stack-with-metric, **4 under-use** ("just the number") |
| trend over time → Chart | 0 | **not exercised** |
| interactive calculation → state/form | 4 | 3 good (form/stack), **1 invalid** (loan calc `.toFixed`) |
| events / chronology → Timeline | 0 | **not exercised** |

The M9.5 AUTO preference rules helped the **table** family most; **metric** ("just the number")
remains the weakest trigger. Chart/Timeline triggers cannot be judged from v1 prompts.

# Cheap-model quality classification

**Acceptable (80–84 %)** on the primary metric (mean channel accuracy **82.7 %**). Component accuracy
**82.0 %**; invalid/fallback **1.3 %** (near zero). The failure mode is overwhelmingly **conservative
under-use**, so a miss degrades to a normal Markdown answer rather than a broken one.

# M10 recommendation

**Do not build M10.** Per the decision framework: mean is in the 80–84 % band (acceptable), invalid/
fallback ≤ 2 %, and errors remain conservative under-use — **a planner is not justified**. The one
non-conservative regression (invalid `.toFixed()`) is a prompt/expression issue, not a routing
structure issue.

# Recommended next step

1. **Prompt micro-tuning (cheap):** strengthen the *single value / "just the number"* trigger and add
   a one-line rule to avoid JS method calls in expressions (e.g. "do not use `.toFixed()`; pass
   numbers as-is"). Re-run this exact benchmark after (belongs to a later milestone).
2. **Add chart/timeline/gallery prompts** to a *v3* set to measure the new families (kept separate so
   v1/v2 stay comparable).
3. Do **not** add a planner; revisit only if a future run shows structural (non-conservative) errors.

# Answering the six questions

1. **Did cat-jam-free improve from 78 %?** Slightly — mean **82.7 %** (best run 88 %); within its
   variance (worst run 78 % = v1).
2. **By how much?** **+4.7 pp** absolute, **+6.0 %** relative (mean of 3 runs).
3. **Did invalid/fallback remain near zero?** Yes — **1.3 %** mean (0–2 %); not literally zero (v1
   was 0 %), caused by `.toFixed()`.
4. **Was prompt/token cost reduced?** Yes — system prompt **14 700 → 12 784 chars (−13 %, ≈ −479
   tokens/call)**; v2 measured prompt tokens **3 210**.
5. **Is the cheapest model good enough for AUTO?** **Yes, acceptably** — conservative failure mode,
   near-zero invalid; prompt tuning still worthwhile.
6. **Is M10 still justified?** **No.**

# Reproduce

```bash
export OPENCODE_KEY=$(sqlite3 backend/data/webui.db \
  "select value from config where key='openai.api_keys';" | python3 -c "import sys,json;print(json.load(sys.stdin)[1])")
npx tsx audit/lib/routing-benchmark-v2.mts   # writes docs/intelligent-ui/routing-benchmark-v2/results.json
```

# Stop
