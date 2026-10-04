# PR #33 portable export delivery — 2026-10-04

This supersedes the remaining-scope list in the October 3 checkpoint, not its historical test evidence. No package publication, tag or release is authorized.

## Delivery boundary

**D01 is excluded, not completed:** mobile Playground workspace reallocation, inspector bottom-sheet and related redesign are outside this delivery. Existing mobile behavior is preserved; any limitation caused by that workspace remains separately scoped.

G02/G04 retain the existing configuration dialog and explicitly documented API-only advanced authoring. This delivery does not claim full visual story, trace or evidence authoring.

## Implemented

- One bounded, abortable portable font preparation path validates WOFF2 signatures and byte limits before resource allocation, registers isolated measurement families, waits for both faces and disposes registrations on every exit. Required policy fails; fallback emits a diagnostic and an honest typography receipt.
- Additive `exportCardSvg` and `exportDocumentHtmlAsync` APIs prepare exact-font geometry. Existing synchronous APIs retain their legacy measurement behavior. Asynchronous cards and WebM accept bytes/policy; generated artifacts carry the same font bytes used for measurement. JSON stays independent.
- Standalone HTML retains readable fallback until embedded fonts and its validated payload are ready. Failed preparation or mount does not conceal the fallback. Existing CSP hashes, offline operation, source policy and frozen custom renderers remain.
- The shared export dialog accepts an immutable source rather than an editor store. Editor consumers have a thin adapter. Viewer callbacks carry exact query receipts and effective appearance into the same service. Query exports are supported only for SVG/cards; unsupported scopes cannot silently become whole-document exports.
- Gallery fixtures demonstrate two ER entities with keys/cardinality, two sequence participants with request/response, and two lanes with a cross-lane handoff. Framing is locale-specific and presentation-only; no global layout engine changes were made. The gallery floor is 11 CSS px at 390/768/1280/1718, measured through each label's screen transform in both themes/locales.
- CI interaction harnesses keep drag/resize trajectories inside the actual viewport and separate toolbar-induced scrolling from grid-pan measurement. No performance budget or failing browser case was suppressed.

## Observed regressions and fixes

1. Real card/PNG encoding failed because raw font license notices contained XML metacharacters. SVG font comments now escape them; actual artifact decoding passes.
2. Moving the dialog into Viewer exposed an implicit dependency on editor CSS: native gray controls and an unstyled dialog frame. Viewer supplies scoped design-system styling without importing the editor bundle.
3. Closing a conditionally mounted dialog could lose focus restoration. Close and restoration now occur before host unmount.
4. Recording cancellation tests expected the old raw diagnostic; the shared dialog presents a localized cancellation message. The test now asserts that message and still verifies ended tracks and no download.

## Executed evidence and outstanding certification

- `pnpm check` passed before the last Viewer styling and caption refinements: 516 unit tests, isolated performance tests, 34 package tests, schemas/docs/types/builds/budgets. Final re-run is required.
- Focused Chromium offline/font/dialog/recording suite: 16 passed. Includes real card PNG and supported WebM decoding, offline HTML with JS on/off, font failure and cancellation cleanup.
- Gallery matrix passed at the 11 px floor in all four widths, both themes and locales.
- Vite/Next consumer builds, hydration, styles, keyboard selection and editor commit/undo passed.
- Complete local matrix and reviewed visual references are in progress. CI certification must refer to the exact final head, not an earlier green performance job.
- No merge is permitted until the agreed scope and final-head CI are complete.

## Key Learnings

1. A read-only export component can still inherit a hidden styling dependency on the editor even after its TypeScript imports are separated.
2. Font bytes alone do not prove exact typography: geometry must be resolved after both prepared faces load.
3. Drag and pan regressions require validating the test's viewport and page-scroll assumptions before changing application behavior.
