---
name: chatgpt-reference-audit
description: Inspect ChatGPT live as a functional and UX reference for Personal AI Workspace. Use when auditing interaction patterns, information architecture, flows, empty/loading/error states, or when comparing our implementation against ChatGPT behavior.
---

# ChatGPT Reference Audit

ChatGPT is the **functional / UX / information-architecture reference**. Open WebUI
remains the **visual foundation**. The target is "ChatGPT-quality functionality and UX
expressed through Open WebUI's visual language."

## Rules

- **Inspect the live product**; do not assume behavior from memory. Use the persistent,
  logged-in browser profile (`.local/browser-profiles/chatgpt`) via
  `scripts/audit/open-chatgpt` + `scripts/audit/capture-chatgpt`.
- **Use screenshots** for every claim; capture desktop and mobile viewports.
- **Record interaction states**: hover, active, focus, disabled, loading, empty, error.
- **Distinguish function from visual skin.** Copy the *behavior/flow*, never the *branding*.
- **Do not copy ChatGPT branding**, logos, colors, or proprietary assets.

## Method

1. Open ChatGPT headed (`./scripts/audit/open-chatgpt`) and log in once.
2. Navigate the flow under audit; capture screenshots + a trace per state
   (`./scripts/audit/capture-page --target chatgpt --url <url>`).
3. Write down the **functional contract**: what happens, in what order, with what states.
4. Compare with our implementation and upstream Open WebUI (three-way: A/B/C).
5. Produce an action list expressed as Open WebUI-native design, not ChatGPT mimicry.

## Output

A comparison with: observed ChatGPT behavior · our current behavior · gap · proposed
Open-WebUI-native target. Store captures under `audit/chatgpt/` and diffs under `audit/diffs/`.
