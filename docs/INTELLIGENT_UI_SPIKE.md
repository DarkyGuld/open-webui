# Intelligent UI — Engine Spike (OpenUI vs json-render on Svelte 5)

Status: **spike complete.** Branch `spike/intelligent-ui`. Temporary route `/spike`
(not for production) + `src/lib/intelligent-ui-spike/`.

## Goal

Decide which generative-UI engine to build "Intelligent UI" on in this SvelteKit
Open WebUI fork, by rendering the **same native widget** through both engines.

## What we built

- `src/lib/intelligent-ui-spike/CalculatorView.svelte` — one **native** interactive
  calculator (month slider + computed total). Local state only; no LLM round-trip.
- OpenUI: `openui/library.ts` (`defineComponent` + `createLibrary` + `library.prompt()`),
  `openui/Calculator.svelte` adapter, sample OpenUI Lang response.
- json-render: `jsonrender/catalog.ts` (`defineCatalog` + `defineRegistry` +
  `catalog.prompt()`), `jsonrender/Calculator.svelte` adapter, JSON spec.
- `src/routes/spike/+page.svelte` — side-by-side, prompt viewer, OpenUI stream simulation.

## Result

Both engines rendered the identical native widget with **0 engine console errors** and
were **interactive** (slider 12→60 months: `262 268 kr` → `317 660 kr` on both).
The only console errors were Open WebUI's own realtime socket on the unauthenticated
`/spike` route — unrelated to the engines.

Screenshots: `audit/local/...spike*.png`. Artifacts under `audit/local/`.

## Comparison

| Axis | OpenUI (`@openuidev/svelte-lang` 0.4.1) | json-render (`@json-render/svelte` 0.21.1) |
|---|---|---|
| Svelte 5 native render | ✅ | ✅ (runes) |
| Model output format | **OpenUI Lang** (0.5), positional args | **JSON / JSONL JSON-Patch** |
| Prompt from catalog | ✅ `library.prompt()` — syntax rules + streaming hints | ✅ `catalog.prompt()` — JSONL patch + examples |
| Streaming | first-class (`isStreaming`, streaming parser) | first-class (`SpecStreamCompiler`, `applySpecStreamPatch`) |
| Prop validation | ✅ Zod | ✅ Zod |
| Token efficiency | **~50% fewer tokens than JSON** (their benchmark) | JSON more verbose |
| Cross-framework parity | React is 1.0; **Svelte runtime is 0.5** (behind) | unified 0.21 across React/Vue/Svelte/RN/Solid |
| Footprint (installed) | svelte-lang 96K + lang-core 1.2M | core 1.2M + svelte 396K |
| License | MIT | Apache-2.0 |
| Activity / stars | 10.9k★, pushed same day | 18.6k★, active |
| Our integration cost | low (both: 1 markdown token + 1 branch) | low |

Both also require **zod** (8.1M installed; tree-shakes).

## Recommendation

**Adopt OpenUI (`@openuidev/svelte-lang` + `@openuidev/lang-core`) behind an adapter**,
as the primary engine.

Why:
- **OpenUI Lang is streaming-first and ~50% fewer tokens** than JSON → better chat UX and
  lower cost/latency at scale.
- Its `library.prompt()` output is excellent out of the box (syntax + streaming rules).
- It matches the project's already-documented intent (the `intelligent-ui` skill names
  OpenUI and mandates an adapter + component allow-list).
- MIT.

Main risk: the **Svelte runtime is OpenUI Lang 0.5** while React is 1.0. Mitigation: keep
our catalog small and stable (calculator/table/chart/form/quiz), and consume via our own
`src/lib/intelligent-ui/` adapter so we can swap engines if 0.5 blocks us.

**json-render stays the strong fallback** (Apache-2.0, stable cross-framework version,
simpler JSON validation). If Svelte-0.5 becomes a blocker, switching is cheap because both
engines are already isolated behind two-file adapters.

## Adapter design (next step, not yet built)

```
src/lib/intelligent-ui/
  catalog.ts        # zod component definitions (allow-list) -> engine library
  registry.ts       # component name -> native Svelte component (reuse common/)
  prompt.ts         # library.prompt(...) -> system prompt injected server-side
  parser.ts         # streaming parse wrapper (engine-specific)
  IntelligentUI.svelte  # <Renderer> wrapper + fallback + error/empty/loading states
```

Integration into the chat: new markdown token `:::intelligent-ui{…}` (modeled on the
existing `colonFence` extension) registered in `Markdown.svelte` and dispatched in
`MarkdownTokens.svelte` — **two small upstream touch points**, all widget code in new
files (see `skills/openwebui-integration`).

## Not done in the spike (deliberate)

- Real model → UI routing (system-prompt injection + server integration).
- Server persistence of widget state.
- Native-component catalog beyond the calculator (table/chart/form/quiz).
- In-chat inline rendering (spike uses a standalone route).
