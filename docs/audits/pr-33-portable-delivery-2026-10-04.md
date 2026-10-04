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
4. Firefox cancellation tests used Chromium's hard-coded mouse pointer ID. The harness now observes and cancels the actual pointer; all 19 Linux Firefox drag/grid cases passed without runtime relaxations.
5. Canvas 2D unavailability could incorrectly claim embedded measurement while estimating widths. Missing or throwing contexts now fail required preparation and report explicit fallback, before allocating font declarations.
6. A light authored document could make the site Viewer white under the global dark preference. A read-only appearance projection now keeps the display and visual exports aligned while downloaded JSON retains the untouched authored light mode.
7. Recording cancellation tests expected the old raw diagnostic; the shared dialog presents a localized cancellation message. The test now asserts that message and still verifies ended tracks and no download.

## Acceptance status

- **Completed implementation:** portable typography, read-only Viewer dialog integration, representative gallery, focused interaction corrections and cross-surface visual fixes.
- **Completed local visual review:** browser inspection of landing/gallery, docs, Playground, Studio, Viewer and shared dialog; individually inspected DPR1 references and all twelve DPR2 representative captures in EN/ES and light/dark. The earlier native Viewer controls, arrow disclosure and stretched gallery bodies were corrected rather than accepted as baselines.
- **Excluded:** D01. Existing constrained mobile Playground allocation is not represented as a completed redesign.
- **Final certification:** the exact final SHA, browser matrix and reference job results are recorded in PR #33. Merge remains conditional on all final-head jobs passing; no earlier job is substituted.

## Executed local evidence

- Node 22 `pnpm check`: **516 unit, 2 isolated performance, 34 package tests**, generated schemas/docs, type checks, builds and unchanged budgets passed.
- Vite/Next consumer builds, hydration, styles, keyboard selection and editor commit/undo passed.
- Focused Chromium/WebKit/mobile portable-font, dialog and export-failure suite: **45 passed**. Includes offline JS-on/off exact node geometry, concurrent different font bytes with a conflicting host family, one face failing and delayed-font abort cleanup.
- Actual PNG/WebM codec suite: **10 passed**, including nonuniform decoded image/final-frame content, bounded dimensions/duration, ended recorder tracks and no camera/microphone access.
- Gallery/style suite: **19 passed**, including four explicit DPR2 cases; all primary labels are at least 11 CSS px and complete relationships remain inside their stage at four widths.
- Darwin visual comparisons: **4/4 passed**. Only six ER/Sequence/Swimlane gallery references changed, with each reviewed individually. Hero/docs references remained unchanged. Corresponding six Linux references were captured in Playwright amd64 v1.63.0 and individually reviewed; Linux comparison results and Firefox gesture checks are recorded in the PR.
- The complete local matrix initially produced **948 passed / 122 skipped / 2 failed**: both failures were Safari export-invoker focus. The runtime correction and affected Chromium/WebKit/mobile gesture/dialog suite were re-executed; the exact final full matrix belongs to CI certification, not this historical result.

## Compatibility and review limits

Synchronous card/HTML helpers retain legacy measurement semantics. Fallback warnings explicitly deny exact-font fidelity. JSON is font-independent. Capability/permission-dependent skips remain documented; native Darwin Firefox cannot launch, so Linux browser certification is authoritative. No npm publication, tag or release was performed.

## Key Learnings

1. A read-only export component can still inherit a hidden styling dependency on the editor even after its TypeScript imports are separated.
2. Font bytes alone do not prove exact typography: geometry must be resolved after both prepared faces load.
3. Drag and pan regressions require validating the test's viewport and page-scroll assumptions before changing application behavior.
