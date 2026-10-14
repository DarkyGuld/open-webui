# Intelligent UI — Research Index

All conclusions are preserved under `docs/` (the raw research clones are **not** committed;
`research/` is gitignored). Detailed analysis: `OSS_RESEARCH.md`, `OSS_COMPARISON_MATRIX.md`.

## Mandatory projects reviewed (source-level)

| Project | URL | License | Notes |
|---|---|---|---|
| OpenUI | https://github.com/thesysdev/openui | MIT | OpenUI Lang; framework-agnostic `lang-core`; Svelte runtime trails React |
| A2UI | https://github.com/a2ui-project/a2ui | Apache-2.0 | Declarative JSON protocol; no official Svelte renderer; v0.9.1 prod, v1.0 RC |
| AG-UI | https://github.com/ag-ui-protocol/ag-ui | MIT | Agent↔app event protocol (not a UI format); no Svelte client |
| open-intelligent-ui | https://github.com/thesysdev/open-intelligent-ui | **none** | ChatGPT-IUI showcase; reference only (unlicensed) |
| CopilotKit/OpenIntelligentUI | https://github.com/CopilotKit/OpenIntelligentUI | MIT | Best idea: backend visualization router; else React/CopilotKit reference |
| CopilotKit | https://github.com/CopilotKit/CopilotKit | MIT | Frontend agent stack; reference |
| json-render | https://github.com/vercel-labs/json-render | Apache-2.0 | Official Svelte renderer; our fallback engine |
| Open WebUI | https://github.com/open-webui/open-webui | BSD-3 + branding clause | Base project; Functions/Filters/Pipes/Tools |
| Disdjj/intelligent-ui-demo | https://github.com/Disdjj/intelligent-ui-demo | MIT | Reverse-engineers ChatGPT's "DIL/GenUI" (streaming DSL + iframe/Worker sandbox) |

## Key conclusions

- The field converges on: **model emits a compact declarative UI description → trusted client
  catalog renders it with native components → no arbitrary code.**
- **OpenUI (`lang-core`)** is the best engine for our stack: streaming-first, token-efficient
  (~50% fewer tokens than JSON), catalog→prompt generation, MIT, framework-agnostic core.
- **json-render** is the pragmatic fallback (official Svelte renderer, Apache-2.0).
- **A2UI** is the most rigorous *protocol* but pre-1.0 with no official Svelte renderer → reference.
- **AG-UI** is plumbing, not UI → optional external agent connector.
- Open WebUI has **no native generative-UI**; the only current custom-UI channel is sandboxed
  `embeds` iframes. Closed upstream requests: #23307, #25452, #9944, #1477.
- Functions can do planning/injection/validation but **cannot render native components**; a minimal
  frontend renderer hook is required (implemented as the `:::intelligent-ui` colonFence dispatch).

## Where the conclusions live

- `OSS_RESEARCH.md` — per-project source-level findings.
- `OSS_COMPARISON_MATRIX.md` — comparison matrix + ranking (#1 OpenUI, #2 json-render, #3 A2UI).
- `ARCHITECTURE_OPTIONS.md`, `RECOMMENDATION.md` — chosen architecture.
- `FUNCTIONS_CAPABILITIES.md`, `EXTENSION_POINT_COMPARISON.md` — Open WebUI mechanisms.
- `CURRENT_RENDER_PIPELINE.md` — render pipeline map.
- `UI_SCHEMA.md`, `SECURITY.md`, `UPSTREAM_IMPACT.md` — contract, security, impact.
- `docs/CHATGPT_PARITY_ROADMAP.md` — product roadmap.
