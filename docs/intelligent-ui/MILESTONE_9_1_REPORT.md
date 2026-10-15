# Milestone 9.1 Report — Rich Widget control parity

Branch: `intelligent-ui-foundation`. Status: **complete**. Zero new dependencies.

Goal: bring Rich Widget gating to the same control quality as native Intelligent UI.

## Control model

| Scope | Storage | Default |
|---|---|---|
| **Global (admin)** | `intelligent_ui.html.enable` → `features.enable_intelligent_ui_html` | **OFF** |
| **User** | `user.settings.ui.intelligentUiHtml` (`InterfaceSettings`) | OFF |
| **Chat** | `chat.params.intelligent_ui_html` ∈ `auto|on|off` | AUTO |

## Centralized resolver

`backend/open_webui/intelligent_ui/mode.py` — `resolve_rich_widget_mode(...)` /
`resolve_rich_widget_effective(...)` / `load_rich_widget_effective(...)`:

```
global OFF                    -> OFF
user OFF                      -> OFF
chat OFF                      -> OFF
chat ON                       -> ON
chat AUTO + native UI enabled -> AUTO
chat AUTO + native UI off     -> OFF   (rich widgets need native IUI)
```

Native Intelligent UI is resolved independently and remains usable on its own.

## Generation gating (Filter)

The Filter computes **both** modes and injects the relevant instructions independently:
- native mode ≠ OFF → catalog prompt (`PROMPT`);
- rich mode ≠ OFF → rich-widget instructions (`RICH_PROMPT`, generated);
- both OFF → **request unchanged** (identity no-op).

`RICH_PROMPT` teaches the `:::intelligent-ui-html{v="1"}` fence and its constraints; it is generated
from the catalog script (versioned).

## Historical rendering policy (decided + documented)

**Generation OFF does not destroy historical rendering.** A persisted rich widget renders whenever the
fence is present — the flag gates *generation* (the Filter instructions), not *rendering*. This matches
native Intelligent UI (render-if-present). Trade-off: an admin disabling rich widgets stops **new**
generation but existing sandboxed widgets still render; they remain sandboxed
(`allow-scripts`, no same-origin, strict no-network CSP). A future "hard disable" could strip rendering.

## UI

- **Admin → Interface**: *Rich widgets (custom HTML)* toggle (from M9).
- **User Settings → Interface**: *Rich widgets (custom HTML)* toggle (new).
- **Chat Controls**: *Rich widgets* Auto/On/Off (new), shown when global + user rich enabled — sitting
  next to the native *Intelligent UI* control.

## i18n

All new strings via `$i18n.t(...)`; keys added to **en-US + nb-NO**. No hardcoded English.

## Tests

- **pytest: 46 passed** — adds `test_mode_m9_1.py` (rich precedence incl. AUTO-needs-native; user-flag
  extraction; container resolver; filter injects rich-only / native-only / both / no-op).
- **vitest: 58 passed**.
- **Production build: green.**
- **Playwright: 4 screenshots**, 0 errors — both controls visible; historical widget renders; historical
  widget still renders when generation is disabled.

## Screenshots (`audit/local/intelligent-ui/milestone-9.1/`)

`01-chat-controls`, `02-user-setting-rich`, `03-historical-render`, `04-historical-when-off`.

## Upstream / core files changed (M9.1)

| File | Purpose | ~Lines |
|---|---|---|
| `models/users.py` | `InterfaceSettings.intelligentUiHtml` | +1 |
| `common/InterfaceSettings.svelte` | user toggle | +24 |
| `chat/Controls/Controls.svelte` | rich-widget tri-state | +40 |
| `intelligent-ui/components/RichWidget.svelte` | render-if-present (historical) | ~ -6 |
| i18n en-US / nb-NO | 3 keys each | +6 |

Backend (ours): `mode.py`, `filter.py`, `catalog_prompt.py` (generated).

**Cumulative M1–M9.1:** ~20 core files, ~235 lines.

## Security

Rich Widget default remains **globally OFF**. Sandbox + strict CSP unchanged. Historical rendering is
sandboxed.

## Regressions

None. M1–M9 tests remain green; native Intelligent UI unaffected (independently resolved).

## Limitations

- Historical widgets render even when generation is disabled (documented trade-off).
- Rich AUTO requires native Intelligent UI to be enabled.
- `@Set`/`@Reset`, `Query`/`Mutation`, and remaining M5 component families still pending.

## Next

`@Set`/`@Reset` → store, then `Query`/`Mutation` + tool bindings, then remaining native components.

## Do not start @Set/@Reset or Query/Mutation automatically.
