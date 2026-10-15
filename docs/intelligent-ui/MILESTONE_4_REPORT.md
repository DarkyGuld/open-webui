# Milestone 4 Report — Interaction, Durable State, Output Persistence, i18n

Branch: `intelligent-ui-foundation`. Status: **complete** (with one documented partial —
structured-output *preference*; see Limitations).

## Persistence architecture

- **Human text stays in `message.content`** (unchanged).
- **Durable structured artifacts are attached to `message.output[]`** by the Filter `outlet`.
- Rendering still flows from `content` → `:::intelligent-ui` → `IntelligentUIBlock` → adapter
  (equivalent and safe); the `output[]` item is durable metadata for history/Arena/upgrades.
- Old M2/M3 messages (raw fenced text only) continue to render unchanged.
- Interaction state (selection etc.) is persisted in browser storage (see State model).

## output[] implementation

Filter `outlet` scans the final assistant content for `:::intelligent-ui` blocks and appends
one item per block:

```json
{
  "type": "intelligent_ui",
  "output_schema_version": 1,
  "catalog_version": 2,
  "id": "iu_<sha256(content)[:16]>",
  "format": "openui-lang",
  "content": "<raw openui lang>",
  "state": {}
}
```

- **Stable id** derived from content (stable across reload/regeneration).
- `format` keeps the item schema engine-agnostic; canonical parsing stays client-side (adapter).
- The human text is never altered.
- `structuredOutput.ts` ignores `intelligent_ui` items so they never render as text.

## Schema versions (independent)

| Version | Meaning | Enforcement |
|---|---|---|
| `version` (transport) | token envelope `v="1"` | adapter rejects ≠ 1 |
| `output_schema_version` | persisted output item shape | `validateOutputItem` rejects ≠ 1 |
| `catalog_version` | component/action contract | `isSupportedCatalogVersion` accepts {1,2}; unknown → fallback |

`catalog_version = 2` adds optional interaction fields (`action`, `selectable`); v1 nodes remain
valid (optional fields) — a backward-compatible extension.

## Action protocol

Central dispatcher `src/lib/intelligent-ui/actions.ts`. All component interactions flow through it:
schema validation → allow-list → risk classification → optional confirmation → execution.
Components never handle actions themselves.

- Allow-list: `send_prompt`, `select`, `toggle`, `set_value`, `confirm`.
- Risk: `send_prompt`/`select`/`toggle`/`set_value` = **safe**; `confirm` = **confirm**;
  anything else = **forbidden** (rejected).
- No arbitrary JS/function names; no code execution.

See `ACTIONS.md`.

## Supported actions (M4)

- **send_prompt** — sends a normal user follow-up prompt via Open WebUI's existing same-origin
  `input:prompt:submit` channel (`window.postMessage`). Visible, plain text, length-bounded.
- **select / toggle / set_value** — validated; applied to component-local durable state.
- **confirm** — native confirmation before proceeding.
- **tool** actions — architecture prepared (risk = confirm), not exposed in M4.

## State persistence model

- **Durable** (persisted): explicit user selection / confirmed values, keyed by
  `chatId + blockId` in `localStorage` (`intelligent-ui-state-v1`), bounded to 4 KB.
  Survives reload and reopening the conversation (same browser).
- **Ephemeral** (not persisted): hover, transient visuals.
- Server-side durable state is a future step (see `OUTPUT_PERSISTENCE.md`).

## Confirmation model

`confirm` actions use Open WebUI's existing `common/ConfirmDialog.svelte` (no new dialog system).
The dispatcher awaits approval; cancel aborts (`reason: 'cancelled'`). Verified via Playwright
(`04-confirmation-dialog.png`).

## i18n status

All feature strings moved to Open WebUI's i18n (`$i18n.t(...)`); no hardcoded English remains in
the feature. Keys added to **en-US** and **nb-NO** (a second existing language). Settings,
chat control, fallback, and confirmation all use keys.

## Tests

- **vitest: 45 passed** — adapter (14), registry (3), catalog (3), generated real outputs (3),
  actions (8), versioning (6), state (4), existing versionDiff (4).
- **pytest: 36 passed** — M1 precedence/no-op/persistence, M2 no-op, M3 filter/capability,
  M4 structured-output outlet.
- **Production build: green.**
- **Playwright: 10 screenshots**, 0 errors; selection + reload persistence + send_prompt +
  confirmation + fallback all verified.

## Screenshots (`audit/local/intelligent-ui/milestone-4/`)

`01-comparison-default`, `02-comparison-selected`, `03-send-prompt-action`,
`04-confirmation-dialog`, `05-state-before-reload`, `06-state-after-reload`,
`07-invalid-action-fallback`, `08-mobile-interaction`, `09-dark`, `10-light`.

## Upstream / core files changed (M4)

| File | Change | Risk |
|---|---|---|
| `src/lib/components/chat/Messages/structuredOutput.ts` | ignore `intelligent_ui` output items (+5 lines) | low |
| `src/lib/components/common/InterfaceSettings.svelte` | i18n for user toggle | low |
| `src/lib/components/admin/Settings/Interface.svelte` | i18n for admin toggle | low |
| `src/lib/components/chat/Controls/Controls.svelte` | i18n for chat control | low |
| `src/lib/i18n/locales/{en-US,nb-NO}/translation.json` | +5 keys each | low |

All other M4 changes are our own files (`src/lib/intelligent-ui/*`,
`backend/open_webui/intelligent_ui/filter.py`, tests, fixtures).

## Regressions

None. All M1–M3 tests remain green; build green; OFF remains a true no-op.

## Limitations

- **Structured-output *preference*** is not wired for rendering: rendering remains content-based
  (equivalent, safe). The `output[]` item is durable metadata. Preferring `output[]` for render
  is deferred (the block cannot currently see the parent message).
- Durable **interaction state** is browser-local (`localStorage`), not server-synced across devices.
- `tool` actions are architected but not exposed.
- i18n keys added to 2 locales; other 63 locales fall back to English.

## Readiness for M5

Ready. M4 does not add components; M5 (chart/form/tabs/gallery) can proceed on top of the
existing adapter + action/state framework without architectural change.

## Do not start M5 automatically.

Per instructions, M5 (component expansion), Rich Widget sandbox, planner/router, and agent
capabilities are out of scope until explicitly requested.
