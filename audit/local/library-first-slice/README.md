# Read-only Library visual baselines

Synthetic accounts/files only. Created by `audit/lib/library-browser.mjs` against the real local
Open WebUI app (two users, real auth + files APIs, actual image/audio/video/PDF previews).

- 01: empty owner Library, dark.
- 02: raster image preview with native Modal.
- 03: real PDF rendered by native PDFViewer.
- 04/05: populated desktop dark/light.
- 06: populated Norwegian mobile (390×844).
- 07: explicitly injected recoverable 503 list failure.

30 browser checks passed; 0 unexpected console errors. Three expected browser resource errors
occurred in explicit failure cases (503, removed original, search with no matches). No model calls.
New route: there is no pre-existing identical-page pixel baseline; these are the first baselines.
