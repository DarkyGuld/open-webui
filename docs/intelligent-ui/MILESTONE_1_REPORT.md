# Milestone 1 Report — Intelligent UI Gating Skeleton

Branch: `intelligent-ui-research-foundation`. Scope: settings/gating only. **No renderer,
parser, planner, `:::intelligent-ui` token, or schema generation.**

## Settings implemented

| Scope | Key / field | Storage | Default | UI |
|---|---|---|---|---|
| Global (admin) | `intelligent_ui.enable` | `config` table (per-key row) | **OFF** | Admin → Interface → Chat → *Intelligent UI* switch |
| User | `ui.intelligentUi` | `user.settings` (typed `InterfaceSettings`) | OFF | Settings → Interface → *Intelligent UI* switch |
| Chat | `params.intelligent_ui` = `auto\|on\|off` | chat `params` JSON | AUTO | Chat **Controls** panel → *Intelligent UI* segmented control |
| Model | `meta.capabilities.intelligent_ui` | model `meta` (free dict) | supported (absent) | model capabilities editor (existing) |

The chat control renders only when **global AND user** are enabled (otherwise it is absent,
so stock users see nothing).

## Precedence rules (proven)

```
global OFF                               -> OFF
global ON  + user OFF                    -> OFF
global ON  + user ON + model unsupported -> OFF
global ON  + user ON + model OK + chat OFF   -> OFF
global ON  + user ON + model OK + chat AUTO  -> AUTO
global ON  + user ON + model OK + chat ON    -> ON
```

Unknown/absent chat value → AUTO. `intelligent_ui` capability absent → supported; explicit
`false` → unsupported.

**Single resolver:** `backend/open_webui/intelligent_ui/mode.py`
(`resolve_intelligent_ui_mode`, `resolve_effective_mode`, `load_effective_mode`). Not
duplicated anywhere.

## Files changed

**New (no merge surface):**
- `backend/open_webui/intelligent_ui/__init__.py`, `mode.py`, `filter.py`
- `tests/intelligent_ui/test_mode.py`, `tests/intelligent_ui/test_api_persistence.py`

**Core edits (small):**
- `backend/open_webui/config.py` (+5): env default + `DEFAULT_CONFIG` key
- `backend/open_webui/routers/chats.py` (+2): config key + form field
- `backend/open_webui/main.py` (+2): `get_many` list + `/api/config` feature
- `backend/open_webui/models/users.py` (+1): `InterfaceSettings.intelligentUi`
- `src/lib/stores/index.ts` (+1): feature type
- `src/lib/components/admin/Settings/Interface.svelte` (+12): admin toggle
- `src/lib/components/common/InterfaceSettings.svelte` (+24): user toggle
- `src/lib/components/chat/Controls/Controls.svelte` (+38): chat Auto/On/Off
- `vite.config.ts` (+12): `test.exclude` for `audit/**` and `research/**` (hygiene)

See `UPSTREAM_IMPACT.md` for purpose/hunk-size/merge-risk per file.

## Tests added

`PYTHONPATH=backend pytest tests/intelligent_ui` → **22 passed**:
- `test_mode.py` (18): the 6 required precedence cases + extras; model-support opt-out
  semantics; `normalize_chat_mode`; user-settings extraction shapes; **filter no-op**
  (inlet returns the same object when OFF *and* when ON; outlet/stream pass-through).
- `test_api_persistence.py` (4, integration against the running backend): global setting
  persists and is exposed in `/api/config`; user setting persists; **chat `params.intelligent_ui`
  persists**; global ends OFF.

Frontend: `vitest run` → **4 passed** (unchanged). Production build: **green**.

## OFF no-op proof

When effective mode = OFF:
- **Planner:** none exists yet; the Filter `inlet`/`outlet`/`stream` return input unchanged
  (unit-tested: identity of the input object).
- **OpenUI prompt / schema / parsing:** none — no such code exists in the tree.
- **Special markdown token:** none — the renderer/token are Milestone 2; `MarkdownTokens.svelte`
  is untouched.
- **Extra model/network request / latency path:** none — no middleware wiring was added.
- **Renderer:** `IntelligentUIBlock.svelte` / `IntelligentUIRenderer` do not exist.
- **Normal markdown + streaming + persisted message format:** unchanged (no core renderer edits).
- **Frontend control:** not rendered when global/user are off (`{#if $config.features.enable_intelligent_ui && $settings.intelligentUi}`).

Tested evidence: `test_filter_is_noop_inlet_when_off`, `test_filter_is_noop_even_when_on`,
`test_filter_outlet_and_stream_noop`, plus `test_global_off_exposed_as_false`.

## Playwright results

Script `audit/lib/milestone1-shots.mjs` (headless Chromium, logged in as admin). Screenshots
in `audit/local/intelligent-ui/milestone-1/`:

| File | Shows |
|---|---|
| `01-admin-global-setting.png` | Admin → Interface → Intelligent UI toggle (ON) |
| `02-user-setting-off.png` | Settings → Interface toggle, OFF |
| `03-user-setting-on.png` | toggle ON |
| `04-chat-control-auto.png` | Chat Controls → Intelligent UI = **Auto** |
| `05-chat-control-on.png` | = **On** |
| `06-chat-control-off.png` | = **Off** |
| `07-user-setting-dark.png` | dark mode |
| `08-mobile-user-setting.png` | mobile (390px) |

Runtime check captured: user setting **persisted after reload = true**.

## Current limitations

- New UI strings use literal English (i18n keys not yet added).
- Global toggle lives in the admin **Interface** panel (grouped with chat settings) rather
  than a dedicated admin tab.
- The model-capability check is honored by the resolver but not yet surfaced in the chat
  control (the control is gated by global+user only; the resolver is authoritative server-side).
- No middleware is wired yet, so the Filter is not loaded/executed in the live pipeline
  (deliberate — Milestone 1 is infra only).
- `svelte-check` retains pre-existing errors (unrelated).

## Milestone 2 plan (exact)

1. **Renderer slice:** add `src/lib/utils/marked/intelligent-ui-extension.ts` (mirror
   `colon-fence-extension.ts`), register it in `Markdown.svelte` (+1 line), add one
   `{:else if token.type === 'intelligentUi'}` branch in `MarkdownTokens.svelte`, and
   `IntelligentUIBlock.svelte` that validates a **strict schema** and renders **3 native
   components**: `metric`, `comparison`, `table`. Hardcoded sample schema first.
2. **Engine adapter:** `src/lib/intelligent-ui/` — catalog (Zod) + registry (native
   components) + `engine.ts` wrapping `@openuidev/lang-core` (parse/validate/prompt), with
   `@json-render` behind the same interface as fallback.
3. **Filter planner (wired):** `inlet` respects the resolver; in AUTO/ON injects the system
   prompt generated from our catalog; OFF/AUTO do nothing when text suffices. Feature-flag
   gated; proves no-op when OFF.
4. **Safety:** node/depth/size limits, action/URL allow-lists, graceful Markdown fallback,
   telemetry disabled.
5. **Tests:** malformed schema, unknown component, invalid JSON, streaming, fallback,
   dark/mobile, persisted/reloaded chat, provider without structured output.
6. **Visual review:** Playwright screenshots + `visual-regression` + `ui-review`.
