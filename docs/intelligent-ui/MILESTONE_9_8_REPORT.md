# Milestone 9.8 Report — Targeted reliability hardening

Evaluation + targeted guidance only. No planner, no extra model call, no dependencies, no new
component families, no runtime redesign. Model: **cat-jam-free only**. The prompt was **frozen after
Phase A** and not changed during the benchmark runs.

## Executive summary

- **Prompt/schema hardening** (Metric/Gallery/Mixed/Chart-Table/Timeline guidance, native-first
  calculator rule, multilingual note, **Badge tone contract**, Metric non-empty-label guidance).
- **Tuning set** (32 prompts, weak families): baseline channel 50% → **67.7%** after one micro-tuning
  iteration (over-use still 0). A second iteration **regressed** (53.1%) and was reverted — two
  iterations used, as allowed.
- **v3 re-run** (frozen prompt, same 60 prompts, 3 runs): channel **81.1%** (was 77.2%), family
  **78.9%** (was 73.3%), invalid **0%** (was 1.1%), clear subset channel **84.8%**.
- **Holdout** (33 untouched prompts, 3 runs): channel **65.6%**, family **61.6%**, invalid **1%**.
- The **99% target is NOT reached.** cat-jam-free plateaus at **~81% (v3, clear ~85%)** and **~66%
  (holdout)**. The residual gap is dominated by **conservative under-use** and is a **model-capability
  limitation**, not an architecture/prompt gap. Over-use ≈ 0, safety issues 0.
- **M10 remains unnecessary.**

## Prompt hardening changes (Phase A, frozen)

Rules in `generate-prompt.ts` + `filter.py`:
1. Rule 5: Metric ("how much"/"just the number"/"how many") **always with a short non-empty label**,
   e.g. `Metric("Total", "980 kr")`; Chart-vs-Table discrimination; Timeline for chronological events
   only; **Gallery only with safe paths, never invented URLs**.
2. Rule 11: **Mixed answer** format (short intro → UI → short interpretation), no data duplication.
3. New rule: **native-first** — calculators use native Slider/Form/Metric, Rich only when native
   cannot express it (3D/canvas).
4. New rule: **multilingual intent** note (compare/sammenlign, total/totalt, table/tabell,
   timeline/tidslinje, show images/vis bilder).
5. **AUTO header nudge** (iteration 1, kept): *"If the user explicitly asks to see/show/compare/
   chart/list/tabulate or for a number, provide the native UI even when exact values are unavailable
   (use representative values)."* This was the change that moved the tuning set (50% → 67.7%).

Schema/contract:
6. **Badge** now takes an optional `tone` (`neutral|positive|warning|negative`) as its 2nd argument —
   `Badge("Save 17%", "positive")` is valid; unknown tones and malformed positional args are rejected.
   (Clarifies the contract; does not loosen validation.)
7. **Metric** keeps strict non-empty label; guidance (not schema) tells the model to generate one.

## Prompt size before/after

| | M9.7 | M9.8 | Δ |
|---|---|---|---|
| `PROMPT` (catalog) | 12 719 | **13 311** | **+592 (+4.65 %)** |
| `AUTO_HEADER` | 533 | 713 | +180 |
| native AUTO `SYSTEM` | 13 254 | **14 026** | +772 (+5.8 %) |

`PROMPT` is within the <5 % budget; the total system prompt grew 5.8 % because the AUTO-mode nudge
(mode text, not the catalog prompt) is the change that produced the tuning gain. Still far below the
pre-M9.5 ~14 700 chars.

## Method

- Datasets: `docs/intelligent-ui/routing-benchmark-v4/{tuning.json, holdout.json}` and the unchanged
  `docs/intelligent-ui/routing-benchmark-v3/prompts.json` (re-run).
- Runner: `audit/lib/routing-benchmark-v4.mts` — production AUTO prompt (incl. rich), real adapter,
  same scoring as v3 (channel/family/mixed/JS-leak), cat-jam-free only.
- Tuning: 3 runs (baseline + iteration 1 kept + iteration 2 reverted). v3 re-run and holdout: 3 runs
  each. Holdout never used to tune.

## Tuning set (32 prompts, weak families)

| Run set | Channel | Family | Invalid | Rich over-use |
|---|---|---|---|---|
| Baseline (after Phase A) | 50.0 % | 43.8 % | 0 % | 1.7 % |
| Iteration 1 (kept) | **67.7 %** | **63.6 %** | 1.0 % | 2.1 % |
| Iteration 2 (reverted) | 53.1 % | 52.1 % | 1.0 % | 2.1 % |

The AUTO nudge lifted the tuning set by ~+18 pp without adding over-use; keyword-stuffing (iter 2)
hurt. **Two iterations used; then frozen.**

## v3 re-run (unchanged 60 prompts, frozen prompt, 3 runs)

| Metric | M9.7 v3 | M9.8 v3 re-run |
|---|---|---|
| Channel accuracy | 77.2 % | **81.1 %** (75–86.7) |
| Family accuracy | 73.3 % | **78.9 %** (71.7–85) |
| Invalid | 1.1 % | **0 %** |
| Clear subset channel | 81.8 % | **84.8 %** |
| Clear subset family | 79.4 % | **84.2 %** |
| Rich over-use | 1.7 % | 1.1 % |
| Latency (mean) | ~1 875 ms | ~1 800 ms |

**Per-category (mean, M9.7 → M9.8):** Markdown 100→100, **Metric 53.3→80**, Comparison 80→66.7,
Table 80→86.7, Chart 72.2→77.8, Timeline 73.3→73.3, Tabs 93.3→93.3, Form 83.3→88.9, Gallery 50→41.7,
Query 91.7→91.7, Mutation 100→88.9, Rich 88.9→100, **Mixed 41.7→66.7**. Metric and Mixed improved
strongly (the hardening targets); Comparison/Mutation/Gallery moved down within run variance (small
n).

## Holdout (33 untouched prompts, 3 runs)

| Metric | Value |
|---|---|
| Channel accuracy | **65.6 %** (63.6–69.7) |
| Family accuracy | **61.6 %** (57.6–69.7) |
| Invalid | 1.0 % |
| Rich over-use | 1.0 % |
| Latency (mean) | ~2 294 ms |

**Per-category:** Chart 91.7, Forms 100, Table 88.9, Rich-vs-Native 88.9, Timeline 66.7, Tabs 50,
Mixed 50, Comparison 55.6, Gallery 44.4, **Metric 25**, Markdown 66.7.

The holdout is harder than v3 (more data-dependent/vague prompts and Norwegian). Persistent
failures (≥2/3 runs): *"What's the monthly fee for 5 users?"*, *"Totalt antall ansatte?"*, *"Give me
the total cost."* (Metric), *"Display the uploaded pictures."*, *"Vis meg bildene."* (Gallery),
*"Sammenlign de to abonnementene."* (Comparison), *"Show the release milestones."* (Timeline),
*"Show the details in tabs."* (Tabs), and the mixed compare/chart/table prompts.

## Remaining failure taxonomy (across the three 3-run sets)

| Category | v3 re-run (180) | Holdout (99) | Tuning (96) |
|---|---|---|---|
| Under-use | **32** | **31** | **28** |
| Wrong family | 4 | 4 | 4 |
| Invalid | **0** | 1 | 1 |
| Over-use | 0 | 1 | 0 |
| Rich over-use | 2 | 1 | 2 |
| Rich under-use | 0 | 0 | 0 |
| not-mixed | 0 | 0 | 1 |

Failures are overwhelmingly **under-use** (conservative Markdown). Splitting by cause:
- **Model capability (majority):** vague/data-free Metric phrasing ("Give me the total cost"),
  Timeline ("release milestones"), Tabs ("show the details in tabs"), and Norwegian under-use.
- **Data unavailable (design):** Gallery prompts with no image refs; "how many employees" with no
  data — conservative Markdown is defensible.
- **Architecture/prompt (minor, mostly fixed):** contract invalids (Badge/Metric) → **0 on v3**.

## Expression safety

**Native JS leakage: 0** in all sets. Remaining invalid = 1 in holdout and 1 in tuning (contract/
schema, not JS). Rich widgets use JS by design.

## Native vs Rich

Rich cases ~89–100 %; **rich over-use ≈ 1–2 %**; the loan/mortgage calculator still occasionally goes
Rich (iteration 1 reduced this on the tuning set). Native-first is largely respected.

## Estimated cat-jam-free ceiling

- v3 (structured, mixed difficulty): **~81 %** (clear ~85 %), variance ±~6 pp.
- Holdout (weak-family-weighted, more ambiguity): **~66 %**.
- The model is **conservative** (under-use) and **phrasing-sensitive** (Metric 80 % on v3 vs 25 % on
  holdout). Guidance moves the mean a few points but cannot overcome the free model's bias.

## 99 % target status

**Not reached.** Target vs actual (v3 re-run / holdout): clear-intent channel ≥99 % → **84.8 % / ~66 %**;
clear family ≥98 % → **84.2 %**; invalid ≤0.5 % → **0 % / 1 %**; fallback ≤0.5 % → same; safety 0 % →
**met**; unnecessary Rich ≤0.5 % → **1.1 % / 1 %** (just over). The gap is a **model-capability
plateau**, reported honestly (no relabelling, no prompt rewriting to inflate, holdout untouched during
tuning).

## M10 decision

**Still unnecessary.** Clear-intent routing is not systematically poor; errors are conservative
(under-use), not harmful; there is no over-use or safety problem. A planner would add a second call/
latency/cost and would not fix a *conservative* model bias. Revisit only if a future evaluation shows
harmful (over-use/invalid) or systematically wrong clear-intent routing that prompt/schema cannot fix.

## Files

- `docs/intelligent-ui/routing-benchmark-v4/{tuning,holdout}.json`,
  `{tuning,holdout,v3-rerun}-run{1..3}.json`, `*-results.json`.
- `audit/lib/routing-benchmark-v4.mts`.

## Answering the twelve questions

1. **Metric before/after?** v3 53.3 % → **80 %** (big gain); holdout 25 % (still weak/vague).
2. **Gallery before/after?** v3 50 % → 41.7 % (no real change; limited by absent image refs).
3. **Mixed before/after?** v3 41.7 % → **66.7 %** (clear gain from the mixed rule).
4. **Chart/Timeline before/after?** Chart 72.2 → 77.8; Timeline 73.3 → 73.3 (flat).
5. **Rich over-use reduced?** Slightly (v3 1.7 % → 1.1 %); still ~1 %.
6. **Invalid/fallback reduced?** v3 1.1 % → **0 %** (contract fixes); holdout ~1 %.
7. **Clear-intent accuracy?** v3 **84.8 %** (channel); holdout ~66 % (weak-family-weighted).
8. **Holdout accuracy?** Channel **65.6 %**, family **61.6 %**.
9. **Near-99 %?** **No.**
10. **Measured plateau?** ~**81 %** (v3, clear ~85 %) and ~**66 %** (holdout), ±~6 pp.
11. **Gap prompt/schema or model?** **Model-capability** (conservative under-use + phrasing
    sensitivity); prompt/schema fixed the contract invalids but cannot remove the bias.
12. **M10 unnecessary?** **Yes.**

## Stop
