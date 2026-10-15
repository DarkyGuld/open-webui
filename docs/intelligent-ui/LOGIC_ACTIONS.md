# Intelligent UI — Local Declarative Actions (@Set / @Reset)

Implemented in **Milestone 9.2 (Phase A)**. Zero new dependencies. Built entirely on
`@openuidev/lang-core` (no parallel action engine).

## Syntax (OpenUI Lang)

A component's action prop carries a `@`-action. Buttons take the action as the second argument:

```
$seats = 8
root = Stack([row1, m1])
row1 = Row([b10, b20, br])
b10 = Button("10 seats", @Set($seats, 10))
b20 = Button("20 seats", @Set($seats, 20))
br  = Button("Reset", @Reset($seats))
m1  = Metric("Monthly price", total, "Incl. VAT")
total = $seats * 29
```

Multiple actions: `Action([@Set($x, 1), @ToAssistant("done")])`.

## How it works (lang-core, wrapped through our adapter)

1. `parser.parse` → the action prop becomes a lang-core **`ActionStep`**:
   `{ type:'set', target:'$seats', valueAST:{k:'Num', v:10} }` (or `{type:'reset', targets:[…]}`,
   `{type:'continue_conversation', message}`, `{type:'open_url', url}`).
2. `engines/openui.ts` **normalizes** each step into a safe, serializable `OpenUIAction`
   (allow-list: `set`, `reset`, `send_prompt`, `open_url`; `@Run` dropped here). The `set` value is
   evaluated with lang-core's `evaluate(valueAST, ctx)`.
3. `IntelligentUIBlock` dispatches via `handleOpenUIAction`:
   - `set` → `runtime.setState(target, value)` (store)
   - `reset` → `runtime.resetState(targets)` (restores declared defaults)
   - `send_prompt` → Open WebUI's `input:prompt:submit` channel (visible user message)
   - `open_url` → native confirmation, then `window.open(..., 'noopener')`
4. Store change → `store.subscribe` → `evaluateElementProps` → re-render. **No model call.**

## Guarantees

- **No model call / no server call** for local actions.
- **No arbitrary JS / object mutation** — only the allow-listed step types run, against the store.
- Unknown/forbidden actions are dropped (not executed).
- Reactive re-evaluation: derived expressions (`total = $seats * 29`) and ternaries update.
- Existing durable-state policy (M4) is respected (inputs persist; hover/animation never).

## Verified (Playwright)

Pricing calculator: `8 → 232`; `10 → 290`; `20 → 580`; `50 → 1450`; `Reset → 232`. 0 errors.

Screenshots: `audit/local/intelligent-ui/tool-bindings/01-set-before.png`, `02-set-after.png`,
`03-reset.png`.

## Limitations

- `@Run` (query/mutation) is not executed yet (Phase B).
- `@Set` with a non-literal expression is evaluated at render time (current value), not deferred to
  click time; literal values (the common case) behave identically.
