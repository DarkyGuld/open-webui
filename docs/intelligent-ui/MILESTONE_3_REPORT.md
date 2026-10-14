# Milestone 3 Report — Generation / Orchestration + Handoff

Branch: `intelligent-ui-research-foundation`. Status: **complete** (one provider validated;
see limitations).

## Implementation architecture

```
Open WebUI request
  → Filter inlet (backend/open_webui/intelligent_ui/filter.py)
      resolve_effective_mode(global, user, chat, model-generation-capability)
        OFF  → return request UNCHANGED (identity)
        AUTO → prepend a system message: conservative instructions + generated catalog prompt
        ON   → prepend a system message: stronger instructions + generated catalog prompt
  → main model (single pass; no planner/composer call)
  → response text (may contain) :::intelligent-ui{v="1"} <OpenUI Lang> :::
  → MarkdownTokens.svelte (existing colonFence token) → IntelligentUIBlock
  → adapter.ts → engines/openui.ts (@openuidev/lang-core) → Zod validation → registry
  → native Metric / Comparison / Table  (or IntelligentUIFallback)
```

No second transport format, no extra provider request, no planner/composer.

## OpenUI catalog

- Single source of truth: `src/lib/intelligent-ui/catalog.ts` (Zod prop schemas + descriptions),
  `catalog_version = 1`.
- Frontend node validation (`schema.ts`) is **derived** from the catalog (`.extend({type}).strict()`),
  so server catalog and frontend schema cannot drift.
- Server prompt is generated from the same catalog via OpenUI's `library.prompt()`.
- Documented components: **Metric, Comparison, Table** only.

## Exact prompt strategy

- `scripts/intelligent-ui/generate-prompt.ts` (run with `npx tsx`) builds the OpenUI library from
  the catalog and calls `openuiLibrary.prompt({ preamble, additionalRules, examples })`.
- Output is written to `backend/open_webui/intelligent_ui/catalog_prompt.py` (generated; embeds
  `catalog_version`). The Filter imports `PROMPT` from there — **no hand-duplicated OpenUI syntax**.
- Rules include: Intelligent UI is optional; prefer Markdown; only allowed components; never invent
  components; wrap OpenUI Lang in the `:::intelligent-ui{v="1"}` fence; no HTML/JS/CSS/URLs.
- The Filter prepends a mode header:
  - AUTO: "available but optional and conservative".
  - ON: "enabled; actively consider structured UI where it helps".

## Filter integration

- `Filter.inlet` returns the request **unchanged** when effective mode is OFF or the filter valve is
  disabled. AUTO/ON prepend one system message (`[system, ...original]`).
- `Filter.outlet` only logs whether the response contained a UI block (observability, no mutation).
- No extra model call.

## Auto / On / Off behavior

- **OFF** = stock Open WebUI (identity request; no catalog prompt; no renderer path for new content).
- **AUTO** = conservative; the main model decides. Verified: explanatory prompts (photosynthesis,
  Tesla) → Markdown; comparison/metric/table prompts → UI.
- **ON** = stronger preference, still Markdown when UI adds little.

## Model capability policy

- `intelligent_ui_generate` (alias `intelligent_ui`): whether the model receives UI instructions.
  Default **supported** (opt-out via explicit `false`).
- `intelligent_ui_render`: whether UI may render for a context. Default **true**; rendering a saved
  block is **model-independent**, so this is only an explicit opt-out.
- The effective-mode resolver uses **generation** capability only.

## Provider results

Configured provider: opencode gateway (models `deepseek-*`, `glm-*`, `grok-*`, …). The connection
forwards `x-opencode-session: {{CHAT_ID}}`.

| Check | Result |
|---|---|
| Normal Markdown (photosynthesis, Tesla) | ✅ Markdown only |
| Comparison ("compare three VPS plans") | ✅ valid `Comparison` block |
| Metric (loan monthly cost) | ✅ valid `Metric` block |
| Table (monthly costs) | ✅ valid `Table` block |
| AUTO decision quality | ✅ appropriate text-vs-UI choice |
| Malformed/unknown component | ✅ safe fallback |
| Formatting reliability | ✅ valid OpenUI Lang incl. hoisted references |
| Latency | **High** (~60 s+ per response via the gateway) |
| Token overhead | small: catalog prompt ≈ 4.4 KB system text |

Server log evidence: `function_intelligent_ui_generation_...:outlet:97 - intelligent-ui: model
emitted UI block (catalog_version=1)`. Real captured outputs are stored as fixtures
(`tests/fixtures/intelligent-ui/generated-*.txt`) and covered by `generated.test.ts`.

Only one provider family was exercised (all models share the gateway). Not every provider is
required to support Intelligent UI; unsupported ones simply never emit the block → normal Markdown.

## Streaming results

- Ordinary Markdown streams normally.
- The colonFence tokenizer only emits a token once the closing `:::` arrives, so an in-progress
  block renders as plain text and the component activates only on a complete fence — no exceptions,
  no partial UI.
- Reload reproduces the same final result (screenshot `09-persisted-reload.png`).
- No incremental OpenUI block streaming implemented (not necessary).

## Validation / security results

Re-ran the M2 security model against real and adversarial outputs: unknown component
(`Chart`), malformed Lang, oversized, wrong version, HTML/JS attempts → all rejected by the
registry/validation layer or shown as plain text. No model output bypasses the adapter.
Limits: payload 16 KB, 1 node/depth, string 2000, table 50×12, comparison 4×12.

## Tests

- **pytest: 31 passed** (`tests/intelligent_ui`) — M1 precedence/no-op + persistence, M2 no-op,
  M3 filter OFF-identity/AUTO/ON injection, capability semantics, stream/outlet passthrough.
- **vitest: 27 passed** — adapter (14), registry (3), catalog drift (3), **real generated outputs (3)**,
  existing versionDiff (4).
- **Production build: green.**
- **Playwright: 9 screenshots**, 0 page/console errors (excl. socket).

## Screenshots (`audit/local/intelligent-ui/milestone-3/`)

`01-auto-markdown`, `02-auto-metric`, `03-auto-comparison` (real model output with hoisting),
`04-auto-table`, `05-on-comparison`, `06-invalid-fallback`, `07-mobile`, `08-light`,
`09-persisted-reload`.

> Note: model latency via the gateway is high, so screenshots are rendered from the **real captured
> model output** (stored as fixtures) rather than waiting on a slow live stream. The content is
> genuine model output; only the capture timing is deterministic.

## Performance observations

- No overhead when OFF; small system-prompt overhead when AUTO/ON.
- No extra inference request.
- Gateway latency dominates; not an Intelligent UI cost.

## Known limitations

- Live end-to-end screenshot capture is timing-sensitive due to gateway latency.
- Only one provider family tested.
- Single root component; no layout nesting; plain-text cells.
- New UI strings are literal English (i18n pending).
- The Filter must be installed/enabled as an Open WebUI Function (source is bundled in the repo;
  installation is documented) — it is not auto-loaded by core.

## Upstream impact

No new core edits in Milestone 3. All additions are our own files
(`src/lib/intelligent-ui/*`, `backend/open_webui/intelligent_ui/*`, `scripts/intelligent-ui/*`,
tests, fixtures). The only core edits remain from M1/M2 (see `UPSTREAM_IMPACT.md`).

## Recommended Milestone 4

1. **Durability:** persist rendered UI as a structured `output[]` item (survives arena/reload;
   avoids re-parsing on every render).
2. **Catalog expansion:** add `chart`, `form`, `tabs`, `image`, `gallery` behind the same adapter.
3. **Provider capability matrix:** auto-detect structured-output support; per-model policy.
4. **i18n:** add translation keys for the new UI strings.
5. **Interaction:** follow-up prompts / controlled actions from components (allow-listed).
6. **Visual regression baselines** via the `visual-regression` skill.
7. **Package the Filter** so installation is one command (or ship as a built-in module).
