# Intelligent UI — Action Protocol

All component interactions go through one dispatcher (`src/lib/intelligent-ui/actions.ts`).
No component implements its own action handling; no arbitrary code runs.

## Flow

```
component click
 → dispatchAction(action, ctx)
    → validateAction (Zod, allow-list)
    → actionRisk (safe | confirm | forbidden)
    → if confirm: native ConfirmDialog (await approval)
    → execute:
        send_prompt → ctx.sendPrompt (Open WebUI input:prompt:submit channel)
        confirm     → resolves
        select/toggle/set_value → returned to the component (kind: 'state') to apply locally
```

## Allow-list & risk

| Action | Payload | Risk | Behavior |
|---|---|---|---|
| `send_prompt` | `{ prompt: string (≤2000) }` | safe | sends a normal user prompt |
| `select` | `{ value: string }` | safe | component sets selection (durable) |
| `toggle` | `{ value: boolean }` | safe | component sets boolean |
| `set_value` | `{ value: string\|number\|boolean }` | safe | component sets value |
| `confirm` | `{ prompt?: string }` | confirm | native confirmation, then proceed |
| `tool` | `{ tool, args }` | confirm | **architected, not exposed in M4** |
| anything else | — | forbidden | rejected |

## Guarantees

- Model-generated payloads are validated; unknown/invalid → rejected (safe fallback UI).
- `send_prompt` is visible (it becomes a user message) and respects the current conversation and
  Intelligent UI mode. It cannot silently call tools.
- Privileged actions require explicit confirmation via the existing `ConfirmDialog`.
- No arbitrary JavaScript, event-handler strings, URLs, or function names.
- The dispatcher is the single choke point; future tools plug in here with risk = confirm.

## Where actions come from

Actions are optional fields on components (`action`), emitted by the model and validated by the
catalog Zod schema. `Comparison` also supports `selectable` for item selection.

## Reusing Open WebUI primitives

- Prompt submission: the existing same-origin `input:prompt:submit` window message
  (`Chat.svelte` `onMessageHandler`).
- Confirmation: `common/ConfirmDialog.svelte`.
