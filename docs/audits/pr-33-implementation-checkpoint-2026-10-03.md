# PR #33 implementation checkpoint — 2026-10-03

This is a partial delivery checkpoint, not acceptance of every audit item. Nothing has been merged or published.

## Implemented in this continuation

- Incremental committed SVG baseline patches for changed nodes, edges and labels. Canonical replacement remains the fallback for structural, font, theme and history changes. Untouched entities retain DOM identity during supported commits; committed geometry is still resolved from the committed document.
- Pointer focus preserves page scroll. Continuation/relation capsules use measured, scaled typography.
- Empty gesture batches avoid redundant document validation. Trusted store snapshots avoid repeated validation during JSON display; serialization is scheduled once per committed document rather than restarted inside interruptible rendering. Relation/outline reconciliation is narrowed.
- Export-size advisory measurement runs outside the commit task and includes the instance registry and effective appearance. Actual export retains validation.
- Font readiness and raster encoding waits are bounded and abortable, with cleanup and timeout diagnostics.
- Shared atomic document/layout/palette/selection metadata configuration in Playground and Studio, with revision rejection, invalid-input retention and one undo transaction. Advanced authoring workflows are explicitly identified as API-only and linked to a compilable public example; this is not full visual story/trace/evidence authoring.
- Mobile documentation navigation uses one focus-managed modal. Static no-JavaScript navigation remains available.

## Executed validation

At `0fb4d3c`:

- `pnpm check`: passed, including 508 unit tests, 2 isolated performance tests, 34 package tests, generated schemas/docs, type checks, builds and budgets.
- Affected Chromium, mobile Chromium, WebKit and mobile WebKit matrix: **217 passed, 59 skipped, 0 failed**. Files: docs, docs-react, mobile-doc-navigation, document-configuration, editor-baseline, editor-drag, editor-grid, diagram-labels and export-dialog.
- Browser inspection: centered shared configuration dialog and mobile documentation navigation. No user draft was applied, deleted or replaced during inspection.
- Reference CI at preceding commit `9b100e3`, run `37152871086`: **Reference frame budget passed**. React 18 consumer passed. Contracts/package was still running when this checkpoint was written. This is not certification of the final commit.

Not executed in this continuation: complete local browser matrix, local Firefox, dedicated framework suite, and visual-reference comparisons. No visual baselines were regenerated. CI must certify the exact final head.

## Still open — do not merge as a complete audit delivery

1. **G06:** cards/WebM need explicit portable font-byte/policy preparation; HTML needs exact-font geometry parity. Bounded cancellation is implemented, but does not close typography acceptance.
2. **Viewer export UI:** consolidate the remaining card/WebM controls with the shared export workflow without introducing a mutable viewer store.
3. **D01:** mobile Playground workspace allocation and responsive inspector sheet are not implemented in this continuation.
4. **D03:** restore representative two-entity/two-participant/two-lane gallery examples with readable responsive framing.
5. **D04–D07:** complete final cross-surface visual/interaction acceptance; passing functional tests is not visual acceptance.
6. **G02/G04:** verify the configuration inventory against the full contract; advanced workflows explicitly exposed as API-only must not be described as visual authoring.
7. Inspect the final exact-head CI results, including Firefox gesture regressions and the reference budget, before making the PR ready or merging.

## Key Learnings

1. Advisory UI calculations can violate commit budgets even when the renderer itself is incremental.
2. Deferring a render that serializes a large document can restart expensive work; schedule serialization once per immutable committed snapshot instead.
3. A mobile navigation modal requires a separate static fallback when the documentation promises no-JavaScript navigation.
