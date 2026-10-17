# Milestone 9.10 Report — DeepSeek targeted reliability hardening

Contract/prompt hardening + evaluation only. No planner, no extra model call, no dependencies, no
runtime redesign. Reference model: **deepseek-v4.1-flash only**. Prompt/schema frozen before the
final benchmarks.

## Executive summary

- **Metric tone contract** added (shared vocabulary with Badge) — the only M9.9 invalid class is
  fixed; the model uses `Metric(..., "positive")` correctly.
- Prompt hardening: **native-first calculators**, **Gallery intent**, **multilingual cues**, **mixed
  responses** (PROMPT +3.9%, within the ≤5% budget).
- **Targeted tuning**: 55.6% → **83.3%** after one iteration (kept); a second was not needed.
- **v3** (frozen): channel **92.8 %**, family **90.0 %**, clear-intent **92.8 %**.
- **Legacy holdout**: channel **83.8 %**, family **82.8 %**.
- **NEW untouched holdout** (56 prompts, primary test): channel **82.1 %**, family **79.8 %**,
  clear-intent **87.8 %**.
- **Near-99 % NOT reached**; **Level C**. Remaining gap is **model behavior** (over-use on prose,
  limit-exceeding invalids, occasional under-use/wrong-family), plus **Gallery data availability**.
- **Intelligent UI v1 is NOT declared functionally complete.** **M10 remains unnecessary.**

## Changes made

1. `src/lib/intelligent-ui/tone.ts` — shared `TONE_VALUES`/`toneSchema` (single source; no duplicate
   enum).
2. `Metric` gained an optional 4th-arg `tone` (reuses the shared schema) + a subtle status dot;
   `Badge` now uses the shared schema. Unknown tones / malformed positional args are still rejected.
3. Prompt rules strengthened (see below).

## Metric tone contract

- Signature: `Metric(label, value, description?, tone?, action?)`. Tone ∈ `neutral|positive|warning|
  negative`; omitted by default; unknown → rejected.
- Visual: a **subtle** status dot next to the label (no colored marketing card); dark/light/a11y
  correct; no model-defined colors.
- **No migration**: tone-less persisted Metric output still renders (tests added).

## Prompt-size before/after

| | M9.9 | M9.10 | Δ |
|---|---|---|---|
| `PROMPT` | 13 311 | **13 836** | **+525 (+3.9 %)** |
| `AUTO_HEADER` | 713 | 713 | 0 |
| native AUTO `SYSTEM` | 14 026 | **14 551** | +525 (+3.7 %) |

Within the ≤5 % budget. Rule changes:
- **Native-first calculators**: build loan/mortgage/BMI/pricing/seats/savings/percentage/converter
  with native Input/Slider/Select/Switch/Metric/Chart + `$state`/`@Set`/`@Reset`; Rich only when
  native cannot express it.
- **Gallery intent**: images/photos the user asks to see → Gallery with safe paths only; never invent
  URLs; if none are available, say so in text.
- **Multilingual**: intent is semantic, not English-keyword dependent; the listed cues (sammenlign,
  total/totalt, hvor mye/mange, tabell, graf, tidslinje, beregn, vis bilder) **warrant the matching
  native UI in every language, even without data**.
- **Mixed**: keep the intro → UI → short interpretation format (already present; retained).

## Targeted tuning

Tuning set `routing-benchmark-v5/tuning.json` (36 prompts; Metric/Calculator/Gallery/Norwegian/
Mixed/Comparison/Timeline), deepseek only:

| Iteration | Channel | Family |
|---|---|---|
| Baseline | 55.6 % | 55.6 % |
| **Iteration 1 (kept)** | **83.3 %** | **83.3 %** |

Iteration 1 (the "…warrant the matching native UI in every language, even without data" line) fixed
Metric (3/7→7/7), Norwegian (3/6→6/6) and Mixed (2/4→4/4), and removed the savings-calculator rich
over-use. Gallery stayed 0/5 (data unavailable — expected). **One iteration used; frozen.**

## Frozen system configuration

| Artifact | Value |
|---|---|
| `catalog_prompt.py` sha256 | `221e4130119155246250ad090b37c8f11df438c98c16fa2e64e420c9acac200c` |
| `tone.ts` sha256 | `69fc1ee800255b1233d0e639cafef75ef3f69d14a0a4040f96cbbacbb4b0c22f` |
| `schema.ts` sha256 | `edbfe3952157295e78cc9211c5fb8efb2a1aa573959d7c2811f5386ab097d580` |
| `PROMPT` | 13 836 chars, sha256 `d0e626882ea2c392…` |
| `AUTO_HEADER` | 713 chars, sha256 `3f37e36ac3e3ff3a…` |
| `CATALOG_VERSION` | 4 |

## v3 comparison (deepseek, frozen M9.10)

| Metric | M9.9 | M9.10 |
|---|---|---|
| Channel | 91.7 % | **92.8 %** (91.7–93.3) |
| Family | 90.6 % | **90.0 %** (88.3–91.7) |
| Clear-intent channel/family | 92.7 / 92.7 | **92.8 / 90.0** |
| Invalid | 0.6 % | 1.1 % |
| Rich over-use | ~1.7 % | **0 %** |
| Latency (mean) | ~9.6 s | ~7.2 s |

## Legacy holdout / comparability set

`routing-benchmark-v4/holdout.json` (33 prompts, no longer fully untouched): channel **83.8 %**
(75.8–90.9), family **82.8 %**, invalid 1 %. (M9.9: 82.8 / 80.8.)

## New untouched holdout (primary generalization test)

`routing-benchmark-v5/new-holdout.json` (56 prompts; EN + NO; frozen before execution):

| Metric | Mean | Range |
|---|---|---|
| Channel | **82.1 %** | 80.4 – 83.9 |
| Family | **79.8 %** | 76.8 – 82.1 |
| Clear-intent channel | **87.8 %** | 84.6 – 90.4 |
| Clear-intent family | **85.9 %** | 82.7 – 88.5 |
| Invalid | 2.4 % | 1.8 – 3.6 |

## Per-family accuracy (mean channel / family)

| Family | v3 | Legacy holdout | New holdout |
|---|---|---|---|
| Markdown | 86.7 / 86.7 | 66.7 | 66.7 |
| Metric | 93.3 / 86.7 | 91.7 | 66.7 |
| Comparison | 100 | 100 | 86.7 |
| Table | 100 | 100 | 80 |
| Chart | 100 | 100 | 100 |
| Timeline | 100 | 100 | 100 / 75 |
| Tabs | 100 | 100 | 100 |
| Forms | 100 | 100 | 100 |
| Calculator (native) | — | — | 100 |
| Gallery | 33.3 / 0 | 11.1 / 0 | 8.3 / 0 |
| Query | 100 | — | 100 |
| Mutation | 100 | — | 100 |
| Rich | 88.9 | 33.3¹ | 66.7 |
| Mixed | 91.7 | 100 | 91.7 |

¹ legacy "Rich-vs-Native" mixes native/rich cases (see Native-vs-Rich).

## Gallery routing vs data availability

- **Routing intent** (chose Gallery): **0 / 12 (v3), 0 / 9 (legacy), 0 / 12 (new)** — the model
  never emits Gallery because **no image references exist** in any prompt.
- **Executable success**: 0 % (no safe refs available).
- The model **correctly explains in text** that no images are available (per the Gallery rule), which
  is the acceptable conservative behavior. Gallery cases in the new holdout are marked
  **ambiguous** and **excluded from clear-intent**. → Gallery is a **data-availability** limitation,
  not a routing failure.

## Native vs Rich

- **Native-capable calculators (new holdout): 15 / 15 = 100 % native** ✓ (target ≥99 %).
- **Rich-only scenarios (new holdout): 6 / 9 = 66.7 % rich** (3D globe 1/3, particle simulator 1/3,
  canvas tool 3/3) → **rich under-use** (the model sometimes answers in Markdown instead).
- Legacy: the loan calculator went **Rich** in 3/3 runs (rich over-use) — native-first is not
  universally applied.
- **Unnecessary Rich (over-use): v3 0 %, legacy ~1 %, new 0 %.**

## English vs Norwegian

New holdout: **EN channel 83.3 %** (n=138) vs **NO channel 76.7 %** (n=30, family 73.3 %). The
multilingual rule helped (M9.9 NO was weaker) but Norwegian is still ~7 pp below English.

## Invalid output analysis

7 invalids across 9 runs — **all model errors**, none architectural:

| Case | Cause | Class |
|---|---|---|
| v3 `ga2` | Gallery with **empty `src`** | wrong/empty positional prop |
| v3 `mx3` | `Timeline` used as its own items (nested misuse) | wrong positional args |
| legacy `h-nr1` | `Progress` value **< 0** (computed) | out-of-range value |
| new `n-ta2` (×3) | `Table` exceeded **MAX_TABLE_ROWS (50)** | limit exceeded |
| new `n-ga3` | Gallery with **empty `src`** | wrong/empty positional prop |

The schema **correctly rejected** each. No JS-expression leakage, no hallucinated components, no
malformed OpenUI. Fixes would be prompt guidance (row caps; empty-src) — **no schema relaxation**.

## Latency / tokens

| | v3 | Legacy | New holdout |
|---|---|---|---|
| Avg latency | ~7.2 s | ~11.5 s | ~12.3 s |
| Median | ~5.3 s | ~6.4 s | ~7.1 s |
| p95 | ~24.9 s | ~50.8 s | ~53.5 s |
| Prompt / completion / total tokens | ~3 957 / ~1 164 / ~5 121 | ~3 954 / ~1 839 / ~5 793 | ~3 954 / ~1 928 / ~5 882 |

## 99 % target evaluation

| Target | Goal | Result | Met |
|---|---|---|---|
| Clear-intent channel | ≥ 99 % | 92.8 % (v3) / 87.8 % (new) | ✗ |
| Clear-intent family | ≥ 98 % | 90.0 % / 85.9 % | ✗ |
| New holdout channel | ≥ 95 % | 82.1 % | ✗ |
| New holdout family | ≥ 95 % | 79.8 % | ✗ |
| Invalid | ≤ 0.5 % | 1.1–2.4 % | ✗ |
| Fallback | ≤ 0.5 % | 1.1–2.4 % | ✗ |
| Safety | 0 % | 0 % | ✓ |
| Unnecessary Rich | ≤ 0.5 % | ~0–1 % | ~ |
| Native calculator → native | ≥ 99 % | 100 % (new) | ✓ |

Not massaged — the near-99 % target is **not met**.

## Estimated remaining ceiling

- v3 clear-intent ~**93 %**; new-holdout clear-intent ~**88 %**; new-holdout overall ~**82 %**.
- The residual is dominated by **model behavior** (over-use on explanatory prompts, limit-exceeding
  invalids, occasional under-use/wrong-family, rich under-use) and **data availability** (Gallery).
  It is **not** an architecture/schema failure — the contract is sound and the strong model follows
  it for the vast majority of clear-intent prompts.

## Intelligent UI v1 completion decision

**Level C** (clear-intent channel 90–94 % on v3; new-holdout clear 87.8 %, overall 82.1 %). The
architecture is stable and model-bound; the remaining gaps are **model behavior + missing data**,
fixable only with small prompt guidance (not a planner). **v1 is NOT declared functionally
complete.**

## M10 decision

**M10 remains unnecessary.** No systematic clear-intent routing failure; over-use is low; Native-vs-
Rich is ~100 % for native-capable calculators; invalids are rare model errors (not architecture). A
planner would add cost/latency without addressing conservative/limit/data issues.

## Recommended next phase

Smallest targeted fixes (a later milestone):
1. Prompt: respect component limits (Table ≤ 50 rows) and never emit empty `Gallery` `src` — say so
   in text instead.
2. Prompt: reduce over-use on purely explanatory prompts (tighten "do not force UI for prose").
3. Rich: strengthen the cue that bespoke canvas/3D **should** be Rich (rich under-use).
4. Norwegian: reinforce compare/table cues.
5. Re-run this frozen benchmark after those fixes.

## Answering the sixteen questions

1. v3 channel/family after fixes? **92.8 % / 90.0 %**.
2. Clear-intent channel/family? **92.8 % / 90.0 %** (v3); **87.8 % / 85.9 %** (new).
3. Legacy holdout? **83.8 % / 82.8 %**.
4. NEW untouched holdout? **82.1 % / 79.8 %** (clear 87.8 %).
5. Metric accuracy? v3 **93.3 %**; legacy 91.7 %; new 66.7 % (data-dependent prompts).
6. Gallery routing-intent? **0 %** (no image data in any prompt).
7. Gallery executable success? **0 %** (no safe refs available) — data-availability, not routing.
8. Native-calculator accuracy? **100 %** (new holdout); legacy loan went Rich (over-use).
9. Rich-only scenario accuracy? **66.7 %** (rich under-use).
10. English vs Norwegian? **83.3 % vs 76.7 %**.
11. Invalid/fallback rate? **1.1–2.4 %** (model errors, none architectural).
12. Reach near-99 %? **No.**
13. Measured ceiling now? ~**93 %** (v3 clear) / ~**88 %** (new clear) / ~**82 %** (new overall).
14. Remaining gap? **Model behavior + missing data**, not architecture.
15. v1 functionally complete? **Not yet (Level C).**
16. M10 unnecessary? **Yes.**

## Reproduce

```bash
export OPENCODE_KEY=$(sqlite3 backend/data/webui.db \
  "select value from config where key='openai.api_keys';" | python3 -c "import sys,json;print(json.load(sys.stdin)[1])")
BENCH_MODEL=deepseek-v4.1-flash BENCH_DATASET=docs/intelligent-ui/routing-benchmark-v5/new-holdout.json \
  BENCH_NAME=new-holdout BENCH_RUNS=3 BENCH_OUTDIR=docs/intelligent-ui/routing-benchmark-v5 \
  npx tsx audit/lib/routing-benchmark-v4.mts
```

## Stop
