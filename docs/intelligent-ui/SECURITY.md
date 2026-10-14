# Intelligent UI — Security

Model output is **untrusted input**. Intelligent UI must never execute model-generated code or inject model-generated HTML.

## Threat model & mitigations

| Threat | Mitigation |
|---|---|
| **XSS / arbitrary HTML** | No `{@html}` with model content. Only allow-listed components; text rendered as text nodes. Reuse `DOMPurify` (already a dep) if any HTML is unavoidable. |
| **Arbitrary JS / code execution** | Never `eval`/`new Function`. The renderer interprets a fixed schema; the model cannot define behavior. (OpenUI `lang-core` uses an AST interpreter, no eval.) |
| **Malicious URLs** | Validate `open_url`/link/image URLs: allow only `https:`, block `javascript:`/`data:` (except safe image types), optional host allowlist. Require user confirmation before navigation. |
| **Forms / buttons → side effects** | Interactions produce **local state** or a **follow-up prompt** by default. Any privileged action (write, send, delete, network) requires explicit user confirmation via a confirmation block and an allow-listed action name. |
| **Tool/action abuse** | Action allow-list only; unknown actions rejected. No automatic action execution from UI. |
| **Prompt injection via UI content** | UI content is data, not instructions. Never feed rendered widget content back as system instructions. |
| **Oversized schema / DoS** | Hard limits: max nodes (e.g. 200), max depth (e.g. 12), max string length, max payload size (e.g. 64 KB), max table rows/cols. Reject beyond limits → Markdown fallback. |
| **Recursive / cyclic UI** | Depth limit + cycle detection in the tree builder. |
| **Regex DoS** | Bound/validate any model-supplied patterns; avoid compiling unbounded regexes. |
| **Third-party iframe content** | Not used in the native approach. If the embeds/iframe fallback is used, keep `allow-scripts` **without** `allow-same-origin` (matches Open WebUI's own embed sandbox, `FullHeightIframe.svelte:41-50`). |
| **Telemetry / data exfil** | Disable OpenUI telemetry (`OPENUI_TELEMETRY_DISABLED=1`, `DO_NOT_TRACK=1`). Never send chat content to external services without consent. |
| **Secret leakage** | No secrets in schemas/prompts/logs. All credentials via env/vault (never hardcoded). |

## Design rules

- **Allow-list, not deny-list.** Components, props, actions, and URL schemes are all explicit allow-lists.
- **No arbitrary code, ever.** Schema in → native component out.
- **Fail safe.** Parse/validate failures degrade to Markdown; never a blank or broken message.
- **Least privilege for actions.** Pure-local interactions need no confirmation; anything with side effects does.
- **Resource bounds** on every dimension of the schema.
- **Server-side and client-side validation** — the Filter validates before emitting; the renderer validates before rendering (defense in depth).

## Reused safety findings from research

- OpenUI: no `eval`/`innerHTML`; whitelist renderer drops unknown components; only `open_url` needs host validation (`research/intelligent-ui/openui`). Disable telemetry.
- A2UI: declarative-only, catalog allow-list, Markdown-without-HTML text, iframes only via sandbox (validates our model).
- Open WebUI's own embeds path is already sandboxed without same-origin; we avoid it in the native path.
