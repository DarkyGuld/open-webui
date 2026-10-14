"""Intelligent UI effective-mode resolution.

Single source of truth for the precedence rules. Everything that needs to know
whether Intelligent UI is active MUST call these helpers instead of re-implementing
the logic.

Precedence (see docs/intelligent-ui/RECOMMENDATION.md / MILESTONE_1_REPORT.md):

    global OFF                               -> OFF
    global ON  + user OFF                    -> OFF
    global ON  + user ON + model unsupported -> OFF
    global ON  + user ON + model OK + chat OFF   -> OFF
    global ON  + user ON + model OK + chat ON    -> ON
    global ON  + user ON + model OK + chat AUTO  -> AUTO
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Mapping, Optional

GLOBAL_CONFIG_KEY = "intelligent_ui.enable"


class IntelligentUIMode(str, Enum):
    OFF = "off"
    AUTO = "auto"
    ON = "on"


_CHAT_MODE_MAP = {
    "off": IntelligentUIMode.OFF,
    "auto": IntelligentUIMode.AUTO,
    "on": IntelligentUIMode.ON,
}


def normalize_chat_mode(value: Any) -> IntelligentUIMode:
    """Normalize a chat-level value to a mode. Unknown/absent -> AUTO."""
    if isinstance(value, IntelligentUIMode):
        return value
    if value is None:
        return IntelligentUIMode.AUTO
    return _CHAT_MODE_MAP.get(str(value).strip().lower(), IntelligentUIMode.AUTO)


def model_supports_generation(capabilities: Optional[Mapping[str, Any]]) -> bool:
    """Whether a model may be asked to GENERATE Intelligent UI.

    Opt-out semantics: absent => supported, explicit ``False`` => disabled.
    ``intelligent_ui_generate`` takes precedence; ``intelligent_ui`` is a
    back-compat alias.
    """
    if not capabilities:
        return True
    if "intelligent_ui_generate" in capabilities:
        return capabilities.get("intelligent_ui_generate") is not False
    return capabilities.get("intelligent_ui", True) is not False


def model_supports_render(capabilities: Optional[Mapping[str, Any]]) -> bool:
    """Whether Intelligent UI may be RENDERED for this context.

    Rendering an existing saved block does not depend on the current model, so
    this defaults to True and is only used to honor an explicit opt-out.
    """
    if not capabilities:
        return True
    return capabilities.get("intelligent_ui_render", True) is not False


# Back-compat alias (Milestone 1/2 used this name for generation capability).
def model_supports_intelligent_ui(capabilities: Optional[Mapping[str, Any]]) -> bool:
    return model_supports_generation(capabilities)


def resolve_intelligent_ui_mode(
    *,
    global_enabled: bool,
    user_enabled: bool,
    chat_mode: Any,
    model_supported: bool,
) -> IntelligentUIMode:
    """Resolve the effective mode from all four scopes (pure function)."""
    if not global_enabled:
        return IntelligentUIMode.OFF
    if not user_enabled:
        return IntelligentUIMode.OFF
    if not model_supported:
        return IntelligentUIMode.OFF
    return normalize_chat_mode(chat_mode)


def user_enabled_from_settings(user_settings: Optional[Any]) -> bool:
    """Extract the per-user Intelligent UI toggle from a user settings object/dict."""
    if user_settings is None:
        return False

    ui: Any = None
    if isinstance(user_settings, Mapping):
        ui = user_settings.get("ui", user_settings)
    else:
        ui = getattr(user_settings, "ui", user_settings)

    if ui is None:
        return False
    if isinstance(ui, Mapping):
        return bool(ui.get("intelligentUi", False))
    return bool(getattr(ui, "intelligentUi", False))


def resolve_effective_mode(
    *,
    global_enabled: bool,
    user_settings: Optional[Any] = None,
    params: Optional[Mapping[str, Any]] = None,
    model_capabilities: Optional[Mapping[str, Any]] = None,
) -> IntelligentUIMode:
    """Resolve the effective mode from explicit scope containers (pure function)."""
    return resolve_intelligent_ui_mode(
        global_enabled=bool(global_enabled),
        user_enabled=user_enabled_from_settings(user_settings),
        chat_mode=(params or {}).get("intelligent_ui"),
        model_supported=model_supports_generation(model_capabilities),
    )


async def load_global_enabled() -> bool:
    """Read the persisted global toggle from the application config."""
    # Best-effort: importing the DB/config layer can raise SystemExit outside a
    # running app (env validation); catch it and fall back to the env default.
    try:
        from open_webui.models.config import Config  # noqa: PLC0415

        values = await Config.get_many(GLOBAL_CONFIG_KEY)
        if GLOBAL_CONFIG_KEY in values:
            return bool(values[GLOBAL_CONFIG_KEY])
    except (Exception, SystemExit):
        pass

    try:
        from open_webui.config import ENABLE_INTELLIGENT_UI  # noqa: PLC0415

        return bool(ENABLE_INTELLIGENT_UI)
    except (Exception, SystemExit):
        return False


async def load_effective_mode(
    *,
    user_settings: Optional[Any] = None,
    params: Optional[Mapping[str, Any]] = None,
    model_capabilities: Optional[Mapping[str, Any]] = None,
) -> IntelligentUIMode:
    """Async resolver that reads the global toggle from persisted config."""
    return resolve_effective_mode(
        global_enabled=await load_global_enabled(),
        user_settings=user_settings,
        params=params,
        model_capabilities=model_capabilities,
    )
