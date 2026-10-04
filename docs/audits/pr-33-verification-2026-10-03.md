# PR #33 — independent verification and remaining work

Date: 2026-10-03. Language: English. **Verdict: REQUEST CHANGES. Do not merge yet.**

Audited commit: `fcc5a03be8197bb9493c8aaf73738bd94741cd42`, branch `alanslzrr/audit-2026-10-02`, 57 commits. [PR #33](https://github.com/alanslzrr/aesthc-diagram-lib/pull/33) is open and draft. The implementation tree was clean when inspected. This review adds evidence and instructions only: no implementation edits, reference-image updates, commits, publication or merge.

This supplements the [original full-scope audit](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/docs/audits/full-scope-audit-2026-10-02.md). It does not repeat previously closed findings as if they had never been fixed. In particular, Heyo is mounted; “the shell is still missing” is no longer a valid finding.

## Executive assessment

The delivery has substantial real work behind it. The complete local contract/package gate passes, and the shared export dialog passes its focused WebKit suite. However, the final performance optimization introduced a reproducible **document-to-canvas consistency regression**. Clicking a node and then renaming it can update the document, inspector and outline while leaving the canvas and its interactive label unchanged. Existing resize tests also fail locally. This is not merely a screenshot disagreement.

Custom-renderer portability remains incomplete: standalone HTML contains the custom SVG but hides it during boot, replacing it with an unconfigured Viewer that displays an unavailable-renderer placeholder. There are additional reset/recovery, deployment-profile and export-context defects below.

The report's CI status is outdated. The exact final SHA completed with **both Contracts and package and Reference frame budget failing**. Firefox executed in CI. Local installation problems cannot be used to classify its CI failures as untested.

### Evidence categories

- **Browser:** reproduced through live browser controls, with synthetic documents.
- **Executed probe/test:** observed through a fresh command against this tree or built public package.
- **Source:** concrete wiring/implementation defect; the entire UI interaction was not separately executed.
- **Open acceptance:** unfinished approved scope or a check that has not passed. Not automatically a separate runtime bug.

No claim is made that every input combination or all 106 CI failures were independently reproduced. Several failures share a root cause; they are not 106 distinct defects.

## 1. Exact validation status

### Freshly executed in this audit

Node 22.23.2 and the repository pnpm version were used. Browser tests ran against the built production site, with no snapshot regeneration.

| Check                                         | Observed result                                                                                                          | Evidence                                                                                                                                                                                                                                                                     |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                  | PASS: 488 unit, 2 performance tests, 34 package tests, lint/format/schema/docs/types/build/site/budgets                  | [check.log](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/docs/audits/2026-10-03/evidence/check.log)                                                                                                                                          |
| Chromium handoff + conversion + export dialog | **11 passed / 4 failed**; all four failures occur at renamed canvas-node visibility before the later flow assertion      | [focused-e2e.log](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/docs/audits/2026-10-03/evidence/focused-e2e.log)                                                                                                                              |
| Chromium selected drag/resize/Studio cases    | **8 passed / 2 failed**; keyboard eight-handle resize and multi-selection resize fail                                    | [gesture-e2e.log](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/docs/audits/2026-10-03/evidence/gesture-e2e.log)                                                                                                                              |
| WebKit shared export dialog                   | **8/8 passed**                                                                                                           | [webkit-export.log](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/docs/audits/2026-10-03/evidence/webkit-export.log)                                                                                                                          |
| Existing Darwin visual suite                  | **4/4 passed**, no baseline changes                                                                                      | [visual.log](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/docs/audits/2026-10-03/evidence/visual.log)                                                                                                                                        |
| Public-package counterexamples                | Nested security group false positive; custom HTML generated; all three throwing renderer callbacks escape the Result API | [probes.mjs](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/docs/audits/2026-10-03/evidence/probes.mjs), [probes.log](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/docs/audits/2026-10-03/evidence/probes.log) |

The fresh local checks above do **not** include the entire browser matrix, local Firefox, a fresh framework consumer run, or a fresh reference frame/memory run. Passing static visual comparisons does not validate the broken edited states.

### Exact-SHA CI, independently queried

[Run 37066893608](https://github.com/alanslzrr/aesthc-diagram-lib/actions/runs/37066893608), head `fcc5a03`, completed with failure. [Job/step evidence](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/docs/audits/2026-10-03/evidence/ci-status.json).

| Job                                | Final status | Consequence                                                                                                                 |
| ---------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Contracts and package              | **FAIL**     | Browser matrix: **967 passed / 106 failed / 131 skipped / 1 flaky**. Framework consumer step was skipped after the failure. |
| Reference frame budget             | **FAIL**     | Zero-long-task assertion observed **2 tasks over 100 ms**. Later memory/raster checks were skipped.                         |
| Node 20.19 / React 18.3.1 consumer | PASS         | This compatibility check passed; it does not override the other failures.                                                   |

Failed browser cases: Chromium 19, mobile-Chromium 16, Firefox 21, WebKit 34, mobile-WebKit 16. These counts total 106, without treating retry attempts as new cases. Most sampled failures involve stale labels/geometry; some are test-portability assumptions. All must be classified rather than blanket-dismissed as an environment problem.

## 2. Confirmed findings and required solutions

### V01 — P1: gesture-resolution reuse can publish stale geometry and labels

**Evidence:** Browser + existing automated failures + source. **Acceptance blocker.**

Location: [src/editor/index.tsx:765–815](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/editor/index.tsx:765), gesture completion around lines 1316–1332. Introduced by `fbb8df4`, the preview-resolution reuse optimization.

Reproduction:

1. Open the Band playground and click Ingress without moving it.
2. Change its label to `Audit renamed` and apply.
3. Inspector, Connections and Outline reflect the new document. Dirty/Undo reflect a committed edit.
4. The painted node and canvas button name remain `Ingress`.

![Document and inspector updated while canvas remains stale](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/docs/audits/2026-10-03/evidence/stale-canvas.png)

`commitWithResolved()` preemptively records the render closure's `resolved` value against `currentRevision + 1`, before knowing whether `commitGesture()` commits. A no-op click can therefore leave a cache entry that the next unrelated edit consumes. The cache validates only revision, not the preview/document/store or render context. Flushing a queued movement immediately before this call also does not guarantee that the React closure contains the final preview resolution.

**Fix:** make cache reuse conditional on a successful commit of the exact resolved preview. Key by document/preview identity and the relevant store, renderer, theme and measurement context; do not assume revision alone identifies content. Clear it for no-op, rejection, cancellation, replacement and context changes. Resolve or retrieve the final flushed preview synchronously, not the preceding React render. A safe correctness fallback is preferable to retaining this optimization with stale results.

**Required RED→GREEN cases:** no-op click→rename; no-op click→keyboard resize; final pointermove and pointerup in the same frame; connection creation; rejection/cancel followed by editing; replacement with matching revision; store/theme/registry change; Undo/Redo. Assert document values, painted SVG, accessible hit targets and exported geometry together.

### V02 — P1: standalone HTML discards frozen custom rendering at runtime

**Evidence:** built public API + real standalone runtime in the browser. **Acceptance blocker for F10/custom portability.**

Locations: [HTML generation](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/export/html.ts:139), [runtime boot](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/export/standalone.tsx:31).

The probe registers a 220×90 custom green badge, exports HTML using the actual bundled runtime and actual packaged fonts, and opens the artifact. Export succeeds. At boot, the fallback containing the custom SVG becomes hidden; `DiagramViewer` mounts without a renderer registry or portable frozen rendering data. The main diagram and minimap show `audit-badge unavailable`.

Observed DOM: one custom rendering exists, **zero are visible**, and two missing-renderer placeholders exist. The artifact was served locally for inspection; this is not claimed as a fresh `file://` offline-network certification.

![Successful HTML export replaces custom rendering with unavailable placeholders](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/docs/audits/2026-10-03/evidence/custom-html-runtime.png)

The current portability unit test at [editor-renderers.unit.spec.ts:248](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/tests/editor-renderers.unit.spec.ts:248) uses `void 0` as runtime and checks generated strings. It cannot establish post-boot preservation.

**Fix:** carry validated, bounded frozen SVG plus geometry/identity into the standalone runtime and use it without shipping arbitrary executable renderer callbacks. Alternatively keep a truthful static rendering and explicitly report unsupported interaction; do not replace valid content with a placeholder while claiming successful portability. Preserve safe SVG restrictions, local IDs and no external references.

**Acceptance:** test the actual bundled runtime with JavaScript on and off, standard and custom nodes together, zero missing-renderer placeholders, geometry/theme/font parity and actual offline/CSP behavior.

### V03 — P1: Reset silently destroys unapplied JSON

**Evidence:** Browser + source. **User-work-loss blocker.**

Location: [PlaygroundApp.tsx:296–305](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/site/src/playground/PlaygroundApp.tsx:296).

From a clean document, enter an unapplied invalid JSON buffer such as `{"audit-unapplied":`. The draft diagnostic appears while committed-document dirty remains false. Clicking Reset shows no confirmation and replaces the buffer with the original document. The guard checks only `dirty`; it ignores text drafts. Recovery storage is also cleared before replacement success is known.

**Fix:** centralize destructive-action protection over committed dirty state, any unapplied text draft and recovered unsaved work. Offer explicit discard/cancel (and apply only when valid). Keep the draft and recovery record until replacement succeeds; rejection/cancellation must preserve both byte-for-byte.

**Acceptance:** valid and invalid unapplied JSON, clean document plus draft, rejected replacement, cancel and confirm paths, both locales and keyboard focus restoration.

### V04 — P2: recovered unsaved documents become a clean baseline

**Evidence:** Browser + source. Related to V03, but a different cause.

Location: [PlaygroundApp.tsx:193–199](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/site/src/playground/PlaygroundApp.tsx:193) and session draft persistence.

After a committed edit is persisted, opening that example in another tab displays **“Recovered unsaved work…” and “No pending changes” simultaneously**. The recovered document is passed as the initial document to `createEditorStore`, which treats it as the saved baseline. Reset's dirty-only guard then provides no protection for that recovered work. Restoring the entire old undo stack is not required to fix this issue.

**Fix:** persist/recover a saved baseline or an explicit unsaved recovery state that participates in guards. Do not label every persisted selection/camera notification as recovered unsaved editing. Clear recovery status only through a successful explicit save/discard decision.

**Acceptance:** edit→reload→dirty/guard remains truthful; reset→cancel preserves recovered edits; pristine camera/selection changes do not falsely advertise unsaved recovery.

### V05 — P2: instance renderer context is lost in export controls

**Evidence:** Source wiring; no claim of a separate custom-Viewer click reproduction.

Locations: [DiagramViewer.tsx:340–352](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/viewer/DiagramViewer.tsx:340), lines 363–366 and 398–408; [shared export context](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/site/src/lib/export-service.ts:119).

The Viewer accepts a registry for display, but its card, WebM and publish handlers do not pass that registry to export APIs. The card error path returns silently. The shared site's export context also has no instance registry. Headless registry tests therefore do not establish that the visible custom-node instance exports correctly through the UI.

**Fix:** route a single explicit per-instance export context through every visual output: registry, effective theme, fonts/measurement, revision, selection and cancellation. Consolidate Viewer controls without removing their query semantics. Surface errors instead of silent no-ops.

**Acceptance:** two independent instances with different implementations of the same type key; display→SVG/card/HTML/WebM where supported; no global registry leakage; visible error/cancel/retry behavior.

### V06 — P2: nested security-group membership falsely blocks a valid deployment profile

**Evidence:** executed public-package counterexample.

Location: [profiles.ts:92–100](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/editor-core/profiles.ts:92).

Valid hierarchy: Region → private Security group → System subgroup → owned node. Only the subgroup directly lists the node; the security group is an ordinary container with no direct node IDs. The node has exactly one region. Validation nevertheless returns `profile.region-conflict` for the security group because its region collection iterates only direct `group.nodeIds` while the node's security-group membership includes ancestors.

**Fix:** define effective descendant membership consistently and derive region ancestry for containers. Compare all effective members against the group's region without requiring nodes to be redundantly listed at every ancestor. Keep actual multi-region conflicts rejected.

**Acceptance:** empty container with populated descendants, multiple nesting levels, direct plus inherited membership, real cross-region conflicts and private/public checks. Include publish acceptance for the valid fixture.

### V07 — P2: global Playground appearance is not the export appearance

**Evidence:** live browser/document state + source wiring. The downloaded SVG was not independently retrieved in this browser session; artifact pixel colors are not claimed as measured.

Locations: [PlaygroundApp.tsx:442](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/site/src/playground/PlaygroundApp.tsx:442) and [export-service.ts:149](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/site/src/lib/export-service.ts:149).

The browser displayed a dark canvas while its canonical document retained `presentation.theme.mode: light`. EditorRoot applies the global host theme as a view override, but the export service reads the document mode. Consequently “theme” export does not mean the currently visible global appearance. WebM additionally lacks an effective-theme input at the shared service call.

**Fix:** explicitly supply the effective global theme to all visual exports. Keep canonical JSON faithful to the authored document; do not create undo entries for a global appearance toggle, and do not reintroduce the rejected second Playground theme selector. Document the difference between portable visual appearance and canonical source.

**Acceptance:** toggle global light/dark→export every supported visual format, including restored sessions; rendered/exported appearance agrees; JSON and edit history remain unchanged.

### V08 — P2: custom renderer exceptions escape the Result boundary

**Evidence:** executed built-package probes for `validate`, `measure`, and `renderSvg`.

Location: [scene.ts:268–295](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/editor-core/scene.ts:268).

A trusted registered callback that throws causes `exportDocument()` to reject/throw rather than return a diagnostic. The same unguarded resolution is used in interactive render paths. The public export exception is reproduced; an entire UI crash was not separately reproduced.

**Fix:** isolate callback failures per renderer/phase and return a documented diagnostic with exact subject. Keep the last valid document, prevent publish from silently substituting a placeholder, and preserve unrelated instance operation. “Trusted” permits execution; it does not guarantee callbacks cannot fail.

**Acceptance:** throw in each callback, malformed size/output, failed renderer beside valid nodes, retry and two-instance isolation. Verify failures do not leave export progress/recording stuck.

## 3. Existing performance and verification blockers

### F33 remains open — do not weaken the gate

CI records two tasks exceeding 100 ms against a zero-task target. A good p95 frame value does not satisfy the independent long-task requirement. Reference raster/memory steps did not run to completion in this failed job and cannot be inherited as fresh success.

The full committed baseline is still rendered from complete scene markup at [editor/index.tsx:821–832](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/editor/index.tsx:821). This supports investigating incremental committed updates, but this audit did not independently profile enough to certify that baseline parse/layout is the sole remaining cause.

**Order:** fix V01 first; then profile the exact reference workload and patch changed entities plus incident edges, labels, groups and markers with safe full-rebuild invalidations. Preserve undo/replace/theme/registry correctness. Re-run the same 1000-node/2000-edge workload and all frame, long-task, raster and memory gates on the exact review SHA. Do not shrink the dataset or raise thresholds to make the report green.

### CI failures require classification, not blanket skips

Two concrete test portability issues also appear in CI:

- The `ENGINEERING` measurement assertion in [diagram-labels.e2e.ts:165](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/tests/e2e/diagram-labels.e2e.ts:165) expects width greater than 80, while Linux measured about 78.76. Validate actual font readiness and the intended fit/padding contract, rather than a host-dependent lower glyph-width bound.
- [export-dialog.e2e.ts:61](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/tests/e2e/export-dialog.e2e.ts:61) reaches different legitimate first WebM diagnostics on Linux WebKit (`webm.unavailable` versus expected `webm.empty`). Use controlled capability fixtures to test error priority and a separate real capability integration test; do not simply skip all WebKit exports.

Keep genuinely failing product interactions separate from these test assumptions. The fresh eight-case WebKit export-dialog run passed on this machine; that does not erase the Linux failure.

## 4. Full-scope completion is still pending

| Workstream                                   | Current audit disposition                               | Required completion                                                                                                                                                                                                                                                                              |
| -------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F01–F32 blanket closure                      | Not accepted as a blanket statement                     | Reopen affected renderer/export/lifecycle items; rerun changed paths after V01. Individual passing tests are useful but insufficient for a global claim.                                                                                                                                         |
| G01 shared export experience                 | Implemented substantially, not complete                 | Fix V05/V07, finish Viewer consolidation, verify per-format option relevance and actual downloaded artifacts.                                                                                                                                                                                    |
| G02 complete visual configuration            | Still open, as admitted                                 | Public-command-backed palette, layout/grid/padding/text scale/edge style, metadata, kinds/descriptions, ports/routes; contextual validation and undo. No silent raw-JSON-only substitution for promised controls.                                                                                |
| G04 authoring workflows                      | Still open, as admitted                                 | Deliver the agreed views/lenses/story/trace/compare/evidence scope, distinguish document edits from transient viewing, and explicitly inventory any accepted API-only exception.                                                                                                                 |
| G06 portable typography/lifecycle            | Still open; omitted from the latest “only pending” list | Shared bounded asset/font preparation for HTML/cards/WebM. HTML resolves before embedded faces load; card/WebM paths do not receive equivalent font-byte/policy context. Test actual cold-host artifacts and cancellation. This is a source/coverage gap, not a newly measured glyph corruption. |
| D01–D07 premium UI                           | Partial, not a finished design acceptance               | Complete remaining responsive workspace, representative gallery, typography/framing, background/border hierarchy and feedback work against the original acceptance criteria.                                                                                                                     |
| Cross-browser/framework/reference acceptance | Failing/incomplete at exact SHA                         | All five browser projects, framework consumers and reference jobs must finish successfully or have narrowly justified, explicitly approved exclusions.                                                                                                                                           |

A specific D02 remnant is the mobile docs navigation's `65dvh` sizing in [docs.css:992–1020](/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/site/docs/docs.css:992). The new browser viewport request did not take effect during this audit (the inspected tab remained 1280×720), so this report does **not** fabricate a fresh 390px measurement. Re-run mobile visual acceptance at a verified `innerWidth`/`innerHeight` before closing D01/D02.

### Before / required after

| Before — verified current behavior or open scope            | Required after                                                                                     |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Inspector and canvas can disagree after a simple edit       | One authoritative committed geometry/label state across canvas, controls and exports               |
| Custom offline diagram replaced by “unavailable”            | Custom canonical rendering stays visible through runtime boot                                      |
| Reset ignores draft-only edits; recovery looks clean        | Every destructive action protects actual unsaved work with truthful status                         |
| Display theme and export theme are different sources        | One effective visual theme, with canonical JSON preserved separately                               |
| Individual controls pass tests while full workflows regress | Complete selection→edit→undo→save/handoff→export workflows certified                               |
| Some mobile/premium workstreams remain unfinished           | Workspace-first mobile layout, representative readable diagrams and consistent component hierarchy |

Keep the requested Geist/Vercel/shadcn direction. Do not restart the design, add a second theme control, restore native arrow-disclosure panels, or obscure semantic geometry with decorative fades. Fade only decorative backgrounds. Use the [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) as a review aid, not as a substitute for artifact inspection.

## 5. Budget and delivery reporting

Budget limits were increased and documented; that is a scope/budget decision, not a measured performance improvement. Commit `57b88cf` raises landing JS 175→180 KiB, Playground 180→204 KiB, Studio 180→196 KiB and editor-entry CSS 12→13 KiB.

Fresh measured values: landing JS 179993/184320 bytes; Playground JS 202802/208896 and CSS 12655/13312; Studio JS 193134/200704; docs JS 238877/245760. They pass the **new** limits. Retain explicit review of the additional bytes and optimization opportunities; do not characterize them as passing unchanged budgets.

Update the PR description and status report with exact-SHA final CI, fresh local failures, skipped downstream steps and remaining G/D scope. A draft PR is appropriate until these conditions are resolved.

## 6. Implementation sequence for the next agent

1. **Correct committed rendering (V01).** Add the no-op-click regression first; repair cache identity and final-preview synchronization. Re-run all rename, resize, drag, connections, undo and handoff tests before proceeding.
2. **Protect work (V03/V04).** Centralize reset/recovery/destructive-action state, with cancel and rejected-commit tests.
3. **Complete rendering/export context (V02/V05/V07/V08 and G06).** Freeze custom rendering through real standalone boot; carry registry/theme/font/cancellation per instance; isolate callback failures; verify actual artifacts.
4. **Correct deployment membership (V06).** Add the nested-container counterexample and genuine-conflict negative controls.
5. **Finish the performance work without sacrificing correctness (F33).** Profile and implement incremental baseline updates, then certify all reference stages at the exact SHA.
6. **Complete G02/G04 and remaining D01–D07.** Use the original workstream requirements and explicit acceptance evidence; do not equate existing APIs with finished visual workflows.
7. **Classify and close the full CI matrix.** Fix deterministic test assumptions with negative controls. Run framework consumers after browser failures are removed. Review visual diffs without blind baseline updates.
8. **Deliver granular commits and an accurate PR.** Use `alanslzrr/` and Conventional Commits, one responsibility each, preferably no more than three files where cleanly separable. Generated source/dist/schema changes must remain coherent even if that requires more files. Include regression tests, public examples and migration notes where applicable. Never patch generated output manually. No automatic merge or publication.

Suggested commit responsibilities: gesture cache correctness; reset draft protection; recovery state; portable frozen custom rendering; shared export context; renderer exception diagnostics; inherited profile membership; incremental baseline performance; each configuration/authoring/design feature. Do not squash all fixes into a vague “audit changes” commit.

## 7. Evidence and limitations

The attached logs record the fresh commands; the probe uses public built exports. Screenshots capture the actual browser states and are not proposed baselines. The full CI log was inspected outside the repository; the linked run and saved job metadata identify the exact source.

No new local full-matrix, Firefox, framework, reference memory or reference frame certification is claimed. Existing visual references pass on Darwin, but those four cases do not establish complete premium-design acceptance. This is a critical verification pass with concrete counterexamples, not a claim to have exhausted every combination across the library.

## Key Learnings:

1. A revision-only geometry cache can make a valid committed document display an older scene after a no-op gesture.
2. A frozen custom SVG in generated HTML is not portable if runtime boot hides it and reconstructs the diagram without its renderer context.
3. Recovery status and destructive-action guards must account for text drafts and recovered unsaved edits, not only the current store's dirty boolean.
