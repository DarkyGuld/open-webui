"""Intelligent UI — optional, gated presentation layer.

Gating (Milestone 1), native rendering (Milestone 2), and generation/orchestration
(Milestone 3): catalog prompt injection via the Filter.
"""

from .mode import (
    GLOBAL_CONFIG_KEY,
    IntelligentUIMode,
    load_effective_mode,
    load_global_enabled,
    model_supports_generation,
    model_supports_intelligent_ui,
    model_supports_render,
    normalize_chat_mode,
    resolve_effective_mode,
    resolve_intelligent_ui_mode,
    user_enabled_from_settings,
)

__all__ = [
    "GLOBAL_CONFIG_KEY",
    "IntelligentUIMode",
    "load_effective_mode",
    "load_global_enabled",
    "model_supports_generation",
    "model_supports_intelligent_ui",
    "model_supports_render",
    "normalize_chat_mode",
    "resolve_effective_mode",
    "resolve_intelligent_ui_mode",
    "user_enabled_from_settings",
]
