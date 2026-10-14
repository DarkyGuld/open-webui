# ChatGPT Parity Roadmap — Open WebUI vs LibreChat

Basis: the user's full ChatGPT feature list, reduced to **14 modules + underlying
capabilities**. Coverage assessed against **this Open WebUI fork (0.12.1)** source
(routes, `DEFAULT_CONFIG` feature flags, backend routers) and against **LibreChat**
(README/route/feature inspection). Status: ✅ native · 🟡 partial/DIY · ❌ missing.

## Coverage by module

| # | Module | Open WebUI 0.12.1 | LibreChat | Notes |
|---|---|---|---|---|
| 1 | **Chat** | ✅ | ✅ | OWUI: edit/regenerate/stop/copy, markdown/tables/code/LaTeX/citations, multi-model, temp chat, reasoning effort. |
| 2 | **Search / web** | ✅ | ✅ | OWUI: web search (multiple engines incl. local), query-gen, citations. Site-scoped search: 🟡. |
| 3 | **Library** | 🟡 | 🟡 | OWUI has Files + Knowledge + Folders but **no single persistent cross-chat Library** like ChatGPT. Buildable as a module. |
| 4 | **Knowledge / RAG** | ✅ | ✅ | OWUI: Knowledge collections, hybrid RAG, retrieval query-gen. |
| 5 | **Memory** | ✅ | ✅ | OWUI: `ENABLE_MEMORIES`, background review, memory system context. |
| 6 | **Projects / Workspace** | 🟡 | ✅ | OWUI: Folders + Workspace/Models + knowledge; ChatGPT "Projects" (shared sources/instructions/per-chat) only partial. LibreChat has first-class `projects`. |
| 7 | **Notes / Writing** | ✅ | 🟡 | OWUI: Notes module. OWUI lacks ChatGPT "Canvas"/document editing surface. |
| 8 | **Intelligent UI** | ❌ | ❌ (has **Artifacts**) | OWUI: none native. **Our focus** — see `docs/intelligent-ui/`. |
| 9 | **Deep Research** | ❌ | 🟡 | OWUI: no dedicated research mode. Buildable via Subagents/Tools + plan UI (PAW had a research planner to port). |
| 10 | **Work / Agent** | 🟡 | ✅ | OWUI: Subagents + Pipelines + Tools; not a full autonomous "Work" mode. LibreChat: Agents, Agent API, subagents, code workspaces. |
| 11 | **Files & Artifacts** | 🟡 | ✅ | OWUI: files, code interpreter, code-preview side panel (`Artifacts.svelte`); **no ChatGPT Artifacts/Canvas**. LibreChat: Artifacts (React/HTML/Mermaid). |
| 12 | **Plugins / Connectors** | 🟡 | ✅ | OWUI: Tools/Pipelines/Apps + Google Drive/OneDrive + MCP-via-tools; breadth limited, no unified plugin system. LibreChat: MCP, Skills, Plugins, actions. |
| 13 | **Automations / Scheduled** | ✅ | 🟡 | OWUI: `ENABLE_AUTOMATIONS` + `ENABLE_CALENDAR` + tasks + webhooks. Strong. |
| 14 | **Settings / Personalization** | ✅ | ✅ | OWUI: extensive personal + admin settings. |
| — | Custom GPTs / Store | 🟡 | ✅ | OWUI: "Models"/Workspace + Prompts (GPT-like); no store. LibreChat: Agents + Marketplace. |
| — | Sharing / collaboration | 🟡 | ✅ | OWUI: share links, community sharing, groups. LibreChat: sharing policies, shared agents/projects. |
| — | Mobile / desktop | 🟡 | 🟡 | Both PWA; native apps are separate efforts. |

## Underlying capabilities

| Capability | Open WebUI | LibreChat |
|---|---|---|
| Models (multi-provider, reasoning, temp) | ✅ | ✅ |
| Tools | ✅ | ✅ |
| RAG / embeddings | ✅ | ✅ |
| Code execution / interpreter | ✅ (`ENABLE_CODE_EXECUTION`, `ENABLE_CODE_INTERPRETER`, terminal) | ✅ (Code Interpreter API + code environments) |
| Vision | ✅ | ✅ |
| Image generation/edit | ✅ | ✅ |
| Voice (STT/TTS, voice mode) | ✅ | ✅ |
| Browser / computer use | 🟡 (tools, Open Terminal/browser profiles) | 🟡 |
| MCP / plugins | 🟡 (via tools/pipelines) | ✅ (first-class MCP) |
| Scheduling | ✅ | 🟡 |
| Storage | ✅ | ✅ |
| Permissions / RBAC / groups | ✅ | ✅ (enterprise-grade) |
| Search (web) | ✅ | ✅ |
| **Extension without forking** | **✅✅ (Functions/Filters/Pipes/Tools + valves)** | 🟡 (config + code) |

## Verdict

**Open WebUI is a sound base for ChatGPT parity.** It already covers ~10 of 14 modules
natively, has the **strongest no-fork extension model**, is model-agnostic, has the largest
community (156k★), and light ops (SQLite default). Its real gaps are: **Intelligent UI**
(our focus), **Deep Research**, **full Artifacts/Canvas**, **ChatGPT-style Projects**, a
**unified plugin system**, and an **autonomous Work/Codex** mode.

**LibreChat is a better *out-of-the-box* match for the agent/coding/artifact modules**
(Agents, MCP, Skills, Code Interpreter, Artifacts, Projects, Marketplace) and is **MIT**
(free rebrand). Its costs: Node + MongoDB (+ Redis) ops, and you customize within their
React codebase (less "add without forking").

### Recommendation

- **Stay on Open WebUI** (default). Rationale: breadth already high, best extensibility (add
  the missing modules as Functions/Tools/modules without forking), light ops, huge community,
  and our Intelligent UI research/adapters already target it. Build the gaps (8, 9, 11, 6, 12,
  10) natively.
- **Switch/borrow from LibreChat only if** agentic coding + Artifacts + MCP are your top
  priorities and you want them now, and you accept Node/Mongo ops and MIT-rebrand logic.
  A middle path: keep Open WebUI as the shell and port **ideas/contracts** (Artifacts model,
  Agents/MCP patterns, Projects) behind adapters.

Note: Open WebUI's license is **BSD-3 + a branding clause** — if you intend to fully rebrand
the product, evaluate that clause carefully (LibreChat's MIT has no such clause).

## Recommended phasing (Open WebUI base)

1. **Intelligent UI** (module 8) — the differentiator. Start with the minimal prototype
   (metric/comparison/table, Auto|On|Off) per `docs/intelligent-ui/RECOMMENDATION.md`.
2. **Deep Research** (9) — Subagents + web search + a plan/progress UI (reuse the
   Intelligent-UI renderer for the plan and report).
3. **Files/Artifacts** (11) — a native Artifacts/Canvas preview surface (reuse the
   Artifacts side panel + a controlled renderer).
4. **Projects** (6) — extend Folders with per-project instructions and shared sources.
5. **Connectors/Plugins** (12) — unify Tools/Pipelines/Apps + MCP into one "Plugins" surface.
6. **Work/Agent** (10) — elevate Subagents into a first-class autonomous mode.
7. **Unified search** (3/23) — one global search across chats/Library/Projects/files.

Each module must respect `AGENTS.md` (one visual language, native components, responsive,
loading/empty/error, Playwright + visual review, graceful degradation).

## Gap detail (Open WebUI)

| Gap | Effort | How |
|---|---|---|
| Intelligent UI | M | New marked token + native renderer + Filter planner (see research) |
| Deep Research | M | Subagents/Tools + plan UI + report artifact |
| Artifacts/Canvas | M | Extend `Artifacts.svelte` side panel + native renderer |
| Projects | S–M | Folders + `params`/metadata for instructions/sources |
| Unified Library | M | Cross-chat file index + search (build on existing Files/Knowledge) |
| Unified plugins/connectors | M | Unify Tools/Pipelines/Apps/MCP under one surface |
| Work/Codex mode | L | Extend Subagents + terminal/browser tools + approvals |
| GPT store | M | Publish/list Workspace Models (Agents) |

## Bottom line

Your roadmap (14 modules + capabilities) is the right frame. On Open WebUI, **module 1–2, 4–5,
7, 13–14 are essentially free**, **3, 6, 10–12 need targeted work**, and **8 (Intelligent UI)
+ 9 (Deep Research) are the flagship builds**. Nothing about the gaps justifies abandoning the
Open WebUI base — the extension model makes filling them cheaper than rebuilding elsewhere.
