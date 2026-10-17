# M9.12 — interaction persistence: design and security review

## Decision

Ship only a **local, privacy-filtered first slice**. Cross-device synchronization is designed below
but **not enabled**. No database/schema change, server endpoint, chat-variable write, or prompt
change is part of this PR. A prototype proved cross-device transport works; review found reasons
not to ship that implementation. Browser transport success was not evidence of safe persistence.

## Existing infrastructure inspected

- `Chat.svelte::saveChatVariables` calls `updateChatById(token, chatId, {}, chatVariables)`.
- `routers/chats.py::update_chat_by_id` owner-checks before updating.
- `models/chats.py::update_chat_by_id` patches chat keys and merges message history.
- `models/chats.py::update_chat_variables_by_id` **replaces the entire variable object**.
- `Chat.svelte` can send `chat_variables` in generation requests. These are model context, not
  private UI storage. A fresh read followed by replacement still has a lost-update race.

Therefore a `variables.intelligentUi` namespace is **rejected**: it can expose input to the model,
overwrite concurrent changes, and cannot provide reliable multi-device conflict handling.

## Implemented slice

`interaction-state.ts`, used by `IntelligentUIBlock.svelte`:

- Keys contain authenticated user id, chat id, block id, and SHA-256 of the exact OpenUI program.
  A different chat/block/account/program cannot restore the entry. Changes/regeneration invalidate
  old values even if the message id is reused. The raw program is not stored in the key.
- Persist only finite, in-range **Slider** numbers; **Switch/Checkbox** booleans; **Select/Radio**
  values matching current catalog options; and a valid **Comparison** selection.
- **Input/Textarea, arbitrary runtime variables, query results and mutation results are excluded**.
  No automatic free-text persistence. Non-text controls may still represent personal choices;
  storage stays on the device, and is not an authorization boundary against someone controlling
  that same browser profile.
- Revalidate on save **and** restore; 4 KiB maximum per entry, 32 entries, 30-day expiry. Storage
  failure is a silent in-memory fallback. Eviction affects only our namespace.
- Only explicit user actions save; partial-stream interaction remains in memory and wins at
  finalization. An asynchronous hash/restore cannot overwrite newer user input, an unmounted
  block, or another conversation/runtime. No replay of side effects.
- Temporary chats remain memory-only for this new persistence path. Old unscoped localStorage
  entries are not automatically imported: their user/program ownership cannot be established.
- Completed historical programs still parse unchanged; no migration. Reload now restores eligible
  controls, while typed fields intentionally reset. A fresh device intentionally starts at defaults.

## Proposed server slice (not implemented; review before activation)

1. Reuse the **existing chat JSON/output metadata storage** without introducing a parallel runtime.
   Keep UI state separate from model chat variables and prompt construction.
2. A narrow owner-only API must atomically patch one message/block under the existing chat
   transaction/lock, rechecking ownership inside the transaction; never replace history or an
   entire variables object. Reject shared/read-only/temporary/deleted chats.
3. Bind identity to user + chat + message + fence/program digest, with explicit revision/CAS.
   Serialize writes per block, debounce updates, and surface conflicts. An old tab must not silently
   overwrite a newer device's revision. Timestamp alone is not concurrency control.
4. Validate both client/server: finite numbers/booleans/enumerated choices, byte/node bounds,
   declared binding names. Keep text opt-in behind a separately reviewed privacy policy.
5. Define sharing/export/fork semantics before implementation: do not accidentally expose private
   input through normal chat read/share/export paths. Regeneration and chat deletion must revoke
   old program revisions. Default should not transfer private interaction state when sharing.
6. Test two real users (read/write denial), two devices, concurrent writes, interrupted saves,
   sharing/export, regeneration, reload and logout. Only then enable cross-device sync.

The existing storage and auth can be reused; whether all sharing paths permit safely embedding
private UI state without a dedicated store remains an **open design question**, not a completed
security guarantee. No broad migration is authorized by this PR.
