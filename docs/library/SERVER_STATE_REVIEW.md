# Server-state design review before Library work

PR #2 remains open; this branch does not merge or alter it. Its local-control slice is not a
cross-device implementation. Review covered `models/chats.py`, `routers/chats.py`,
`Chat.svelte` variable submission and the design in PR #2.

## Verified blockers to activating the old prototype

1. Chat variables can enter model context. They are not private UI storage.
2. `update_chat_variables_by_id` replaces the entire object. Client read-merge-write does not
   solve lost updates from two devices or concurrent model-variable edits.
3. Storing UI values in chat JSON/meta/output without reviewing all shared/export/fork paths
   can disclose input to another reader. Owner-checking only a new write endpoint is insufficient.

These risks are closed for the delivered code by **keeping server sync disabled**, not by claiming
that transport tests prove confidentiality or atomicity. No server-state mutation is added here.

## Required implementation contract for a later server slice

- Owner-only read/write with ownership rechecked inside the transaction. No read-only share users,
  temporary chat ids, or admin ownership bypass by default.
- Message + block + exact program digest binding; regeneration invalidates old revisions.
- Atomic per-block patch under the existing chat transaction and revision/CAS. Return conflict
  (409), never silently overwrite a newer device revision. Serialize/debounce writes per block.
- Server-validated finite slider/boolean/enumerated values; bounded bytes/blocks. No automatic
  Input/Textarea persistence, no query results and no model-generated privileged operations.
- Keep private state out of prompt assembly and strip/isolate it on shared reads, exports, forks
  and bulk-chat endpoints. Choose the final storage field only after those paths are covered.
- Tests with two real users, two devices and concurrent writes; deletion/logout/cancellation and
  expired token tests. No migration or broad persistence redesign without review.

The design can reuse existing authentication, chat transactions and APIs internally. Whether a
new isolated store is necessary is still open; no unsafe "reuse" is assumed to be safe merely
because a JSON field exists. The independent Library slice below can proceed without that decision.
