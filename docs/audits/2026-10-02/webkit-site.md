# WebKit and mobile site follow-up — 2026-10-02

## Verdict

The six legacy export download timeouts are a **real cross-browser interaction bug**, not a demonstrated environment limitation. The two mobile docs font-floor failures are a **real responsive framing defect**, not a WebKit-only rendering discrepancy and not a false contrast/scale instrument failure.

No implementation files, generated output or reference images were changed.

## WK-SITE-01 — Export menu closes before Safari can activate its action (P1)

**Location:** `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/site/src/components/ExportMenu.tsx:31–33`.

| Before                                                                                                                                                           | After                                                                                                                                                                                                                                                             | Why                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A bubbling blur with any non-descendant relatedTarget synchronously sets `details.open = false`, including blur produced while clicking a menu action in Safari. | Use a robust controlled menu/popover primitive with pointer-aware dismissal and focus management, or explicitly distinguish an in-menu pointer sequence from a genuine focus departure. Execute a menu action exactly once, then close and restore trigger focus. | Safari's pointer focus behavior differs from Chromium: clicking the menu button can blur the summary toward the enclosing main element before the button's click is dispatched. Closing removes the action's hit area before activation. |

### Failing tests explained

Each of these fails on desktop WebKit and the mobile WebKit project, producing six failures total:

1. `tests/e2e/docs-react.e2e.ts:109` — Download SVG.
2. `tests/e2e/light-theme.e2e.ts` — Download SVG.
3. `tests/e2e/playground.e2e.ts:65` — stops on the **first Download JSON** action, before SVG or PNG are even attempted.

All use the same legacy ExportMenu, rather than demonstrating six independent encoding or font failures.

### Executed diagnostic

Launched a separate Playwright WebKit context against the existing production preview at `http://127.0.0.1:4173/?only=example-flowchart`. Added read-only capture listeners that logged pointer/focus/click event targets; no event was prevented and no app handler was replaced.

Observed sequence:

```text
pointerdown path (export trigger)
focusin SUMMARY
pointerup path
click path
pointerdown BUTTON Download JSON
focusout SUMMARY; relatedTarget MAIN
```

No pointerup/click was delivered to the Download JSON button. After two seconds:

```text
details.open = false
export action status = empty
no download event
page URL unchanged
```

The existing trace snapshots likewise have an empty action status rather than Completed or a caught action error. Font requests in all inspected traces returned 200/304; there is no traced font-network failure explaining these timeouts.

### Capability counterexample: downloads work in the same engine

In the same page and browser family, focused each visible menu action and pressed Enter instead of clicking it. All three downloads succeeded with `download.failure() === null` on **desktop Safari project settings and iPhone 13 WebKit project settings**:

```text
desktop Download JSON: example-flowchart.json, failure null
desktop Download SVG:  example-flowchart.svg,  failure null
desktop Download PNG:  example-flowchart.png,  failure null
mobile Download JSON:  example-flowchart.json, failure null
mobile Download SVG:   example-flowchart.svg,  failure null
mobile Download PNG:   example-flowchart.png,  failure null
```

Log: `/tmp/aesthc-audit-20261002/webkit-download-diagnostic.log`.

This demonstrates that the same engine can generate/download JSON, embedded-font SVG and PNG; the failing pointer path does not reach those operations. Do not solve this by skipping WebKit downloads, extending the timeout, forcing clicks, or attributing it to macOS download restrictions.

### Required regression checks

- Real pointer click/tap must download JSON, SVG and PNG on both WebKit projects; do not replace the product test with programmatic click or keyboard-only interaction.
- Keyboard Arrow/Home/End, Enter and Escape remain operable.
- Outside pointer/focus dismissal works, actions run exactly once, and focus returns to the trigger only after action/dismissal.
- Delayed font fetch and rejected action show truthful progress/error without prematurely dismissing the click target.
- Re-run the original six failing scenarios, not only the diagnostic.

## WK-SITE-02 — Swimlane docs preview falls below the agreed label floor at 390px (P2)

**Locations:**

- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/site/docs/docs.css:968–970`: mobile documentation outer padding 20px each side.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/site/docs/docs.css:1028–1029`: preview inner padding 12px each side.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/scripts/render-doc-previews.tsx:16–45`: fitted preview uses generated useful bounds.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/canvas/bounds.ts:51–59`: framing adds 32 user units on each side.
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/tests/e2e/docs.e2e.ts:247–272`: current font-floor assertion.

### Exact failing type and geometry

The failing document is `/docs/diagrams/swimlane/`, not the first diagram in the matrix. The affected primary label is **Request**, declared 14.5px.

At iPhone 13's 390px viewport:

```text
article width                         350px = 390 - 2×20
preview outer width                   350px
preview interior after 1px borders    348px
SVG available width                   324px = 348 - 2×12
viewBox                               -32 24 446 192
SVG rendered size                     324 × 139.46875px
actual getScreenCTM scale             0.7263997395833334
effective primary label size          10.532796223958334px
```

Existing width-only assertion reports 10.533632286995516px. The small difference from CTM is rounding from the auto height/meet scale. **Both are below 11px**, so this particular failure is not caused by the instrument. Nonetheless the canonical check should use getScreenCTM to avoid future height-constrained false approvals.

### Browser-independent controlled measurements

Both engines were measured at explicit widths, using the same built page:

| Requested viewport | WebKit label size (CTM) | Chromium label size (CTM) |
| ------------------ | ----------------------: | ------------------------: |
| 360px              |              9.558105px |                9.558105px |
| 390px              |             10.532796px |               10.532796px |
| 412px              |             11.247884px |               11.247884px |

The regular Pixel 7 project uses **412px**, while iPhone 13 uses **390px**. Its passing result therefore does not establish compliance at the smaller mobile width. Raw measurements: `/tmp/aesthc-audit-20261002/mobile-docs-geometry.json`.

One incidental observation is that Chromium configured at 360px reported `window.innerWidth === 376` while its SVG width remained 294px; that potential overflow was not root-caused here and is not presented as a confirmed independent finding.

### Isolated re-run

Executed the existing tests serially, without a concurrent build:

```sh
PLAYWRIGHT_PORT=43946 pnpm exec playwright test tests/e2e/docs.e2e.ts \
  --project=mobile --workers=1 --grep 'layout previews preserve' \
  --reporter=list --output=/tmp/aesthc-audit-20261002/mobile-docs-recheck
```

Result: **2 failed**, light and dark, both at the same 10.533632px assertion.

Log: `/tmp/aesthc-audit-20261002/mobile-docs-recheck.log`.

### Solution

| Before                                                                                                        | After                                                                                                                                                                 | Why                                                                          |
| ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| The widest compact preview has 446 user units but receives only 324 CSS pixels after nested padding at 390px. | Design per-type responsive framing/padding so meaningful labels retain the agreed floor without cropping semantic geometry or introducing internal horizontal scroll. | A nominal 14.5px SVG font does not imply readable 14.5px output once fitted. |
| Device project names implicitly stand for mobile widths.                                                      | Add an explicit width matrix, including 360 and 390, to both engine families; assert the actual CTM-effective size of every primary label.                            | Pixel 7's 412px width hides this issue.                                      |

Reducing the swimlane preview's horizontal padding from 12px to 4px would yield 340 available pixels at 390px and about 11.05px primary labels. That is only a narrow 390px remedy, **not** a complete 360px solution. For 360px, combine a smaller decorative inset/frame (without cropping borders/labels), more efficient preview allocation, or adjusted typography/layout. Do not globally shrink the library's layout constants to make one docs thumbnail pass.

Retain acceptance for opaque surfaces, structure contrast, node containment, zero horizontal clipping and useful relationship examples; a higher nominal font is not enough if it then overlaps cards or lanes.

## Key Learnings:

1. Safari can blur a summary to an outer focusable main while a menu action is being clicked; synchronous blur dismissal can prevent the action entirely.
2. Download-event timeouts do not imply unavailable download capability: a keyboard counterexample isolated this menu interaction bug.
3. Browser comparisons must use matching CSS viewport widths; 390px and 412px can produce different legibility outcomes with identical engines and CSS.
