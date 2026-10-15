"""Milestone 9.1 tests: Rich Widget control parity (resolver + filter)."""

import asyncio
import copy

from open_webui.intelligent_ui import filter as filter_mod
from open_webui.intelligent_ui.catalog_prompt import PROMPT, RICH_PROMPT
from open_webui.intelligent_ui.filter import Filter
from open_webui.intelligent_ui.mode import (
    IntelligentUIMode,
    resolve_rich_widget_effective,
    resolve_rich_widget_mode,
    rich_user_enabled_from_settings,
)


def run(coro):
    return asyncio.run(coro)


# --- Resolver precedence -------------------------------------------------------

def test_rich_precedence():
    cases = [
        # global, user, chat, native_ui_enabled -> expected
        (False, True, "on", True, "off"),
        (True, False, "on", True, "off"),
        (True, True, "off", True, "off"),
        (True, True, "on", True, "on"),
        (True, True, "on", False, "on"),  # explicit ON works even if native off
        (True, True, "auto", True, "auto"),
        (True, True, "auto", False, "off"),  # auto needs native UI
        (True, True, None, True, "auto"),
        (True, True, "garbage", True, "auto"),
    ]
    for g, u, c, n, exp in cases:
        got = resolve_rich_widget_mode(
            global_enabled=g, user_enabled=u, chat_mode=c, native_ui_enabled=n
        )
        assert got == IntelligentUIMode(exp), (g, u, c, n, got, exp)


def test_rich_user_flag_extraction():
    assert rich_user_enabled_from_settings({"ui": {"intelligentUiHtml": True}}) is True
    assert rich_user_enabled_from_settings({"ui": {"intelligentUi": True}}) is False
    assert rich_user_enabled_from_settings(None) is False


def test_rich_effective_from_containers():
    mode = resolve_rich_widget_effective(
        global_enabled=True,
        user_settings={"ui": {"intelligentUiHtml": True}},
        params={"intelligent_ui_html": "on"},
        native_ui_enabled=False,
    )
    assert mode == IntelligentUIMode.ON


# --- Filter injection ----------------------------------------------------------

def _stub(v):
    async def _f(**_k):
        return v

    return _f


def test_filter_injects_rich_only(monkeypatch):
    monkeypatch.setattr(filter_mod, "load_effective_mode", _stub(IntelligentUIMode.OFF))
    monkeypatch.setattr(filter_mod, "load_rich_widget_effective", _stub(IntelligentUIMode.ON))
    out = run(Filter().inlet({"messages": []}))
    content = out["messages"][0]["content"]
    assert RICH_PROMPT in content
    assert PROMPT not in content  # native off


def test_filter_injects_native_only(monkeypatch):
    monkeypatch.setattr(filter_mod, "load_effective_mode", _stub(IntelligentUIMode.AUTO))
    monkeypatch.setattr(filter_mod, "load_rich_widget_effective", _stub(IntelligentUIMode.OFF))
    out = run(Filter().inlet({"messages": []}))
    content = out["messages"][0]["content"]
    assert PROMPT in content
    assert RICH_PROMPT not in content


def test_filter_both_off_is_noop(monkeypatch):
    monkeypatch.setattr(filter_mod, "load_effective_mode", _stub(IntelligentUIMode.OFF))
    monkeypatch.setattr(filter_mod, "load_rich_widget_effective", _stub(IntelligentUIMode.OFF))
    body = {"messages": [{"role": "user", "content": "hi"}]}
    before = copy.deepcopy(body)
    out = run(Filter().inlet(body))
    assert out is body
    assert body == before


def test_filter_injects_both(monkeypatch):
    monkeypatch.setattr(filter_mod, "load_effective_mode", _stub(IntelligentUIMode.AUTO))
    monkeypatch.setattr(filter_mod, "load_rich_widget_effective", _stub(IntelligentUIMode.AUTO))
    out = run(Filter().inlet({"messages": []}))
    content = out["messages"][0]["content"]
    assert PROMPT in content and RICH_PROMPT in content
