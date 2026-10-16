# Model Ceiling — deepseek-v4.1-flash (evaluation only)

Question: is the **current** Intelligent UI architecture already near-99%-capable when paired with a
stronger model? This milestone isolates **model quality** as the only variable.

# Executive summary

- Model: **`deepseek-v4.1-flash` only** (via the existing gateway), 3 runs × {v3 (60), holdout (33)}
  = 279 calls, **0 generation errors**.
- The production AUTO prompt, catalog, schemas, adapter and Rich gating were **frozen** (hashes
  recorded below); nothing was tuned.
- **v3:** channel **91.7 %**, family **90.6 %**; clear-intent (M9.8 convention) **92.7 % / 92.7 %**;
  invalid **0.6 %**.
- **Holdout:** channel **82.8 %**, family **80.8 %**; invalid **0 %**.
- DeepSeek **solves the weak cat-jam-free families**: Metric 53→**93 %**, Timeline 73→**100 %**,
  Comparison 80→**100 %**, Mixed 42→**75 %** (v3).
- **The near-99 % target is NOT reached** (clear channel 92.7 % < 99 %). **Level C** — the
  architecture is strong and model quality is the dominant lever, but a few families/patterns remain.
- **Intelligent UI v1 is NOT yet declared complete.** **M10 remains unnecessary.**

# Why this benchmark was run

M9.8 showed cat-jam-free plateaus (~66–85 %). The open question was whether that ceiling is the
**model** or the **architecture**. Running the same frozen system with a stronger model answers it.

# Frozen system configuration

| Artifact | Value |
|---|---|
| `catalog_prompt.py` sha256 | `b8f09fcf64ab207a9584143e5db0834dff4712ab5fa1b47967bfafb719f66cf2` |
| `filter.py` sha256 | `bca915fafe6d037ba570de561b8a5a1f7453a6c666b4348febfbbdff714bde63` |
| `adapter.ts` sha256 | `13f247554d54606e9d441bbf728628c76c5e91bca5bbb51dc5fe5ca4569b5e92` |
| `schema.ts` sha256 | `65fadbb9c54fe9255328aa83b14dbee2949518b98b94b509622614fbaec17542` |
| `PROMPT` | 13 311 chars, sha256 `49faa92b4752f179…` |
| `AUTO_HEADER` | 713 chars, sha256 `3f37e36ac3e3ff3a…` |
| `RICH_PROMPT` | 770 chars, sha256 `6856b123d19cbee6…` |
| `RICH_HEADER` | 180 chars |
| `CATALOG_VERSION` | 4 |

`SYSTEM = AUTO_HEADER + PROMPT + RICH_HEADER(auto) + RICH_PROMPT` — identical to M9.8 (Rich gating
unchanged). Nothing was modified during or between runs.

# Datasets

- **v3** — `docs/intelligent-ui/routing-benchmark-v3/prompts.json` (60 prompts), unchanged.
- **holdout** — `docs/intelligent-ui/routing-benchmark-v4/holdout.json` (33 prompts), unchanged,
  never used for tuning.
- Expected channels/families and scoring identical to M9.8. Real adapter (`parseIntelligentUI`), real
  schema validation, real channel/family classification.

# DeepSeek v3 results (3 runs)

| Metric | Mean | Range |
|---|---|---|
| Channel accuracy | **91.7 %** | 90.0 – 93.3 |
| Family accuracy | **90.6 %** | 88.3 – 91.7 |
| Clear-intent channel | **92.7 %** | — |
| Clear-intent family | **92.7 %** | — |
| Invalid | 0.6 % | 0 – 1.7 |
| Fallback | 0.6 % | — |
| Under-use / over-use | ~2.3 % / ~0.6 % | — |
| Rich over-use | ~1.7 % | — |
| Avg / median / p95 latency | ~9 650 / ~6 536 / ~43 894 ms | — |
| Prompt / completion / total tokens | ~3 819 / ~1 332 / ~5 151 | — |

# DeepSeek holdout results (3 runs)

| Metric | Mean | Range |
|---|---|---|
| Channel accuracy | **82.8 %** | 81.8 – 84.8 |
| Family accuracy | **80.8 %** | 75.8 – 84.8 |
| Invalid | **0 %** | — |
| Rich over-use | ~0.6 % | — |
| Avg / median / p95 latency | ~13 662 / ~7 455 / ~56 741 ms | — |
| Prompt / completion / total tokens | ~3 816 / ~1 957 / ~5 772 | — |

# Clear-intent results

Using the M9.8 convention (v3 excludes the 5 data-dependent/ambiguous prompts me3, me5, ga2, ga3,
ga4; n=165): **channel 92.7 %, family 92.7 %**. The holdout has no ambiguity flags, so all 33 count.

# Per-family results (mean channel / family)

| Family | DeepSeek v3 | DeepSeek holdout | cat-jam-free v3 (M9.8) |
|---|---|---|---|
| Markdown | 86.7 / 86.7 | 33.3¹ | 100 |
| Metric | **93.3** | 75 | 80 |
| Comparison | **100** | 88.9 | 66.7 |
| Table | **100** | 100 | 86.7 |
| Chart | **100** | 100 | 77.8 |
| Timeline | **100** | 100 | 73.3 |
| Tabs/Composed | 93.3 | 83.3 | 93.3 |
| Interactive/Form | 83.3 | 100 | 88.9 |
| Gallery | 58.3 / 41.7 | 22.2 / 11.1 | 41.7 |
| Query | **100** | — | 91.7 |
| Mutation | **100** | — | 88.9 |
| Rich Widget | **100** | 66.7 (Rich-vs-Native) | 100 |
| Mixed | 75 | **100** | 66.7 |

¹ single prompt (water cycle) → UI over-use in 2/3 runs.

DeepSeek **fixes the weak cat-jam-free families** (Metric/Timeline/Comparison/Mixed). **Gallery is the
one family that remains weak**, dominated by data availability (below).

# Cat-jam-free vs DeepSeek comparison

| Metric | cat-jam-free (M9.8) | deepseek-v4.1-flash | Δ (pp) |
|---|---|---|---|
| v3 channel | 81.1 % | **91.7 %** | **+10.6** |
| v3 family | 78.9 % | **90.6 %** | **+11.7** |
| v3 clear channel | 84.8 % | **92.7 %** | **+7.9** |
| v3 clear family | 84.2 % | **92.7 %** | +8.5 |
| v3 invalid | 0 % | 0.6 % | +0.6 |
| holdout channel | 65.6 % | **82.8 %** | **+17.2** |
| holdout family | 61.6 % | **80.8 %** | **+19.2** |
| holdout invalid | 1 % | 0 % | −1.0 |
| latency (mean, v3) | ~1 800 ms | ~9 650 ms | +7 850 ms (5.4×) |
| tokens (total, v3) | ~4 372 | ~5 151 | +779 |

DeepSeek is **much more reliable** (esp. on the holdout) but **~5× slower** and uses somewhat more
tokens (longer UI completions).

# Invalid output analysis

Exactly **one** invalid in 279 calls (v3 run1, `tc1` "Show specs and pricing in tabs"):

```
mPro = Metric("Pro", "12 990 kr", "Most popular", "positive")
```

The model passed a **4th positional argument** ("positive") to `Metric` — i.e. it expected a
`tone`/variant on Metric (exactly like the `tone` we added to `Badge` in M9.8). Metric's 4th slot is
`action` (an object), so validation rejected it. **Not** JS leakage, empty props, hallucinated
components, malformed syntax, or unsupported nesting. → a **minor contract asymmetry** (Badge has
`tone`, Metric does not). Targeted fix, not an architecture problem.

No other invalid categories were observed (no `.toFixed()`, no bad Badge tone, no malformed OpenUI).

# Gallery / data-availability analysis

Separating **routing intent** from **executable success**:

- **Routing intent** (did the model choose Gallery?): v3 ~42–58 %, holdout ~11–22 %. The model often
  answers in Markdown instead.
- **Executable success** (were safe image refs available?): **No** — none of these prompts supply
  real media; any `src` would be a placeholder (handled by `safeImageUrl`). So this is a
  **data-availability** limitation, not a parser failure.

DeepSeek is *better* than cat-jam-free at choosing Gallery for explicit "show images" prompts (e.g.
`ga2` → Gallery 3/3) but still declines for vague ones ("a gallery of the product screenshots",
"single image view of the company logo"). Per the milestone rule, **unavailable image data is not
counted as a parser failure**; Gallery routing intent is the honest metric.

# Native vs Rich analysis

- Rich for genuinely custom cases (3D chart, canvas particles) → correct (100 % v3 Rich).
- **Rich over-use ≈ 1.7 % (v3) / 0.6 % (holdout):** the **loan/mortgage and BMI calculators**
  sometimes chose a Rich widget or Markdown instead of the native Slider/Form/Metric. Native-first is
  *mostly* respected but not fully by DeepSeek either.
- No rich under-use.

# Mixed-response analysis

DeepSeek **improves Mixed**: v3 75 % (was 42 %), holdout **100 %**. It usually leads with prose and
follows with UI. The one v3 miss (`mx1` "Compare these three plans and tell me which is best") was
answered in Markdown-only (no UI) 3/3.

# Latency / tokens

| | cat-jam-free | deepseek-v4.1-flash |
|---|---|---|
| Avg latency (v3) | ~1.8 s | **~9.6 s** |
| Median (v3) | ~1.4 s | ~6.5 s |
| p95 (v3) | ~3.9 s | **~43.9 s** |
| Avg total tokens (v3) | ~4 372 | ~5 151 |

DeepSeek is **~5.4× slower** with a very long p95 tail. This is a real product trade-off: higher
routing quality at substantially higher latency/cost. No monetary cost was recorded (not exposed
unambiguously).

# 99 % target evaluation

| Target | Goal | DeepSeek (v3 clear / holdout) | Met? |
|---|---|---|---|
| Clear-intent channel | ≥ 99 % | 92.7 % | ✗ |
| Clear-intent family | ≥ 98 % | 92.7 % | ✗ |
| Invalid UI | ≤ 0.5 % | 0.6 % | ✗ (marginal) |
| Fallback | ≤ 0.5 % | 0.6 % | ✗ (marginal) |
| Safety violations | 0 % | 0 % | ✓ |
| Unnecessary Rich | ≤ 0.5 % | ~1.7 % | ✗ |
| Holdout channel | ≥ 95 % | 82.8 % | ✗ |
| Holdout family | ≥ 95 % | 80.8 % | ✗ |

Not massaged: the targets are **not met**, though the system is much closer than with cat-jam-free.

# Intelligent UI v1 completion decision

**Classification: LEVEL C** (clear-intent channel 90–94 %; holdout ~83 %, just under the C band).

The architecture is **strong and clearly model-bound**: with a stronger model, the previously weak
families (Metric/Timeline/Comparison/Mixed) become strong, and invalid/fallback stay ≤0.6 %. The
remaining gap is **not** an architecture failure — it is a mix of **model conservatism on vague/
data-free prompts, Gallery data availability, and two small contract/native-first gaps**. Therefore
**Intelligent UI v1 is NOT declared functionally complete yet**; only **targeted fixes** are
warranted (no planner).

# M10 decision

**M10 remains unnecessary.** DeepSeek shows **no systematic clear-intent routing failure**, **no
harmful over-use** (over-use ≈ 0.6 %), **no Native-vs-Rich confusion** beyond ~1.7 % rich over-use,
and **no repeated invalid output** (1/279, a minor contract asymmetry). A planner would add a second
model call/latency/cost without addressing conservative/data-availability misses.

# Recommended next step

Smallest targeted fixes (a later milestone; not done here):
1. **Metric `tone`** — add a `tone` prop to Metric for symmetry with Badge (removes the only invalid).
2. **Native-first for calculators** — strengthen so loan/BMI/pricing calculators stay native (cuts
   rich over-use).
3. **Gallery intent** — one rule to emit `Gallery` with safe/placeholder refs when the user asks to
   see images even if none are attached.
4. **Multilingual** — Norwegian prompts still under-use (Metric "Totalt antall ansatte", Gallery "Vis
   meg bildene", Comparison "Sammenlign …").
5. Re-run this exact frozen benchmark after those fixes.

# Answering the twelve questions

1. v3 channel accuracy? **91.7 %**.
2. v3 family accuracy? **90.6 %**.
3. Clear-intent channel? **92.7 %**.
4. Clear-intent family? **92.7 %**.
5. Holdout channel/family? **82.8 % / 80.8 %**.
6. Invalid/fallback rate? **0.6 % / 0.6 %** (v3); **0 %** (holdout).
7. Which families still fail? **Gallery** (routing + data availability), calculators (rich over-use),
   occasional Markdown over-use, Norwegian prompts.
8. Native-vs-Rich accuracy? ~**98 %** (rich over-use ~1.7 % v3 / 0.6 % holdout; no rich under-use).
9. How much better than cat-jam-free? **+10.6 pp** (v3 channel), **+17.2 pp** (holdout channel).
10. Near-99 %? **No** (clear channel 92.7 %).
11. v1 functionally complete? **Not yet** — Level C; architecture strong, targeted fixes remain.
12. M10 unnecessary? **Yes.**

# Reproduce

```bash
export OPENCODE_KEY=$(sqlite3 backend/data/webui.db \
  "select value from config where key='openai.api_keys';" | python3 -c "import sys,json;print(json.load(sys.stdin)[1])")
BENCH_MODEL=deepseek-v4.1-flash BENCH_DATASET=docs/intelligent-ui/routing-benchmark-v3/prompts.json \
  BENCH_NAME=v3 BENCH_RUNS=3 BENCH_OUTDIR=docs/intelligent-ui/model-ceiling-deepseek \
  npx tsx audit/lib/routing-benchmark-v4.mts
```

# Stop
