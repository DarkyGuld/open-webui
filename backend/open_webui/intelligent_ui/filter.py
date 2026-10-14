"""Intelligent UI Filter — generation/orchestration (Milestone 3).

Inlet behavior by effective mode (resolved centrally):
    OFF  -> request returned completely unchanged (identity)
    AUTO -> inject conservative Intelligent UI capability instructions
    ON   -> inject the same instructions with a stronger preference for UI

The instructions are generated from our catalog via OpenUI's prompt API
(see ``catalog_prompt.py``) — not hand-duplicated. No extra model call is made:
the main model decides text-vs-UI in one pass.

Absolute imports are used because Open WebUI executes function source standalone.
"""

from __future__ import annotations

import logging
from typing import Any

from pydantic import BaseModel

from open_webui.intelligent_ui.catalog_prompt import CATALOG_VERSION, PROMPT
from open_webui.intelligent_ui.mode import IntelligentUIMode, load_effective_mode

log = logging.getLogger(__name__)

AUTO_HEADER = (
    "Intelligent UI is AVAILABLE but optional and conservative. "
    "Prefer normal Markdown for explanations and prose. Use Intelligent UI only when it "
    "clearly improves clarity (a side-by-side comparison, one headline metric, or tabular data)."
)
ON_HEADER = (
    "Intelligent UI is ENABLED. Actively consider structured UI (comparison, metric, table) "
    "whenever it meaningfully improves the answer, while still using normal Markdown where UI "
    "adds little value. Do not force decorative widgets."
)


class Filter:
    class Valves(BaseModel):
        # Master switch for this filter (separate from the global product toggle).
        enabled: bool = True
        priority: int = 0

    def __init__(self):
        self.valves = self.Valves()
        self.type = "filter"
        self.name = "Intelligent UI (generation)"

    def _capabilities(self, __model__: dict | None) -> dict | None:
        if not __model__:
            return None
        info = __model__.get("info") or {}
        return (info.get("meta") or {}).get("capabilities")

    async def _effective_mode(self, __user__, __metadata__, __model__) -> IntelligentUIMode:
        try:
            user_settings = (__user__ or {}).get("settings") if __user__ else None
            params = (__metadata__ or {}).get("params") if __metadata__ else None
            return await load_effective_mode(
                user_settings=user_settings,
                params=params,
                model_capabilities=self._capabilities(__model__),
            )
        except (Exception, SystemExit):
            log.exception("intelligent-ui: failed to resolve effective mode")
            return IntelligentUIMode.OFF

    @staticmethod
    def _inject(body: dict, instructions: str) -> dict:
        messages = body.get("messages")
        if not isinstance(messages, list):
            messages = []
        body["messages"] = [{"role": "system", "content": instructions}, *messages]
        return body

    async def inlet(self, body: dict, __user__=None, __metadata__=None, __model__=None, **__) -> dict:
        if not self.valves.enabled:
            return body

        mode = await self._effective_mode(__user__, __metadata__, __model__)
        log.debug("intelligent-ui: effective mode=%s", mode.value)

        if mode == IntelligentUIMode.OFF:
            return body  # TRUE no-op — identity, no mutation

        header = AUTO_HEADER if mode == IntelligentUIMode.AUTO else ON_HEADER
        instructions = f"{header}\n\n{PROMPT}"
        return self._inject(body, instructions)

    async def outlet(self, body: dict, **__) -> dict:
        # Observability only — never mutate the response.
        try:
            messages = body.get("messages") or []
            content = messages[-1].get("content") if messages else ""
            if isinstance(content, str) and ":::intelligent-ui" in content:
                log.info("intelligent-ui: model emitted UI block (catalog_version=%s)", CATALOG_VERSION)
        except Exception:
            pass
        return body

    async def stream(self, event: dict, **__) -> dict:
        return event
