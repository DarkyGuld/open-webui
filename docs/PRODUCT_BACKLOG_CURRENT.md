# Personal AI Workspace — ranked next product slices (M9.12)

Source inspection, Open WebUI 0.12.3; not a claim that every external integration was exercised.
Old `CHATGPT_PARITY_ROADMAP.md` is a historical 0.12.1 comparison. Current routes include Notes,
Folders, Workspace, Automations, Calendar and Chat. Backend already has Files, Knowledge,
Retrieval, Search, Memories, Tools, Apps, Skills, Pipelines and Terminals routers.

Effort ranges below are engineering estimates for a *small useful slice*, including tests/review;
provider setup, deployment and unknown upstream changes can increase them. None is implemented
by this document.

| Rank | Goal | Existing foundation | Missing/uncertain | Smallest useful next slice | Estimated effort |
|---|---|---|---|---|---|
| P0 | Reliable interaction state | Streaming runtime, filtered local restoration | Safe atomic server synchronization; sharing/privacy/conflicts | Owner-only, revisioned block-state API after design review | 3–6 days |
| 1 | Unified Library | `files.py`, Knowledge, uploads, existing image previews | Unified cross-chat image/video/document browsing/search | Read-only authorized Files view with type filters and native preview; no new storage model | 3–5 days |
| 2 | Intelligent Gallery | Native Gallery + safe Image + file APIs | Real image refs bound from files; video/ref lifetime/auth handling | Gallery of actual image files returned by owner/authorized listing, loading/error/empty | 2–4 days after Library |
| 3 | Projects/workspaces | Folders, workspace Models, knowledge links | Coherent project instructions/source selection and persistence UX | Reuse one Folder as a project landing surface, existing instructions/sources | 4–7 days |
| 4 | Search and Knowledge/RAG | Search/retrieval/knowledge already native | Provider configuration and citation/retrieval quality not assessed end-to-end here | One documented collection, ingest/retrieve/citation regression flow | 2–4 days plus indexing |
| 5 | Artifacts/document editing | Notes/editor and existing code preview | Unified artifact history/selection/editing workflow | Open an existing Note alongside chat; reuse editor + revision paths | 4–7 days |
| 6 | Deep Research | Existing tools/search/tasks | Resumable research job, verifiable sources, report UX | Reviewed source-grounded report over existing tools; not a new planner engine | 1–2 weeks |
| 7 | Agent/Work | Tools, pipelines, subagents/terminal infrastructure | Task lifecycle/approval/recovery and visible audit trail | One approval-controlled work task with progress and cancellation | 1–2 weeks |
| 8 | MCP/connectors | Tools/Apps/Functions + connector hooks | Unified connection UX, per-tool permissions/secrets lifecycle | One already-supported connector with permission and failure-state walkthrough | 3–6 days |

**Recommendation:** close the reviewed state-storage design first, then build the **read-only
Unified Library**. It gives immediate everyday value and unlocks a real Gallery without fake URLs,
duplicate file stores or external image-search dependencies. No M10 planner is warranted by current
evidence; do not start all P2 modules concurrently.
