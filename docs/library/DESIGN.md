# Read-only Library — first useful slice (Open WebUI 0.12.3)

## Design before implementation

Route `/library`, inside the existing authenticated Open WebUI shell. Header: sidebar toggle,
"Library", short explanation that these are existing uploaded files. Toolbar: filename search,
type filter (All / Images / Videos / Documents / Audio / Other), sort (newest / name), Refresh.
Body: restrained native file rows (existing FileTypeIcon, filename, type, size, date), 44px minimum
targets. Clicking a row opens the existing Modal with a read-only preview. Mobile wraps the
toolbar and keeps the row name inside a shrinking column; no horizontal page scroll. Light/dark
use existing gray surfaces, borders and rounded-xl controls, not another design system.

Loading: Spinner + status. Empty: "No files yet" (uploads happen in Chat). Search/filter empty:
no matches in loaded results. Errors: calm safe message and Retry. The metadata list endpoint owns
its page size; the client derives "more" from the server total and the rows it has already
consumed, never from an assumed page size. The filename search endpoint honours the client's own
`skip`/`limit`. Type filters and sort apply to **loaded results**, explicitly labeled. Filename
search uses the existing paginated server filename search (wildcards supported by that API). Do not
imply that a local type filter scans all unloaded pages.

## Reuse evidence

Inspected `layout/FilesModal.svelte`, `common/FileItemModal.svelte`, `common/Modal.svelte`,
`common/PDFViewer.svelte`, `common/Spinner.svelte`, `chat/FileNav/FileTypeIcon.svelte`, native
Notes page layout and sidebar patterns. Storybook is not running/configured for Svelte here.

- Existing FilesModal has deletion controls and is not a persistent cross-chat Library page.
- Existing FileItemModal can render uploaded Markdown through the chat renderer and logs the
  selected item on mount. It also fetches some media via implicit cookies rather than an explicit
  bearer request. A tiny read-only preview composition is justified here: reuse Modal, Spinner,
  PDFViewer and FileTypeIcon, but authenticate original-byte fetches explicitly and show text as
  escaped text, never uploaded HTML/Intelligent UI/actions.
- No new button/modal/menu primitive, packages, file store, backend index, mutation endpoint or
  model call. Sidebar changes are limited to a link in expanded and collapsed navigation, rendered
  with the native nav item markup (active/high-contrast state, app text scaling, drag and click
  handling) and the native page shell (width transition and scroll container).

## Security and boundaries

Metadata from existing authenticated `GET /files/?page=N&content=false` and
`GET /files/search?...&content=false`; content only on an explicit preview click via
`GET /files/{id}/content`. Existing backend ownership/read permissions remain authoritative.
Administrator bypass behavior remains upstream policy, not redefined by the Library.

Never trust `file.path`, `meta.url`, filename or extension as a fetch URL. Derive paths only from
a validated id + known API base. Follow no redirects on authorized preview-byte requests, and
never place bearer tokens in a URL. Render only supported content types from the response:
raster images, video/audio, PDF through native PDFViewer, or escaped bounded text. HTML/SVG/XML
are not embedded as active documents. Unsupported types get a clear unavailable state.

Bound previews to 20 MiB actual bytes (not only metadata/Content-Length); abort superseded or
closed requests and revoke blob URLs. No eager content fetch for every row. No delete, rename,
upload, chat, tool, transcription or side-effect controls on this page. PDF/office transformation
and broad intelligent Gallery behavior are later work; this first page uses real files.
