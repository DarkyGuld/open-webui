"""Milestone 3 tests: Filter generation/orchestration + capability policy."""

import asyncio
import copy

from open_webui.intelligent_ui import filter as filter_mod
from open_webui.intelligent_ui.filter import AUTO_HEADER, Filter, ON_HEADER
from open_webui.intelligent_ui.mode import (
    IntelligentUIMode,
    model_supports_generation,
    model_supports_render,
)


def run(coro):
    return asyncio.run(coro)


def _stub_mode(mode):
    async def _f(**_kwargs):
        return mode

    return _f


# --- OFF is a true no-op -------------------------------------------------------

def test_off_returns_identity_and_unchanged(monkeypatch):
    monkeypatch.setattr(filter_mod, "load_effective_mode", _stub_mode(IntelligentUIMode.OFF))
    f = Filter()
    body = {"model": "x", "messages": [{"role": "user", "content": "hi"}]}
    before = copy.deepcopy(body)
    out = run(f.inlet(body, __user__={}, __metadata__={}, __model__={}))
    assert out is body
    assert body == before


def test_disabled_valve_returns_identity(monkeypatch):
    monkeypatch.setattr(filter_mod, "load_effective_mode", _stub_mode(IntelligentUIMode.ON))
    f = Filter()
    f.valves.enabled = False
    body = {"messages": [{"role": "user", "content": "hi"}]}
    assert run(f.inlet(body)) is body


# --- AUTO / ON injection -------------------------------------------------------

def test_auto_injects_conservative_instructions(monkeypatch):
    monkeypatch.setattr(filter_mod, "load_effective_mode", _stub_mode(IntelligentUIMode.AUTO))
    f = Filter()
    body = {"model": "x", "messages": [{"role": "user", "content": "compare a and b"}]}
    out = run(f.inlet(body, __user__={}, __metadata__={}, __model__={}))
    assert out["messages"][0]["role"] == "system"
    assert AUTO_HEADER in out["messages"][0]["content"]
    # original message preserved after the injected system message
    assert out["messages"][1] == {"role": "user", "content": "compare a and b"}


def test_on_injects_stronger_instructions(monkeypatch):
    monkeypatch.setattr(filter_mod, "load_effective_mode", _stub_mode(IntelligentUIMode.ON))
    f = Filter()
    body = {"messages": [{"role": "user", "content": "compare a and b"}]}
    out = run(f.inlet(body))
    assert ON_HEADER in out["messages"][0]["content"]
    assert AUTO_HEADER not in out["messages"][0]["content"]


def test_injection_includes_generated_catalog_prompt(monkeypatch):
    monkeypatch.setattr(filter_mod, "load_effective_mode", _stub_mode(IntelligentUIMode.ON))
    out = run(Filter().inlet({"messages": []}))
    content = out["messages"][0]["content"]
    assert "Metric" in content and "Comparison" in content and "Table" in content


def test_inlet_tolerates_missing_messages(monkeypatch):
    monkeypatch.setattr(filter_mod, "load_effective_mode", _stub_mode(IntelligentUIMode.AUTO))
    out = run(Filter().inlet({}))
    assert out["messages"][0]["role"] == "system"


# --- Capability policy ---------------------------------------------------------

def test_generation_capability_semantics():
    assert model_supports_generation(None) is True
    assert model_supports_generation({}) is True
    assert model_supports_generation({"intelligent_ui_generate": False}) is False
    assert model_supports_generation({"intelligent_ui_generate": True}) is True
    # back-compat alias
    assert model_supports_generation({"intelligent_ui": False}) is False


def test_render_capability_semantics():
    assert model_supports_render(None) is True
    assert model_supports_render({}) is True
    assert model_supports_render({"intelligent_ui_render": False}) is False
    # generation flag does not affect rendering
    assert model_supports_render({"intelligent_ui_generate": False}) is True


# --- Streaming passthrough -----------------------------------------------------

def test_stream_and_outlet_do_not_mutate():
    f = Filter()
    event = {"type": "chat:completion", "data": {"done": True}}
    assert run(f.stream(event)) is event
    body = {"messages": [{"role": "assistant", "content": "hi"}]}
    assert run(f.outlet(body)) is body
