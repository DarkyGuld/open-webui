# Upstream Impact

Goal: keep future `git merge upstream/main` practical. Prefer **new files** + a **Function/Filter**; touch core files only with the smallest possible hunks.

## Architecture B (recommended) — files touched

### New files (no merge conflict surface)

```
src/lib/intelligent-ui/            # isolated feature module
  catalog.ts                       # Zod component definitions (allow-list)
  registry.ts                      # type -> native Svelte component
  engine.ts                        # OpenUI lang-core adapter (parse/validate/prompt) + feature flag
  IntelligentUIBlock.svelte        # validates + renders; Markdown fallback
  widgets/*.svelte                 # metric, comparison, table wrapper, etc.
src/lib/utils/marked/intelligent-ui-extension.ts   # :::intelligent-ui{...} tokenizer (mirrors colonFence)
src/lib/components/common/Button.svelte            # shared primitive (currently missing upstream)
backend/open_webui/functions/intelligent_ui_filter.py  # Filter: planner + toggle + prompt injection (installed via Admin>Functions or bundled)
```

### Core files edited (hot — keep hunks minimal)

| File | Change | ~Lines | Risk |
|---|---|---|---|
| `src/lib/components/chat/Messages/Markdown.svelte` | register the new marked extension (near `:20`) | +2 | Low |
| `src/lib/components/chat/Messages/Markdown/MarkdownTokens.svelte` | one `{:else if token.type === 'intelligentUi'}` branch after `:631` | +8-12 | Low-Med (busy switch) |
| `backend/open_webui/config.py` | add `DEFAULT_CONFIG['intelligent_ui.*']` keys (global toggle/defaults) | +3-6 | Low |
| `backend/open_webui/routers/auths.py` | expose the new admin keys | +3-6 | Low |
| `backend/open_webui/main.py` | expose flag in `GET /api/config` features | +1-2 | Low |

**Optional (durability):** new `output[]` item type path (survives reload, multi-model). Adds:
- `src/lib/components/chat/Messages/structuredOutput.ts` (+ item mapping) and `StructuredOutputRenderer.svelte` (+ branch);
- `backend/open_webui/utils/middleware.py` (emit the item) and `socket/main.py` (allow-list the field).
Higher diff (~200-350 LOC), medium risk — defer to phase 2.

## Hot files to AVOID editing

- `backend/open_webui/utils/middleware.py` (~6.8k lines) — only if using the `output[]` path.
- `backend/open_webui/socket/main.py` — only for new persisted event fields.
- `src/lib/components/chat/Chat.svelte` (~5.4k lines) — avoid entirely (Architecture B does not touch it).
- `src/lib/components/chat/Messages/ResponseMessage.svelte` — avoid.

## Toggles and their upstream surface

| Scope | File(s) |
|---|---|
| Global (admin) | `config.py` (DEFAULT_CONFIG), `routers/auths.py` (admin keys), `main.py` (`/api/config` features), `SettingsModal.svelte` (admin tab) + new `admin/Settings/IntelligentUI.svelte` |
| User | `models/users.py` (`InterfaceSettings`), `routers/users.py`, `InterfaceSettings.svelte` |
| Model | `models/models.py` `meta.capabilities` (no schema change), `Capabilities.svelte` |
| Chat | `Chat.svelte` `params` (add 1 key), `Controls/Controls.svelte`, `utils/payload.py` |

All toggle additions are small and additive.

## Merge-conflict minimization strategy

1. New feature code in a single folder `src/lib/intelligent-ui/` + one backend filter file.
2. Exactly **two** edits in the frontend hot path (extension registration + one token branch).
3. Toggle defaults in `config.py` as a contiguous block.
4. Never reorder upstream code; never reformat files.
5. Add contract tests for the adapter (parse/validate/render) so merges that change token dispatch are caught.

## When OFF

No code path runs: the Filter early-returns when disabled, the renderer branch is simply never hit (the `:::` token never appears), and no config/params are read. Normal Open WebUI rendering is byte-for-byte unchanged.

## Milestone 1 — actual upstream/core changes

Only gating/settings were touched. No renderer, parser, planner, or token.

| File | Purpose | Hunk size | Merge risk | Movable out of core? |
|---|---|---|---|---|
| `backend/open_webui/config.py` | Add `ENABLE_INTELLIGENT_UI` env default + `'intelligent_ui.enable'` in `DEFAULT_CONFIG` | +5 | Low (append near existing flags) | No (config registry is core) |
| `backend/open_webui/routers/chats.py` | Add key to `CHAT_CONFIG_KEYS` + `ENABLE_INTELLIGENT_UI` field to `ChatConfigForm` | +2 | Low | No (admin config surface) |
| `backend/open_webui/main.py` | Add `intelligent_ui.enable` to `Config.get_many(...)`; expose `enable_intelligent_ui` in `/api/config` features | +2 | Low | No |
| `backend/open_webui/models/users.py` | Add `intelligentUi` to `InterfaceSettings` (per-user toggle) | +1 | Low | No (user settings schema) |
| `src/lib/stores/index.ts` | Add `enable_intelligent_ui?: boolean` to `features` type | +1 | Low | No (type only) |
| `src/lib/components/admin/Settings/Interface.svelte` | Admin toggle row + default + features mapping | +12 | Low | Partly (could move to a dedicated admin tab later) |
| `src/lib/components/common/InterfaceSettings.svelte` | Per-user toggle row + state/init | +24 | Low | No (settings panel) |
| `src/lib/components/chat/Controls/Controls.svelte` | Chat Auto/On/Off control (renders only when global+user enabled) | +38 | Low-Med (busy file) | Partly (could extract a component) |
| `vite.config.ts` | `test.exclude` for `audit/**` + `research/**` (test hygiene, not feature) | +12 | Low | N/A (tooling) |

**New files (no merge conflict surface):**

- `backend/open_webui/intelligent_ui/{__init__,mode,filter}.py` — resolver + no-op filter.
- `tests/intelligent_ui/{test_mode,test_api_persistence}.py` — precedence/no-op/persistence tests.

**Total core diff:** ~10 files, ~100 lines. No edits to `middleware.py`, `Chat.svelte`, `ResponseMessage.svelte`, `MarkdownTokens.svelte`, or `socket/main.py`.

## Milestone 2 — actual upstream/core changes

Renderer only. **Exactly one core file touched.**

| File | Purpose | Changed lines | Why necessary | Merge risk | Future isolation |
|---|---|---|---|---|---|
| `src/lib/components/chat/Messages/Markdown/MarkdownTokens.svelte` | Import `IntelligentUIBlock` (+1) and dispatch the existing `colonFence` token to it when `token.fenceType === 'intelligent-ui'` (wrap the existing `<ColonFenceBlock>` in an `{#if}`) | ~+12 | The token is already produced by the existing `colonFence` extension; this is the single dispatch point | Low-Med (busy token switch) | Could later move the branch into `ColonFenceBlock.svelte` or a dedicated extension, keeping the module import-only |

**New files (no merge surface):**
- `src/lib/intelligent-ui/` — `types.ts`, `limits.ts`, `schema.ts`, `validation.ts`, `registry.ts`, `adapter.ts`, `engines/openui.ts`, `engines/json-render.ts`, `components/{IntelligentUIBlock,Metric,Comparison,Table,IntelligentUIFallback}.svelte`
- `tests/fixtures/intelligent-ui/*` and `src/lib/intelligent-ui/__tests__/*`

No changes to `middleware.py`, `Chat.svelte`, `ResponseMessage.svelte`, `Markdown.svelte` (colonFence already registered), `socket/main.py`, streaming, provider APIs, or the message DB model.

## Milestone 3 — actual upstream/core changes

**None.** Milestone 3 added only our own files:

- `src/lib/intelligent-ui/catalog.ts` (shared catalog) + `schema.ts`/`engines/openui.ts` updated to
  import it (no upstream files touched).
- `scripts/intelligent-ui/generate-prompt.ts` and generated `backend/open_webui/intelligent_ui/catalog_prompt.py`.
- `backend/open_webui/intelligent_ui/{filter.py,mode.py,__init__.py}` updates.
- Tests/fixtures.

The Intelligent UI Filter is installed as an Open WebUI **Function** (Admin → Functions or via the
API); it is not auto-loaded by core, so there is no core coupling.

**Cumulative upstream/core edits across M1–M3:** `config.py`, `routers/chats.py`, `main.py`,
`models/users.py`, `stores/index.ts`, `admin/Settings/Interface.svelte`,
`common/InterfaceSettings.svelte`, `chat/Controls/Controls.svelte`,
`chat/Messages/Markdown/MarkdownTokens.svelte` (+ tooling `vite.config.ts`). ~9 files, ~120 lines.

## Milestone 4 — actual upstream/core changes

| File | Purpose | ~Lines | Merge risk | Isolation |
|---|---|---|---|---|
| `chat/Messages/structuredOutput.ts` | ignore `intelligent_ui` output items (durable metadata; visual comes from content) | +5 | Low | Could move to a shared type guard later |
| `common/InterfaceSettings.svelte` | i18n for the user toggle | ~6 | Low | — |
| `admin/Settings/Interface.svelte` | i18n for the admin toggle | ~6 | Low | — |
| `chat/Controls/Controls.svelte` | i18n for the chat control | ~4 | Low | — |
| `i18n/locales/{en-US,nb-NO}/translation.json` | +5 keys each | +5 | Low | — |

All other M4 changes are our own files (`src/lib/intelligent-ui/*`,
`backend/open_webui/intelligent_ui/filter.py`, tests, fixtures). No changes to middleware,
Chat.svelte, ResponseMessage.svelte, socket, streaming, provider APIs, or the message DB model.

**Cumulative M1–M4:** ~11 core files, ~150 lines.

## Milestone 5 — actual upstream/core changes

**None.** Recursive layout composition is entirely our own files:
`src/lib/intelligent-ui/{action-schema,catalog,schema,validation,limits,types,registry,engines/openui}.ts`,
`components/{NodeRenderer,Badge,Divider,IntelligentUIBlock}.svelte`,
`scripts/intelligent-ui/generate-prompt.ts`, `catalog_prompt.py`, tests/fixtures, audit script.
No changes to Open WebUI core, middleware, streaming, provider APIs, or the message DB model.

**Cumulative M1–M5:** still ~11 core files, ~150 lines.

## Milestone 6 — actual upstream/core changes

**None.** The logic layer is entirely our own files (engine runtime, inputs, renderer wiring,
prompt, tests). lang-core is already a dependency; no new packages. No changes to Open WebUI core,
middleware, streaming, or the message DB model.

**Cumulative M1–M6:** still ~11 core files, ~150 lines.

## Milestone 7 — actual upstream/core changes

| File | Purpose | ~Lines | Merge risk |
|---|---|---|---|
| `chat/Messages/Markdown.svelte` | register the Intelligent UI extension before colonFence | +2 | Low |
| `chat/Messages/Markdown/MarkdownTokens.svelte` | dispatch the `intelligentUi` token | +8 | Low-Med (busy switch) |

New file (ours): `src/lib/utils/marked/intelligent-ui-extension.ts`.

**Cumulative M1–M7:** ~13 core files, ~160 lines.

## Milestone 8 — actual upstream/core changes

**None.** Server fallbackMarkdown (Filter, Python), `@Each` flattening (engine), schema/type
updates, and tests are all our own files. No new dependencies.

**Cumulative M1–M8:** still ~13 core files, ~160 lines.

## Milestone 9 — actual upstream/core changes

| File | Purpose | ~Lines |
|---|---|---|
| `chat/Messages/Markdown.svelte` | register the html extension | +2 |
| `chat/Messages/Markdown/MarkdownTokens.svelte` | dispatch `intelligentUiHtml` + colonFence variant | +9 |
| `config.py`, `routers/chats.py`, `main.py` | opt-in flag `intelligent_ui.html.enable` + `/api/config` | +8 |
| `stores/index.ts`, `admin/Settings/Interface.svelte` | flag type + admin row | +10 |
| i18n en-US / nb-NO | 3 keys each | +6 |

New files (ours): `intelligent-ui-html-extension.ts`, `RichWidget.svelte`.

**Cumulative M1–M9:** ~18 core files, ~195 lines.

## Milestone 9.1 — actual upstream/core changes

| File | Purpose | ~Lines |
|---|---|---|
| `models/users.py` | `InterfaceSettings.intelligentUiHtml` | +1 |
| `common/InterfaceSettings.svelte` | user Rich Widget toggle | +24 |
| `chat/Controls/Controls.svelte` | Rich Widget Auto/On/Off control | +40 |
| `intelligent-ui/components/RichWidget.svelte` | render-if-present (historical) | ~ -6 |
| i18n en-US / nb-NO | 3 keys each | +6 |

Backend (ours): `mode.py`, `filter.py`, `catalog_prompt.py` (generated).

**Cumulative M1–M9.1:** ~20 core files, ~235 lines.

## Milestone 9.2 — actual upstream/core changes

**None.** Phase A (@Set/@Reset + `Button`) is entirely our own files. No new dependencies.
Phase B (Query/Mutation) not implemented (designed in `QUERY_MUTATION.md`).

**Cumulative M1–M9.2:** still ~20 core files, ~235 lines.

## Milestone 9.3 — actual upstream/core changes

**None.** The query/mutation registries, `Data` component, action normalization, prompt, and tests are
entirely our own files. All reads/writes go through existing Open WebUI REST endpoints with the user's
token (no new backend, no new dependency).

**Cumulative M1–M9.3:** still ~20 core files, ~235 lines.
