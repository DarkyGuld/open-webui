"""Milestone 1 tests: Intelligent UI gating (precedence + no-op)."""

import asyncio

import pytest

from open_webui.intelligent_ui.mode import (
    IntelligentUIMode,
    model_supports_intelligent_ui,
    normalize_chat_mode,
    resolve_effective_mode,
    resolve_intelligent_ui_mode,
    user_enabled_from_settings,
)
from open_webui.intelligent_ui.filter import Filter


# --- Precedence (the 6 required cases + extras) --------------------------------

@pytest.mark.parametrize(
    "global_enabled,user_enabled,chat_mode,model_supported,expected",
    [
        # Required cases
        (False, True, "on", True, "off"),      # global off wins
        (True, False, "on", True, "off"),      # user off wins
        (True, True, "on", False, "off"),      # model unsupported wins
        (True, True, "off", True, "off"),      # chat off
        (True, True, "auto", True, "auto"),    # chat auto
        (True, True, "on", True, "on"),        # fully on
        # Extras
        (False, False, "auto", True, "off"),
        (True, True, None, True, "auto"),      # absent chat mode => auto
        (True, True, "garbage", True, "auto"), # unknown => auto
        (True, True, "ON", True, "on"),        # case-insensitive
        (True, True, "off", False, "off"),     # multiple offs
    ],
)
def test_precedence(global_enabled, user_enabled, chat_mode, model_supported, expected):
    result = resolve_intelligent_ui_mode(
        global_enabled=global_enabled,
        user_enabled=user_enabled,
        chat_mode=chat_mode,
        model_supported=model_supported,
    )
    assert result == IntelligentUIMode(expected)


def test_model_support_opt_out_semantics():
    assert model_supports_intelligent_ui(None) is True
    assert model_supports_intelligent_ui({}) is True
    assert model_supports_intelligent_ui({"intelligent_ui": True}) is True
    assert model_supports_intelligent_ui({"intelligent_ui": False}) is False


def test_normalize_chat_mode():
    assert normalize_chat_mode(None) == IntelligentUIMode.AUTO
    assert normalize_chat_mode("off") == IntelligentUIMode.OFF
    assert normalize_chat_mode("ON") == IntelligentUIMode.ON
    assert normalize_chat_mode("nonsense") == IntelligentUIMode.AUTO


# --- User settings extraction --------------------------------------------------

def test_user_enabled_from_settings_shapes():
    assert user_enabled_from_settings(None) is False
    assert user_enabled_from_settings({}) is False
    assert user_enabled_from_settings({"ui": {"intelligentUi": True}}) is True
    assert user_enabled_from_settings({"ui": {"intelligentUi": False}}) is False
    assert user_enabled_from_settings({"intelligentUi": True}) is True  # ui-less flat dict


def test_resolve_effective_mode_from_containers():
    mode = resolve_effective_mode(
        global_enabled=True,
        user_settings={"ui": {"intelligentUi": True}},
        params={"intelligent_ui": "on"},
        model_capabilities={},
    )
    assert mode == IntelligentUIMode.ON


# --- OFF is a true no-op (filter) ---------------------------------------------

def test_filter_is_noop_inlet_when_off():
    f = Filter()
    body = {"model": "x", "messages": [{"role": "user", "content": "hi"}]}
    result = asyncio.run(f.inlet(body, __user__={"settings": {"ui": {}}}))
    assert result is body
    assert result == {"model": "x", "messages": [{"role": "user", "content": "hi"}]}


def test_filter_is_noop_even_when_on():
    """Milestone 1: the filter must not mutate regardless of mode."""
    f = Filter()
    body = {"model": "x", "messages": []}
    result = asyncio.run(
        f.inlet(
            body,
            __user__={"settings": {"ui": {"intelligentUi": True}}},
            __metadata__={"params": {"intelligent_ui": "on"}},
            __model__={"info": {"meta": {"capabilities": {"intelligent_ui": True}}}},
        )
    )
    assert result is body


def test_filter_outlet_and_stream_noop():
    f = Filter()
    body = {"messages": [{"role": "assistant", "content": "hi"}]}
    event = {"type": "chat:completion", "data": {"done": True}}
    assert asyncio.run(f.outlet(body)) is body
    assert asyncio.run(f.stream(event)) is event
