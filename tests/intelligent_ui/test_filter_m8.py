"""Milestone 8 tests: server fallbackMarkdown + normalization."""

import asyncio

from open_webui.intelligent_ui.filter import Filter, _fallback_markdown

BLOCK = ':::intelligent-ui{v="1"}\nroot = Metric("Monthly cost", "5 294 kr")\n:::'


def run(coro):
    return asyncio.run(coro)


def test_fallback_markdown_lists_strings_and_drops_code():
    fb = _fallback_markdown(BLOCK)
    assert "Monthly cost" in fb
    assert "5 294 kr" in fb
    assert "root =" not in fb
    assert fb.startswith("- ")


def test_fallback_markdown_empty():
    assert _fallback_markdown("") == "_Interactive UI_"
    assert _fallback_markdown("root = Divider()") == "_Interactive UI_"


def test_outlet_item_includes_fallback_markdown():
    f = Filter()
    body = {"messages": [{"role": "assistant", "content": f"Text\n\n{BLOCK}"}]}
    out = run(f.outlet(body))
    item = out["messages"][-1]["output"][0]
    assert item["type"] == "intelligent_ui"
    assert "Monthly cost" in item["fallback_markdown"]
    # content (prose) untouched
    assert "Text" in out["messages"][-1]["content"]
