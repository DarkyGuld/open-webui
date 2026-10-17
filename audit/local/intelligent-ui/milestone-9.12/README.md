# Capture provenance

Current shipped local-only slice: `01-local-restored-dark.png`, `02-local-light.png`,
`03-local-mobile.png`, captured by `audit/lib/milestone9_12-browser.mjs` against the real app.

`01-calculator-interacted.png`, `02-reload-restored.png`, `03-cross-device-restored.png`,
`04-mobile.png` are **prototype evidence only**. They were produced before security review rejected
the chat-variables-based server sync. They do **not** demonstrate shipped cross-device persistence.
See `docs/intelligent-ui/PERSISTENT_STATE_DESIGN.md`. All fixtures are synthetic.
