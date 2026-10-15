"""Intelligent UI — optional, gated presentation layer.

Gating (M1), native rendering (M2), generation/orchestration (M3), interaction
(M4), layout (M5), logic/state (M6), streaming (M7), server fallback (M8),
rich-widget escape hatch (M9), and rich-widget control parity (M9.1).
"""

from .mode import (
    GLOBAL_CONFIG_KEY,
    HTML_GLOBAL_CONFIG_KEY,
    IntelligentUIMode,
    load_effective_mode,
    load_global_enabled,
    load_html_global_enabled,
    load_rich_widget_effective,
    model_supports_generation,
    model_supports_intelligent_ui,
    model_supports_render,
    normalize_chat_mode,
    resolve_effective_mode,
    resolve_intelligent_ui_mode,
    resolve_rich_widget_effective,
    resolve_rich_widget_mode,
    rich_user_enabled_from_settings,
    user_enabled_from_settings,
)

__all__ = [
    "GLOBAL_CONFIG_KEY",
    "HTML_GLOBAL_CONFIG_KEY",
    "IntelligentUIMode",
    "load_effective_mode",
    "load_global_enabled",
    "load_html_global_enabled",
    "load_rich_widget_effective",
    "model_supports_generation",
    "model_supports_intelligent_ui",
    "model_supports_render",
    "normalize_chat_mode",
    "resolve_effective_mode",
    "resolve_intelligent_ui_mode",
    "resolve_rich_widget_effective",
    "resolve_rich_widget_mode",
    "rich_user_enabled_from_settings",
    "user_enabled_from_settings",
]
