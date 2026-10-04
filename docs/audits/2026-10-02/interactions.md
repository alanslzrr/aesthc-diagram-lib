# Editor/store interaction audit — 2026-10-02

Scope: read-only review of the current working tree. No code, generated output, baselines or commits changed. Browser validation is delegated to the root auditor; this report separates executed source-level probes from static UI findings. Absolute repository root: `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib`.

## Executed evidence

- Node v22.23.2; pnpm from repository environment.
- `pnpm exec vitest run tests/editor-store.unit.spec.ts tests/editor-store-lifecycle.unit.spec.ts tests/editor-adapters.unit.spec.ts tests/editor-structure.unit.spec.ts tests/editor-resize.unit.spec.ts tests/editor-clipboard.unit.spec.ts tests/layout-geometry.unit.spec.ts tests/gallery-framing.unit.spec.ts`: **100 tests / 8 files passed**, exit 0. Log: `interaction-tests.log` in this directory.
- `pnpm exec tsx /tmp/aesthc-audit-20261002/interaction-probes.ts`: nine source-level counterexamples/control experiments; full code and exact JSON results in `interaction-probes.ts` and `interaction-probes.jsonl`.
- The tests passing do not invalidate the failures below: their current matrix does not exercise these command combinations.

## Confirmed findings (executed probes)

| Priority | Location                                                                                                                            | Before (observed current behavior)                                                                                                                                                                                                                                                                       | After (required solution)                                                                                                                                                                                                                                                                                                                                                   | Why                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P1       | `src/editor-core/commands.ts:51–55,161–163`; `src/editor-core/store.ts:430–441`; `docs/specs/editable-canvas/04-contracts.md:48–50` | A directly locked node can be moved by `scene.set`; its lock can be cleared by `scene.set` without `nodes.set-lock`. The JSON panel's `document.replace-content` can move or relabel the same locked node. Every probe committed, remained structurally valid, incremented revision and created history. | Enforce transition invariants against the trusted baseline, not just final-document validity, for replacement commands. Preserve locked geometry/content and inherited group locks; permit unlock only through explicit allowed lock operations, then revalidate subsequent commands atomically. Do not block an explicitly authorized Import/Open of a different document. | The published contract explicitly says hosts cannot bypass locks with `dispatch`, and `scene.set` cannot unlock. Current checks exist on narrow move/resize/spec commands only. Final schema validity cannot prove a legal state transition.                                                                                                                                                           |
| P1       | `src/editor-core/commands.ts:51–55`; `docs/specs/editable-canvas/04-contracts.md:42`                                                | `setTextDraft` → `commitTextDraft` accepts a timeline document into a graph editing session as an ordinary reversible edit. A direct replacement with a foreign document ID is silently rebound to the existing ID.                                                                                      | Reject mismatched format/schema/id/type in `document.replace-content` with a stable diagnostic. Keep cross-type import/conversion behind the existing explicit new-document/reset-history path. Surface the rejection in the JSON panel.                                                                                                                                    | The contract separates Apply JSON from Import/Open specifically to avoid silently changing session identity/type. This is not a request to invent a new restriction; it is written in the current contract.                                                                                                                                                                                            |
| P1       | `src/editor-core/store.ts:26–96,419–440`; `src/editor-core/types.ts:414`                                                            | `previewGesture` with `skipValidation:true` accepts `presentation.set` with `textScale: NaN`, and `metadata.set` with a `javascript:` link. Both overwrite the last valid preview. `validateDocument(draft.preview)` then fails `data.finite` / `url.scheme`.                                            | Restrict the optimized preview path to a discriminated, complete allowlist of commands whose delta validation is sufficient; fall back to full validation for presentation/metadata/views and mixed batches. Keep the previous draft unchanged on failure. Prefer an internal trusted preview entrypoint if this optimization is not a public contract.                     | The option is public and typed, but its name is broader than the safe implementation. NaN is a valid JS number argument: this is not merely an `as any` schema bypass. The current application uses mainly scene/spec previews, so direct ordinary dragging is not proven vulnerable; custom hosts are. Unsafe links being accepted into a preview are demonstrated, **execution/XSS is not claimed**. |

### Exact probe outcomes

1. Lock `a` with `nodes.set-lock`; submit `scene.set` changing `a.x=999` → `committed`, revision 2, `locked:true`, x999.
2. Lock `a`; submit same scene with `a.locked=false` → `committed`, no explicit unlock command.
3. Lock `a`; serialize JSON and change x999; `commitTextDraft()` → `committed`, locked preserved but position changed.
4. Same flow changing label → `committed`, label `Changed despite lock`.
5. Graph session; apply valid Timeline JSON using the same id → `committed`, type timeline, revision1, original graph removed.
6. `document.replace-content` with `id:'foreign-document'` and caption change → `committed`, id silently rewritten to `doc-fixture`.
7. Valid gesture preview x10/y20, then preview `presentation.textScale=NaN` with skip flag → `ok:true`, last valid draft replaced, validation fails `data.finite`.
8. Valid gesture preview, then metadata `javascript:` link with skip flag → `ok:true`, last valid draft replaced, validation fails `url.scheme`.
9. Control: `setPermissions({edit:false,...})` then ordinary move → **rejected `permission.edit`**, revision and geometry unchanged. Do not report a backend permission bypass: the actual issue is locks/transition validation.

### Regression tests needed

- Lock matrix: direct and group-inherited locks × scene replacement, JSON replacement, mixed batches and previews; assert rejection preserves committed document, draft, history length, selection and notification counts. Include the explicit unlock-then-edit success path and unchanged locked members during relayout.
- Replacement identity matrix: same type/id accepted, foreign id rejected, different type rejected, old draft revision rejected; explicit import/conversion still allowed with confirmation/history reset.
- Preview allowlist: all command variants, NaN/Infinity, invalid palette/grid range, unsafe metadata links, dangling views, invalid custom payload, mixed scene+metadata commands. Assert last-good preview object/content survives rejection and no invalid preview reaches subscribers.

## Static UI findings to reproduce in browser

These are unambiguous code paths, but this worker has not performed browser interaction; root should mark them reproduced only after testing.

### P2 — Unavailable active tab after switching to Timeline

`src/editor/index.tsx:2386–2402,2434–2458`. `EditorPanelTabs` retains local `tab='connections'`, while Timeline conditionally removes the Connections tab and panel. There is no reconciliation. Playground switches the provided store without remounting this component (`site/src/playground/PlaygroundApp.tsx:99–119,259–268`; only `EditorSurface` has a session key).

Repro: Flowchart → Connections tab → Timeline. Expected current result: empty panel, Outline and JSON both `aria-selected=false` / `tabIndex=-1`, panel labelled by absent `adl-editor-tab-connections`.

Fix: derive an effective tab from supported tabs and reset unsupported values on document-type changes, or keep per-session tab state and normalize on restore. Test all transitions into/out of Timeline and keyboard focus.

### P2 — Panel IDs and focus are global rather than per instance

`src/editor/index.tsx:2407,2434–2436,2447–2448`. All instances use `adl-editor-tab-outline/json/connections` and `adl-editor-tabpanel-*`, and keyboard navigation focuses via `document.getElementById`.

Repro: mount two EditorPanelTabs under two EditorRoots; arrow-key navigation in second instance changes its state but focuses the first instance's matching tab. Static markup also has duplicate IDs and invalid cross-instance ARIA references.

Fix: `useId()`-scoped identifiers and component-local refs for focus. Verify two complete editors, not only two surfaces/stores, in light/dark and StrictMode.

### P2 — Removing an occupied lane silently picks a destination

`src/editor/index.tsx:2980–2985` picks the first remaining lane and assigns all members there immediately. Current contract `docs/specs/editable-canvas/04-contracts.md:32` explicitly requires user choice of move-to/delete-members and says not to choose for the user.

Repro: Swimlane → select an Engineering node → remove Engineering lane → all members silently move to first lane. No destination/policy dialogue exists in this handler.

Fix: explicit reassignment/delete-members choice with affected member count and destination picker. Empty-lane deletion can be direct; cancel must be a no-op; acceptance is one undoable transaction. Do not call the core adapter deficient: the adapter already supports exhaustive mappings; this gap is the built-in UI policy.

### Async clipboard session ownership — hypothesis requiring a delayed-clipboard browser probe

`src/editor/index.tsx:2512–2548` captures `store` in a closure, then after `await readText()` compares the old store to itself. In Playground the toolbar component survives a provider store change. A pending paste may mutate the old off-screen example after the user switches examples, unlike import which tracks `currentSession`.

Probe: defer `navigator.clipboard.readText`, start Paste on Flowchart, switch to another example, resolve valid Flowchart fragment, then return to Flowchart. Determine whether unseen paste committed. Fix if confirmed: current-store ref or operation generation invalidated on provider change/unmount; reject stale ownership even if old store's revision has not changed.

## Prior findings: status in this tree

- Resize visible-target mismatch: source now computes marker from target half-size minus stroke half-width. Targets clamp at group dimension/4, avoiding adjacent overlap. New tests in `tests/e2e/studio.e2e.ts:534–689` inspect markers at 10% zoom and perform body/resize/undo. **Do not carry the old mismatch forward without a fresh failure.** Browser suite execution remains the root's responsibility.
- Gallery unit: renamed and explicitly documented as a width-only proxy, not rendered legibility proof (`tests/gallery-framing.unit.spec.ts:16–28`). Browser `getScreenCTM` remains the real gate. Prior misleading test claim is resolved; the proxy can be retained as a weak invariant.
- Geometry parity: substantially fixed. `tests/layout-geometry.unit.spec.ts` now parses node/container/edge geometry from SVG, compares layout→resolved→serialized geometry and adds negative mutation tests. Targeted suite passes. Prior viewBox-only objection is resolved for the swimlane fixture.
- ENGINEERING constant test is now explicitly arithmetic-only; the file points to a font-loaded browser measurement in `diagram-labels.e2e.ts`. Verify that browser case before granting runtime typography coverage.

## Full-scope customization observations (not automatically bugs)

- Free XY movement is intentionally limited to graph/flowchart/state-machine/ER. Band drag changes band/order; Swimlane drag changes lane/order; Sequence/Timeline drag changes authored order. This is documented semantic behavior, not proof drag is broken.
- Core adapters provide more capabilities than the default Inspector. Built-in inspector covers labels, free-layout geometry, ER fields, sequence participants, swimlane lane assignment, graph ports; it does not expose every document field (palette channels, padding/text scale/edge style, per-node description/kind/visual metadata, views/story authoring). JSON remains the escape hatch. For the requested complete premium Playground, make a capability inventory and build structured controls for common settings rather than claiming full visual customization from JSON availability alone.
- Playground offers JSON download and a Full Studio link; richer artifact export controls live in Studio. This is a product-scope mismatch with 'entire editable/exportable Playground' if it is intended to be a single complete destination, not an export engine bug.
- Read-only store mutation rejection works in the probe. The default UI does not read permissions from the snapshot/context to disable every mutator; several callbacks ignore rejected CommitResult (Add node, Apply JSON, grid toggles, etc.). Root may verify confusing no-op controls in a readonly consumer; do not conflate UX omission with data authorization failure.

## Recommended order

1. Fix locked-transition enforcement and typed document replacement.
2. Bound optimized preview to validated command variants.
3. Reproduce/fix tab continuity and per-instance IDs/focus; investigate delayed clipboard store switching.
4. Add explicit destructive structural-edit policy.
5. Complete product-level customization/export UI separately from verifying headless API capability.
6. Re-run unit, actual packaged consumers and full browser matrix after fixes. Preserve baselines until visual review justifies each change.

### P2 — Apply JSON hides commit-time conflicts

`src/editor/index.tsx:2370,2378–2379` discards the result of `store.commitTextDraft()`; visible diagnostics come only from `snapshot.draft.diagnostics` produced when parsing the buffer. `src/editor-core/store.ts:568–569` returns `revision.stale` without updating that draft, correctly preserving user text but leaving this UI silent.

Browser repro: edit valid document JSON; make an independent inspector label edit before applying that buffer; click Apply JSON. The commit is correctly rejected, but the button appears not to work and no conflict alert explains recovery.

Fix: retain a separate commit-result diagnostic state in EditorJsonPanel (clear it on edit/retry/discard) or expose last operation diagnostics through the store without mutating the invalid/stale buffer. Test valid parse + stale revision, permission revocation and history capacity, with recovery that never silently overwrites text. This is an error-reporting issue, not data loss: the store rejects safely.
