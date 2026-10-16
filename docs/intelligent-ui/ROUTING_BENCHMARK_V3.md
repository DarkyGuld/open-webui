# Routing / Capability Benchmark v3 — cat-jam-free (cheap model only)

Evaluation-only milestone. Phase A = minimal prompt hardening; Phase B = a **new** ~60-prompt
capability dataset for the post-M9.4 catalog. The v1/v2 50-prompt benchmark is untouched.

# Executive summary

- Model: **`cat-jam-free`** only (3 runs × 60 prompts = 180 calls, 0 generation errors).
- Production AUTO prompt (native **and** rich instructions, as production injects them), real
  adapter, real validation/fallback path.
- **Aggregate (mean of 3 runs):** channel accuracy **77.2 %** (range 75–80), component-family
  accuracy **73.3 %** (range 70–76.7), invalid **1.1 %**, fallback **1.1 %**, rich over-use
  **1.7 %**, rich under-use **0.6 %**, latency ~1 875 ms, prompt tokens ~3 555.
- **Clear-intent subset** (excluding 5 data-dependent/ambiguous prompts): channel **81.8 %**,
  family **79.4 %**.
- The **aggregate is dragged down by genuinely hard/ambiguous families**: Mixed **41.7 %**,
  Metric **53.3 %**, Gallery **50 %** (raw) — while core structured families are strong:
  **Markdown 100 %, Mutation 100 %, Tabs/Composed 93.3 %, Query 91.7 %, Rich 88.9 %, Form 83.3 %,
  Comparison 80 %, Table 80 %.**
- **Prompt hardening fixed the JS leakage for native UI: 0 native outputs used JS methods.** The 2
  invalid cases are **contract mismatches** (Badge given a variant string; empty Metric label), not
  routing.
- **Intelligent UI v1 is NOT yet "complete"** by the strict rule (channel/family < 85 %; invalid+
  fallback 2.2 %). **M10 is still not justified** — failures are conservative and fixable with small
  prompt/schema guidance.

# Prompt hardening changes (Phase A, frozen before the run)

Two rule edits in `scripts/intelligent-ui/generate-prompt.ts` + one in `filter.py`:

1. **Metric/Comparison/Table trigger** (rule "Pick the most useful presentation"): now explicitly
   maps *"how much", "the total", "just the number", "how many"* → **Metric**; *compare / vs /
   alternatives / options* → **Comparison** (or **Table** for many exact fields). Table kept as-is.
2. **No-JS rule** (appended to the "Keep values short and plain text" rule): *"OpenUI expressions are
   declarative only — never use JavaScript methods or globals (.toFixed(), .map(), .filter(),
   .reduce(), Math.*, Date.*, eval, Function); pass plain values and let a component format them."*
3. **AUTO_HEADER** (`filter.py`): the Metric trigger now reads *"a single key result value ("just the
   number", "how much", "the total") -> Metric"*.

No broad rewrite; no new examples.

# Prompt size before/after

| | Before (M9.6) | After (M9.7) | Δ |
|---|---|---|---|
| `PROMPT` (catalog) | 12 286 chars | **12 719 chars** | +433 (+3.5 %) |
| `AUTO_HEADER` | 496 chars | **533 chars** | +37 |
| Native AUTO `SYSTEM` | 12 784 chars | **13 254 chars** | +470 (+3.7 %) |
| est. tokens (÷4) | ~3 072 | **~3 180** | +108 |

Still far below the pre-M9.5 ~14 700 chars. The benchmark's system prompt additionally includes the
rich-widget instructions (production injects them when rich widgets are enabled), so its measured
prompt-token count (~3 555) is higher than the native-only v2 (~3 210).

# Method

- Dataset: `docs/intelligent-ui/routing-benchmark-v3/prompts.json` (~60 cases; categories below).
- `SYSTEM = AUTO_HEADER + PROMPT + RICH_HEADER(auto) + RICH_PROMPT`, all read live from the Python
  source (`filter.py`, `catalog_prompt.py`).
- Classification by the production adapter `parseIntelligentUI`; component-family derived from the
  node tree; mixed = UI present **and** ≥40 chars of prose outside the fence; JS-leak scan on the
  raw output.
- Scoring: expected `markdown` → OK iff markdown; `native` → OK iff native; `rich` → OK iff rich.
  Family OK iff the expected family is present in the tree. 3 runs; mean/min/max reported.

# Dataset

| Category | n | expected channel |
|---|---|---|
| Markdown | 5 | markdown |
| Metric | 5 | native (Metric) |
| Comparison | 5 | native (Comparison) |
| Table | 5 | native (Table) |
| Chart | 6 | native (Chart; 1 × Table for exact values) |
| Timeline | 5 | native (Timeline; 1 × markdown) |
| Tabs/Composed | 5 | native (Tabs/Composed) |
| Interactive/Form | 6 | native (Form) |
| Gallery | 4 | native (Gallery) |
| Query | 4 | native (Query) |
| Mutation | 3 | native (Form + confirm) |
| Rich Widget | 3 | rich |
| Mixed | 4 | native + prose |

Prompts are real user language (short, vague, direct), include Norwegian (md4, me4, co4), and include
cases where Markdown is correct.

# Aggregate results (mean of 3 runs)

| Metric | Mean | Range |
|---|---|---|
| Channel accuracy | **77.2 %** | 75 – 80 % |
| Component-family accuracy | **73.3 %** | 70 – 76.7 % |
| Invalid UI | 1.1 % | 0 – 1.7 % |
| Fallback | 1.1 % | — |
| Rich over-use | 1.7 % | — |
| Rich under-use | 0.6 % | — |
| Avg latency | ~1 875 ms | — |
| Median / p95 latency | ~1 442 / ~5 356 ms | — |
| Avg prompt / completion / total tokens | ~3 555 / ~670 / ~4 225 | — |

**Clear-intent subset** (n=165, excluding the data-dependent prompts me3/me5 and media-ambiguous
ga2/ga3/ga4): channel **81.8 %**, family **79.4 %**.

# Per-category results (mean channel / family)

| Category | n | Channel | Family |
|---|---|---|---|
| Markdown | 5 | **100 %** | 100 % |
| Mutation | 3 | **100 %** | 100 % |
| Tabs/Composed | 5 | **93.3 %** | 93.3 % |
| Query | 4 | **91.7 %** | 91.7 % |
| Rich Widget | 3 | **88.9 %** | 88.9 % |
| Interactive/Form | 6 | 83.3 % | 83.3 % |
| Comparison | 5 | 80 % | 60 % |
| Table | 5 | 80 % | 80 % |
| Chart | 6 | 72.2 % | 72.2 % |
| Timeline | 5 | 73.3 % | 66.7 % |
| Metric | 5 | 53.3 % | 53.3 % |
| Gallery | 4 | 50 % | 25 % |
| Mixed | 4 | 41.7 % | 41.7 % |

Observations: Chart/Timeline/Comparison/Table families are **strong in channel terms** (they render
the right family) but lose points on **discrimination** cases (exact values → Table; "release
history" → Timeline; iPhone/Android → Table instead of Comparison). Metric and Gallery are the
weakest; Mixed (prose + UI) is the weakest behavior.

# Error taxonomy (sum over 180 calls)

| Category | Count | Note |
|---|---|---|
| Under-use (Markdown when UI expected) | **35** | dominant; includes the data-dependent/ambiguous prompts |
| Wrong family | 7 | e.g. iPhone/Android → Table; uploaded files → Query |
| Invalid | 2 | contract mismatches (below) |
| Rich over-use | 3 | all the loan calculator (model preferred a rich widget) |
| Rich under-use | 1 | particles canvas → Markdown |
| Over-use (UI when Markdown expected) | **0** | good — no gratuitous UI |
| Generation failure | 0 | — |

# Expression-safety results

- **Native outputs containing JS methods: 0** (goal met — the hardening worked).
- JS leakage appears only in **rich widgets** (`.toFixed()`, `Math.*`) where JS is expected/allowed.
- The 2 invalid cases are **not** expression errors:
  - `tc1` — `Badge("Save 17% with annual billing", "positive")`: the model passed a **variant string**
    as Badge's 2nd arg, but our Badge takes an **action**. → contract mismatch.
  - `me1` — `Metric("", "980 kr")`: empty label; our schema requires label ≥1 char. → schema
    strictness (a value-only metric is reasonable).

# Native vs Rich routing

- Rich cases: **88.9 %** (3D cube ✓, mini-game ✓, particles ✓ in 2/3 runs, Markdown once).
- **Rich over-use 1.7 %**: the loan-calculator prompt chose rich in all 3 runs — the model reached
  for a rich widget to do arithmetic/formatting. Native first is mostly respected.
- No rich over-use on ordinary charts/tables/forms.

# Variance across 3 runs

Channel 75/80/… (range 75–80 %), family 70–76.7 %. cat-jam-free is non-deterministic; the band is
±~3 pp. Single-run conclusions should be treated cautiously.

# Latency

Mean ~1 875 ms, median ~1 442 ms, p95 ~5 356 ms (the free gateway has a long tail). Consistent with
v2 (~1 676 ms mean); the slightly higher p95 is expected with more UI output.

# Token usage

Prompt ~3 555 (includes rich instructions), completion ~670, total ~4 225 per call. The prompt
increase vs v2 is from the M9.7 hardening (+470 chars) **and** the added rich instructions needed to
test rich cases.

# Intelligent UI v1 completion decision

**Not declared complete yet.** Against the recommended rule:

- Channel ≥ 85 % → **77.2 % ✗**
- Family ≥ 85 % → **73.3 % ✗**
- Invalid + fallback ≤ 2 % → **2.2 % ✗ (marginal)**
- Rich over-use ≤ 2 % → 1.7 % ✓
- No catastrophic family → ✓ (weakest are Metric 53 %, Gallery 50 %, Mixed 42 %)
- Errors mostly conservative → ✓ (35 under-use vs 0 over-use)

The gap is concentrated in a few **targeted, fixable** areas (below), not in the core structured
families, which are Good→Excellent.

# M10 decision

**Still not justified.** There is **no systemic routing failure**: zero over-use, zero generation
failures, near-zero invalid, and the misses are conservative under-use plus a handful of
discrimination/contract issues that **prompt + schema guidance can address**. A planner would add a
second call/latency/cost for no clear benefit.

# Recommended next phase (targeted fixes only)

1. **Metric**: add one short example for a data-free "how many / headline" phrasing, and/or accept a
   value-only Metric (allow empty label). (Prompt/schema.)
2. **Gallery**: add a concise rule — *"show images/gallery/screenshots → Gallery(title?, items) with
   safe image paths"*. (Prompt.)
3. **Mixed**: add a rule — *"when UI helps, lead with one short prose sentence and follow with a brief
   interpretation"*. (Prompt.)
4. **Chart/Table discrimination**: add *"exact numbers → Table; trends/categories → Chart"*. (Prompt.)
5. **Badge contract**: either give Badge a `variant`/`tone` string, or add a rule that Badge's 2nd
   arg is an action only. (Schema or prompt.)
6. **Multilingual**: the prompt is English-only; Norwegian prompts under-use UI (co4). Consider a
   short note that the same rules apply in any language. (Prompt.)
7. Re-run this exact v3 set after the fixes (belongs to a later milestone); keep the dataset frozen
   for comparability.

# Answering the six questions

1. **Did prompt hardening fix the known Metric/Comparison misses?** **Partially.** Comparison
   improved (channel 80 %; the remaining miss is family choice). **Metric did NOT improve** on
   cat-jam-free (53 %) — the "how many"/"headline" phrasings are often data-dependent, so some of
   this is benchmark ambiguity rather than model failure.
2. **Did JS expression invalids disappear?** **Yes for native UI — 0.** Remaining invalids are
   contract mismatches (Badge variant arg, empty Metric label).
3. **How well does cat-jam-free handle Chart/Timeline/Tabs/Forms/Gallery?** Tabs/Composed 93 %,
   Forms 83 %, Chart 72 %, Timeline 73 %, **Gallery 50 %** (weakest native family).
4. **Does it choose Native vs Rich correctly?** Mostly — rich cases 89 %, rich over-use 1.7 %; the
   loan calculator over-reached to rich.
5. **Is Intelligent UI v1 complete?** **Not yet** (channel 77 %, family 73 %); targeted fixes
   recommended. Core structured families are already strong.
6. **Is M10 still unnecessary?** **Yes — unnecessary.**

# Reproduce

```bash
export OPENCODE_KEY=$(sqlite3 backend/data/webui.db \
  "select value from config where key='openai.api_keys';" | python3 -c "import sys,json;print(json.load(sys.stdin)[1])")
npx tsx audit/lib/routing-benchmark-v3.mts   # writes docs/intelligent-ui/routing-benchmark-v3/results*.json
```

# Stop
