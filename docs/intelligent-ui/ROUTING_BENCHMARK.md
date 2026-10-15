# Routing Benchmark — one-pass (AUTO) channel/component selection

Question: does the **one-pass** approach (the main model decides Markdown vs UI in a single call,
guided by the catalog prompt) route well enough that we can **skip** building an M10 planner/router?

## Method

- **Model:** `cat-jam-free` — the **cheapest** available (0 cost in the registry; ~1–4 s/call). It is a
  *lower bound*; a stronger model should route better.
- **System prompt:** exactly what the Filter injects in AUTO mode (conservative header + the generated
  catalog prompt). Native components only (rich-widget fence not advertised).
- **Prompts:** 50 representative cases (`audit/lib/routing-benchmark.mts`), balanced across
  explanatory (→ Markdown) and UI-suitable (→ native component) intents.
- **Scoring:** response classified by the real adapter (`parseIntelligentUI`); channel = Markdown /
  native / rich / invalid; component match is **tree-wide** (root or any descendant).

## Results (50 prompts, 0 errors)

| Metric | Value |
|---|---|
| Channel accuracy | **78 %** |
| Component accuracy (tree-wide) | **78 %** |
| Invalid OpenUI rate | **0 %** |
| Fallback rate | **0 %** |
| Avg latency | ~2.2 s |
| Avg tokens / call | ~3 073 (dominated by the ~8 KB system prompt) |

Raw results: `audit/local/intelligent-ui/routing-benchmark/results.json`.

## Failure analysis

- **All failures are "under-use of UI"** — the model answered with **Markdown** where UI would help
  (e.g. *"Summarize these three options"*, *"List the top 5 programming languages"*, *"Tabulate the
  quarterly sales"*, *"How many employees in total?"*, *"Show an overview of the workspace"*).
- **No invalid output and no fallbacks** — when the model *does* emit UI, it is valid OpenUI Lang that
  our adapter accepts.
- Explanatory prompts (DNS, Tesla, photosynthesis, poetry, …) were routed to Markdown correctly.
- Runs vary run-to-run (free model nondeterminism); channel accuracy observed 78–80 %.

## Recommendation

**Do NOT build the M10 planner/router yet.** One-pass routing is already reasonable and, importantly,
**never produces invalid output** — the cost of a miss is a conservative Markdown answer, not a broken
one. A planner would add a second model call, latency, cost, and complexity for a modest gain.

Better levers first:

1. **Prompt tuning** — nudge more strongly toward `comparison`/`table`/`metric` when the user asks to
   *compare*, *list*, *tabulate*, or asks for *a number*. (Most misses are this category.)
2. **Stronger default model** — re-run this benchmark with a mid-tier model (e.g. `deepseek-v4.1-flash`)
   to see the achievable ceiling before deciding.
3. **Re-run the benchmark after prompt tuning**; only if a strong model still misroutes often should we
   build M10.

## Reproduce

```bash
export OPENCODE_KEY=$(sqlite3 backend/data/webui.db \
  "select value from config where key='openai.api_keys';" | python3 -c "import sys,json;print(json.load(sys.stdin)[1])")
BENCH_MODEL=cat-jam-free npx tsx audit/lib/routing-benchmark.mts
```

## Related next work (per roadmap)

- Extend the rich-widget flag to **global + user + chat** (same pattern as native Intelligent UI).
- `@Set`/`@Reset` and `Query`/`Mutation` tool bindings.
- Remaining native component families (tabs, charts, media/gallery, progress/timeline, forms, map).
