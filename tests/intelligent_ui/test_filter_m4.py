"""Milestone 4 tests: durable structured output via the Filter outlet."""

import asyncio

from open_webui.intelligent_ui.filter import Filter

BLOCK = ':::intelligent-ui{v="1"}\nroot = Metric("Cost", "5 294 kr")\n:::'


def run(coro):
    return asyncio.run(coro)


def test_build_output_items_extracts_blocks():
    items = Filter._build_output_items(f"Here you go:\n\n{BLOCK}\n\nDone.")
    assert len(items) == 1
    it = items[0]
    assert it["type"] == "intelligent_ui"
    assert it["output_schema_version"] == 1
    assert it["catalog_version"] == 3
    assert it["format"] == "openui-lang"
    assert it["content"].startswith("root = Metric")
    assert it["id"].startswith("iu_")


def test_build_output_items_stable_id():
    a = Filter._build_output_items(BLOCK)[0]["id"]
    b = Filter._build_output_items(BLOCK)[0]["id"]
    assert a == b  # stable id derived from content


def test_build_output_items_multiple_and_empty():
    assert Filter._build_output_items("no blocks here") == []
    two = BLOCK + "\n\n" + BLOCK
    assert len(Filter._build_output_items(two)) == 2


def test_outlet_attaches_items_without_touching_content():
    f = Filter()
    body = {"messages": [{"role": "assistant", "content": f"Text\n\n{BLOCK}"}]}
    original_content = body["messages"][-1]["content"]
    out = run(f.outlet(body))
    assert out["messages"][-1]["content"] == original_content
    assert out["messages"][-1]["output"][0]["type"] == "intelligent_ui"


def test_outlet_noop_without_block():
    f = Filter()
    body = {"messages": [{"role": "assistant", "content": "plain markdown"}]}
    out = run(f.outlet(body))
    assert "output" not in out["messages"][-1]
