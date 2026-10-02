# WebKit interaction failure triage — 2026-10-02

Read-only investigation of `/tmp/aesthc-audit-20261002/webkit.log` and retained traces, followed by an isolated WebKit diagnostic against a production preview on port 43944. No implementation, tests, build output or baselines modified. Temporary runtime CSS injection was used only to isolate the overflow cause; it was not applied to repository files.

## Classification

| Failure                                                                    | Classification                                                                                          | Exact evidence                                                                                                                                                                                                                                                                                                                                          | Fix                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop WebKit `editor-grid.e2e.ts:193`, dots `(10,6)` vs geometry `(5,3)` | **Test instrumentation bug: device pixels compared to CSS pixels**. Not evidence of renewed double-pan. | Trace context `deviceScaleFactor:2`; screenshot requested clip40×40 CSS; PNG header is80×80. `dotShift` reads original bitmap dimensions and returns10×6 device pixels. Geometry bounds and projected spacing are CSS pixels. 10/2=5 and6/2=3, exactly expected.                                                                                        | Request `page.screenshot({clip,scale:'css',...})`, or normalize both bitmap displacement and periodic spacing into one unit. Exercise DPR1/2/3 and fail the deliberately double-transformed case. Do not loosen the 1.5px tolerance or change renderer geometry.                                                                                                                |
| Desktop/mobile WebKit T44.2 keys outside canvas                            | **Test assumption/native browser navigation**, not node deletion or locale change.                      | Trace and fresh diagnostic show Delete leaves the Studio URL, `lang:'en'`, and all four authored node IDs intact. Backspace on the focused Language select navigates to `about:blank`; subsequent Ctrl/Meta keys and node assertion execute on the blank page. Both failure screenshots are blank.                                                      | Test editor interception independently of browser-history defaults. Use a non-mutating external textbox for Delete/Backspace, or isolate keys and explicitly model permitted browser navigation. Keep independent checks for language/select focus. Do not globally prevent Backspace outside canvas to make the test green: that would violate the intended no-hijacking rule. |
| Mobile WebKit T44.2 CSS200%                                                | **Real responsive overflow under the actual test's CSS-zoom conditions**. Not a DPR mismatch.           | Fresh iPhone13: before root scrollWidth390; after body `zoom:200%`, root scrollWidth671 while innerWidth390. Camera group reaches right489.359, Selection actions reaches right671.438. Both inline-flex groups use `flex:0 0 auto`, `flex-wrap:nowrap`, overflow visible. Browser-only wrapping/shrink/max-width override returns root scrollWidth390. | Make toolbar groups wrap/reflow inside their available inline size (or move secondary actions into bounded menus); preserve discoverability and click targets. Add a real browser-zoom/reflow test if the claim is page-zoom support, because the current harness applies CSS zoom, not Safari pinch zoom.                                                                      |

## Sources and trace details

### Grid

- Source: `tests/e2e/editor-grid.e2e.ts:25–34` draws `image.width/image.height` bitmap directly into a canvas; `:177,188` screenshots omit `scale:'css'`; `:189–193` compares bitmap shift against CSS bounds delta.
- `playwright.config.ts` uses Playwright's Desktop Safari preset, DPR2.
- Trace: `webkit-artifacts/editor-grid.e2e.ts-grid-co-8a78d-nd-reacts-to-pan-and-resize-webkit/trace.zip`.
- `call@897`, `call@919`: clip `{x:657,y:276,width:40,height:40}`. Both decoded PNGs80×80.
- `call@921` result: sx10, sy6, cost0.06023166, matched10/6.
- Expected arg is `{x:5,y:3}`; projected spacing18.41176470588235 CSS px.
- DOM preconditions passed: one grid, no scene grid, no patternTransform, all four coverage edges0.

The test's modulus reconciliation also needs consistent device/CSS units, not just division of the final number. Prefer CSS-scaled screenshots so the complete correlation algorithm remains in its documented unit.

### Outside-canvas shortcuts

- Source: `tests/e2e/editor-accessibility.e2e.ts:58–70` selects Order API, focuses the Language select, then executes Delete, Backspace, Ctrl/Meta+C, Ctrl/Meta+S and asserts the original page still exists.
- Desktop trace calls: focus2026; Delete2028 keeps studio; Backspace2030; next call2032 snapshot `frameUrl:'about:blank'`.
- Mobile: focus260; Delete262 keeps studio; Backspace264; next call266 snapshot `frameUrl:'about:blank'`.
- Fresh diagnostic repeats on both presets and samples after each key (150ms): Delete nodes `[client,api,database,worker]`, en; Backspace URL about:blank, no nodes and empty language. This disproves deletion as the explanation. It also disproves the initial locale-switch hypothesis in these exact runs.
- No assertion about the app globally preventing shortcuts is justified by a missing-node locator after native navigation.

### Mobile CSS zoom overflow

- Source cause: `src/editor/styles.css:66–78`: groups `display:inline-flex;flex:0 0 auto`, children also `flex:0 0 auto;white-space:nowrap`. Parent toolbar can wrap _groups_, but an individual group cannot fit the 195CSS-pixel content space at body zoom2 on a390px viewport.
- Root trace attachment has innerWidth390, scrollWidth671, toolbar width390 but scrollWidth336 (layout coordinate units; 336×2≈672).
- Fresh diagnostic group bounds:
  - Camera x32, width457.359, right489.359.
  - Selection actions x32, width639.438, right671.438.
  - More actions x465.953, width205.484, right671.438.
- Temporary diagnostic override: `.adl-editor-group{flex-wrap:wrap;flex-shrink:1;max-width:100%}`; root scrollWidth drops to390. This isolates the toolbar group as root cause, not the SVG or JSON content.
- The exact CSS override is a proof, not a finalized design recommendation: a premium implementation should tune group wrapping, separation, and secondary actions instead of blindly applying it globally.
- Current test labels this "page zoom", but code at `editor-accessibility.e2e.ts:76` sets `document.body.style.zoom='200%'`. Distinguish this test's valid narrow-width overflow evidence from unexecuted native Safari pinch/page zoom behavior.

## Retained additional evidence

- `/tmp/aesthc-audit-20261002/webkit-diagnostic.mjs`: diagnostic script.
- `/tmp/aesthc-audit-20261002/webkit-diagnostic.json`: per-key URL/DOM samples, before/after/wrapping metrics.
- `/tmp/aesthc-audit-20261002/mobile200-overflow.png`: unmodified runtime at CSS200%.
- `/tmp/aesthc-audit-20261002/mobile200-wrap-diagnostic.png`: same runtime with temporary in-page wrap diagnostic.

## Verification boundaries

- Original full WebKit+mobile matrix was run by root (335 passed,69 skipped,12 failed). This worker did not rerun that suite and does not change those totals.
- This worker ran fresh isolated diagnostic actions on the two presets, not modified copies of the failing test files.
- Downloads and docs-specific preview failures are outside this follow-up scope.
- No claim of actual native Safari zoom behavior is made.
