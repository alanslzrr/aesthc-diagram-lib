# Site and documentation audit — 2026-10-02

## Scope and evidence

Independent read-only source review of landing sections, legacy spec/code panel, dedicated playground, Studio, Viewer, mounted Heyo shell/client/server/search, theme generation, public guides, and prior audit corrections. No implementation, baseline or generated artifact changed by this reviewer.

Read the installed better-ui, emil-design-eng and web-design-guidelines skills; fetched current Vercel interface guidelines from <https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md>.

Repository root: `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib`.

Root reviewer independently confirmed in the live browser: conversion discards an intervening edit and leaves Undo disabled; copied theme CSS includes transparent dark secondary surfaces; Full Studio has no current-document handoff; switching Connections to Timeline leaves an empty panel. Other source findings below are not presented as browser-reproduced unless stated.

## Corrections verified in the current tree

- Heyo is now actually mounted (`site/src/docs/DocsApp.tsx:177–183`), with StaticRouter server rendering and BrowserRouter hydration. The previous “shell not mounted” finding is closed; visual parity is a separate assessment.
- Resize marker dimensions now derive from the clamped target (`src/editor/index.tsx:1861–1882`), addressing the prior visible-but-unhittable marker region.
- Gallery unit explicitly identifies its width-only approximation and delegates real effective text measurement to browser getScreenCTM checks.
- Export geometry test now parses and compares internal nodes, containers and routes, with negative mutations, rather than merely comparing the SVG viewBox.
- Playground import captures its destination store/session/revision before awaiting and catches file-read failures.

## Findings and solutions

Paths in the table are repository-relative.

| ID      | Priority | Location                                                                                                           | Before                                                                                                                                                                                                                        | After / solution                                                                                                                                                                                                                     | Evidence and impact                                                                                                                                                                                                                              |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SITE-01 | P1       | `site/src/studio/main.tsx:120–143,200–215,330–337,376–388`                                                         | Save-as writes to `saveas:<slug>` but keeps document.id. Opening the copy stores its token; later Save locally and autosave still address document.id.                                                                        | Keep an explicit active storage key separate from document identity. Load/open/save/autosave/token must switch atomically. Decide whether Save as activates the copy or creates an archival copy; make that contract visible.        | Independently executed built-public-API reproduction returns conflict for save original → save copy → open copy → edit → save by document.id using copy token. Autosave also remains bound to the original key when document.id does not change. |
| SITE-02 | P1       | `site/src/studio/main.tsx:300–315,595–623`                                                                         | Request conversion stores a converted snapshot. Confirm conversion supplies the current revision rather than the revision used to create that snapshot. The notice is nonmodal and editing remains possible.                  | Capture source document ID and baseRevision with the conversion; reject/invalidate stale confirmation or recompute it. Never replace fresh edits under a freshly read revision.                                                      | Root browser confirmed intervening label edit is lost after confirmation and Undo is disabled. Add a delayed-confirm regression preserving document and history on stale rejection.                                                              |
| SITE-03 | P1       | `site/src/playground/PlaygroundApp.tsx:124–153,249–251,309–323`                                                    | Sessions live only in a ref Map. No beforeunload/navigation guard or recovery persistence. Full Studio/Docs/home navigate in the same tab.                                                                                    | Guard dirty and uncommitted text-draft sessions when leaving; optionally persist validated per-example drafts. Transfer the current document to Studio or explicitly label it an independent workspace and warn before losing edits. | Root confirmed no Studio handoff. Source confirms no unload guard. Internal example switching retains sessions; leaving/reloading does not provide the same guarantee.                                                                           |
| SITE-04 | P2       | `site/src/lib/code.ts:98–122`; `docs/guides/theming.md:20–42`; `site/src/components/ThemeStudio.tsx:52–56,119–135` | Theme Studio/Copy CSS and guide still emit old light 20% outline mix, dark var(--border), and transparent secondary fills.                                                                                                    | Generate copied/documented theme contracts from current shared tokens. Include node border, structure, container, opaque secondary fill and text/edge ink policy.                                                                    | Root confirmed copied CSS transparency. Current host uses 42% light/34% dark outline mix and opaque secondary fill (`theme-tokens.css:14–18,40–44`); advertised CSS reintroduces recently repaired visual defects.                               |
| SITE-05 | P2       | `docs/guides/share-export.md:3–44`; `docs/index.md:15–16`                                                          | Index promises JPEG/WebP/offline HTML and bounded links; linked guide says these are not package-level APIs and describes only the legacy showcase, old share envelope and 256 KiB raw-text drafts.                           | Split legacy showcase, editable playground/Studio, and public export/persistence APIs. Add runnable imports/examples and option/receipt/cancellation/limits tables, including offline HTML/cards/WebM links.                         | Current playground imports up to 1 MiB, exports only JSON and has no local recovery controls. Package APIs exist. These are conflicting product contracts, not merely missing explanatory prose.                                                 |
| SITE-06 | P2       | `src/editor/index.tsx:2407–2469`                                                                                   | EditorPanelTabs uses global static IDs and document.getElementById for focus. Selecting Connections and then Timeline removes the tab without resetting active state.                                                         | Prefix IDs with useId, scope focus with refs, and reconcile active tab when available tabs change.                                                                                                                                   | Root browser confirmed empty Timeline panel. Source proves duplicate IDs and cross-instance focus lookup; add a two-editor keyboard test as well as type-switch test.                                                                            |
| SITE-07 | P2       | `site/src/studio/main.tsx:478–491`; `site/src/viewer/main.tsx:131–173`                                             | upload.text() lacks a catch and latest-request guard in these hosts.                                                                                                                                                          | Catch read failures; capture a request sequence and destination/base revision; reject stale results; preserve last valid document and expose recovery text.                                                                          | Source-only. A rejected read becomes an unhandled promise. Overlapping uploads can resolve out of order. Viewer Reset during a pending read can be undone by the stale result. Playground already has stronger handling.                         |
| SITE-08 | P2       | `site/src/components/chrome.tsx:85–92,134–138`; `site/src/App.tsx:91–119`                                          | On ?only=example-flowchart, hero still emits fragment links to all seven sections while only one is rendered; hero media points to absent #example-band.                                                                      | Emit route-aware ?only=example-X#main links or return-to-gallery links when filtered.                                                                                                                                                | Source-confirmed missing targets. The Spec & code route exposes dead cross-layout navigation.                                                                                                                                                    |
| SITE-09 | P2       | `site/src/playground/PlaygroundApp.tsx:373–380`                                                                    | Every sidebar anchor click unconditionally preventDefault().                                                                                                                                                                  | Intercept only unmodified primary clicks. Preserve Cmd/Ctrl/Shift-click, middle click and explicit target behavior.                                                                                                                  | Source-confirmed standard link behavior violation; browser modifier test remains for root.                                                                                                                                                       |
| SITE-10 | P2       | `site/src/studio/main.tsx:97,447–450`; `site/src/viewer/main.tsx:102–117`; `site/src/lib/theme.ts`                 | Landing/docs/playground share persisted host theme/locale, but Studio/viewer initialize English and independent document-driven appearance. Viewer host copy remains English after locale selection and html lang remains en. | Reuse host preferences and chrome. Keep document/export theme policy explicit and separate. Translate viewer host labels and update html language.                                                                                   | Source-confirmed cross-surface integration inconsistency, not absent library locale support.                                                                                                                                                     |

## Product-scope gaps, not missing library implementations

| Surface                         | Current exposure                                                                                                                          | Solution for a complete playground                                                                                                                                                                                                |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Playground export               | JSON download only; Studio is a separate workspace link.                                                                                  | Shared export dialog for the current edited document: JSON/SVG/PNG/JPEG/WebP, plus offline HTML/card/WebM where capabilities permit.                                                                                              |
| Studio export                   | Five formats and edit/publish quality; hardcoded document scope, scale 2, theme background, no source, minimal metadata; no cancellation. | Expose document/selection scope, dimensions/scale, background/transparency, metadata/source disclosure, font policy, progress/cancel and capability feedback.                                                                     |
| Appearance/configuration        | Snap and Show grid, global mode; no visual palette editor, grid size, text scale, padding, per-node style/font/custom-renderer setup.     | Configuration panels for Document, Selection, Layout, Appearance and Export, backed by validated public commands and reversible transactions.                                                                                     |
| Structured editing              | Band/Sequence/Timeline/Swimlane intentionally lack arbitrary XY movement under their adapter contracts.                                   | Explain type-specific interactions in the UI; expose semantic reorder/membership controls and explicit conversion to graph. Do not advertise all diagram types as freely draggable.                                               |
| Viewer advanced workflows       | Read-only example has search/routes/views/story/compare, but not corresponding document/story/view authoring.                             | Add discoverable authoring where appropriate or explicit examples/API entry points. Label API-only capabilities honestly.                                                                                                         |
| Landing representative examples | Gallery reduces Sequence to one participant/self-retry, ER to one table, Swimlane to one lane.                                            | Preserve legibility while showing defining relationships: two entities/cardinality, two lanes/handoff. Use responsive illustrative framing rather than removing the feature being demonstrated simply to satisfy text-size tests. |
| Legacy vs new surfaces          | Landing ?only= has old spec editor/share/export; playground has new document editing; Studio has another capability subset.               | Define one capability map, consistent navigation and document handoff. Users should not have to discover which similarly named surface can export their edited work.                                                              |

## Executed independent storage check

Used Node 22 and the built public exports; no source aliases or implementation changes:

```js
import { createDocument } from './dist/editor-core/index.js'
import { createMemoryStorage } from './dist/persistence/index.js'
const created = createDocument(
  {
    type: 'graph',
    profile: 'architecture',
    caption: 'Order platform',
    legend: { main: 'Main', branch: 'Async' },
    nodes: [{ id: 'a', label: 'A', description: '' }],
    edges: [],
  },
  { id: 'studio-document', locale: 'en' },
)
const storage = createMemoryStorage()
await storage.save('studio-document', created.value, null)
await storage.save('saveas:audit-copy', created.value, null)
const opened = await storage.load('saveas:audit-copy')
const edited = structuredClone(opened.value.document)
edited.spec.nodes[0].label = 'Edited saved copy'
const result = await storage.save(edited.id, edited, opened.value.token)
// result.status === 'conflict'
```

Observed output:

```json
{
  "original": { "status": "saved", "token": "1" },
  "copy": { "status": "saved", "token": "2" },
  "openedDocId": "studio-document",
  "resaveStatus": "conflict"
}
```

## Acceptance sequence

1. Fix stale conversion and storage-key/token lifecycle; demonstrate no lost edits and correct save-after-open/autosave behavior.
2. Fix playground exit protection/current-document handoff and tab lifecycle/isolation.
3. Consolidate generated theme CSS, public documentation and live tokens; exercise copied CSS in an isolated consumer.
4. Unify shared host preferences and navigation semantics.
5. Expose agreed customization/export features with explicit limitations, using public APIs rather than parallel implementations.
6. Validate all changed flows in browser and across supported engines. Preserve distinctions between executed tests, source evidence, product gaps and unverified cases.

## Verdict

**Block** complete approval on data-loss and save-lifecycle defects. Do not reopen the corrected historical findings or describe Heyo as unmounted. Premium presentation is not a substitute for correct editing, navigation, persistence and export flows.

## Key Learnings:

1. Storage keys and document IDs are different identities; a saved copy token cannot authorize saving to the original key.
2. Updating visible theme tokens does not automatically update copied integration CSS or documentation.
3. Public library capability and exposed playground capability require separate acceptance matrices.
