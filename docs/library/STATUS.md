# Read-only Library — implementation and verification

## Scope and branch

Branch **`feat/read-only-library`**, independently based on merged M9.11
**`110008de661a78065eed02e1c2bb0237d3bad424`** (`intelligent-ui-foundation`). PR #2
(`feat/intelligent-ui-m9-12`) remains open and is not included or merged. This prevents the Library
from depending on the separate local-state/evaluation-preparation PR.

Open WebUI 0.12.3, pinned lang-core 1.0.1, Intelligent UI catalog v4 unchanged. No model/API
benchmark calls, dependencies, database changes, mutations or new backend endpoints.

## Delivered

- Discoverable `/library` page inside authenticated native app navigation (expanded/mobile and
  collapsed desktop), English + Norwegian labels, native light/dark surfaces and responsive rows.
- Existing Files metadata across chats: paginated list and server-side filename search, loaded-file
  type filters and sorting. The page explicitly labels the loaded-only semantics, rather than
  claiming type filters cover unseen pages. Upstream administrator bypass policy is preserved.
- Explicit read-only preview click fetches the **actual authorized original bytes**, not invented
  URLs: raster images, browser-supported video/audio, PDFs using native PDFViewer, and escaped text.
- Safe loading/empty/error/unsupported states, retry, close/Escape and restored keyboard focus.
- Original-byte requests use bearer auth in headers, validated ids, known API paths, redirects
  disabled, abort on close/supersession, 30-second deadline and 20 MiB **actual streamed-byte** cap.
  Blob URLs are revoked; plaintext display is limited to 100,000 characters. Uploaded HTML/SVG/XML
  is displayed only as escaped text — never executed through the chat renderer. External metadata
  URLs and original server paths are ignored.

Server-state design was reviewed first; see `SERVER_STATE_REVIEW.md`. The known variable-context,
whole-object lost-update and sharing/privacy risks remain blockers to enabling cross-device sync,
not reasons to duplicate storage or force a migration. No server synchronization is enabled here.

## Reuse / upstream impact

Reuse native Modal (focus trap/Escape), Spinner, PDFViewer, file icons and file-size formatting.
The existing FilesModal contains destructive controls; FileItemModal renders uploaded Markdown
through the chat renderer and logs the selected item. A small explicit read-only preview is
justified to avoid those behaviors. Design-before-implementation and reuse evidence: `DESIGN.md`.

Upstream core impact: one import and two link placements in `layout/Sidebar.svelte`, plus two
locale dictionaries. All behavior is in isolated `lib/library/`, `components/library/` and the new
route. Existing Files/RAG/chat/Intelligent UI rendering and feature-OFF behavior are unchanged.

## Verified results

- **195 Vitest tests passed**, including **20 new Library tests**: pagination/envelope handling,
  auth headers, abort/redirect policy, validated ids, metadata isolation, MIME policy, no mutation
  methods, empty vs denied/server/malformed cases and actual-byte caps (not just declared size).
  Counts use this branch's M9.11 base, not the unmerged PR #2 branch.
- **53 Intelligent UI pytest passed**, two existing deprecation warnings.
- **Production build passed**, generated prompt has no drift; dependencies/prompts/schemas unchanged.
- Focused new-file Svelte/TS check: **0 errors and 0 warnings**. Repository-wide existing baseline
  remains **5,712 errors / 190 warnings / 315 files**; that global check is not a passing check.
- **Real application Playwright: 30 checks passed**, **0 unexpected browser errors**, **0 model
  calls**. Used two freshly created non-admin accounts and synthetic files only; fixture files and
  accounts deleted in teardown. Actual private file metadata and bytes were denied across users
  (404); unauthenticated requests were denied (401); listing did not leak the other user's file.
- Real original-byte/image decode, **actual video/audio playback**, PDF page rendering, escaped
  HTML, real 50+ pagination, loaded type filter, search, native Modal Escape/focus return, dark/light,
  Norwegian mobile and page-overflow checks. Explicitly separate **fault injection**: a 503 list
  response, a removed file and a real no-match 404 search produced three expected browser resource
  error messages; they are not unexpected failures or mocked normal-flow coverage.

Run QA against local app:

```bash
# From audit/; provide PAW_TEST_TOKEN for a local test administrator, or use the existing
# local cached /tmp/token. The script never prints credentials or model calls.
node lib/library-browser.mjs
```

The script needs installed Playwright Chromium and system `ffmpeg` solely to generate a tiny
synthetic video fixture. Neither is a new application dependency. No paid provider is involved.

## Visual review

Seven captures in `audit/local/library-first-slice/`: real empty, image/PDF preview, populated
desktop dark/light, populated Norwegian mobile and recoverable list error. All data synthetic.
Inspected the screenshots; fixed the initial mobile-loading capture and unnecessary upscaling of a
tiny image, and widened sort controls so text is not clipped. Recaptured and retested.

This is a **new route**, so no prior like-for-like route baseline/similarity percentage exists;
do not manufacture a pixel-regression score. The inspected native files/modal patterns are the
visual reference. These captures form the first route baselines.

## Intentional limitations / next slice

- Read-only: no upload/delete/rename/move or automatic AI interpretation. Existing Chat uploads
  remain the entry point. Files already attached to Knowledge continue using existing permissions.
- Type filtering and sorting apply to loaded files. Filename search is paginated server-side.
  Offset pagination can shift under concurrent uploads; Refresh is the recovery path, not a new
  parallel search index.
- Maximum preview is 20 MiB; Office archive formats and unsupported codecs show an unavailable
  preview. No fake conversion or caption generation; video previews explicitly disclose absent
  caption files. File malware/content scanning is not implemented or claimed.
- Existing authorized file listing primarily covers the current owner (and configured admin
  behavior); this is not a new cross-user sharing/search permission system.
- Cross-device UI state, paid model evaluation and PR #2 approval remain separate decisions.

Recommended next useful product slice after review: **image-grid view over the same real Files
records**, then an allow-listed Gallery binding that uses those authorized ids. Reuse this preview
and authorization boundary; add no image-search integration or duplicate file store.
