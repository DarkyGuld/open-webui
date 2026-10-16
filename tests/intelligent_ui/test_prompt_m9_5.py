"""Milestone 9.5 tests: catalog prompt cost + AUTO/ON guidance."""

from open_webui.intelligent_ui import filter as filter_mod
from open_webui.intelligent_ui.catalog_prompt import CATALOG_VERSION, PROMPT


def test_catalog_prompt_is_compact():
    # Guard against prompt bloat (the routing benchmark showed system-prompt
    # tokens dominate cheap model calls). M9.4 was ~14467 chars; M9.5 trims it.
    assert CATALOG_VERSION == 4
    assert 3000 < len(PROMPT) < 13000


def test_prompt_has_result_context_guidance():
    # The model must not redundantly restate UI data in prose.
    assert "Do not repeat in prose" in PROMPT


def test_prompt_has_output_hygiene():
    assert "Do not wrap every component in a Card" in PROMPT
    assert "Grid only for peer items" in PROMPT


def test_prompt_mentions_allow_listed_sources():
    for source in ["conversation.notes", "library.files", "knowledge.collections"]:
        assert source in PROMPT


def test_auto_header_has_conservative_preference_rules():
    h = filter_mod.AUTO_HEADER
    for kw in ["Comparison", "Table", "Metric", "Chart", "Timeline", "Markdown"]:
        assert kw in h
    assert "Do not force UI" in h


def test_on_header_is_more_forceful():
    assert "ENABLED" in filter_mod.ON_HEADER
    assert "Markdown" in filter_mod.ON_HEADER


def test_rich_header_unchanged_intent():
    assert "Rich widgets" in filter_mod.RICH_HEADER
