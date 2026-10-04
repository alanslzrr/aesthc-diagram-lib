# Independent library audit — 2026-10-02

## Scope and verdict

Read-only source review and executable probes of customization, configuration, canonical/portable export, persistence and deployment policy. Not approved as a complete library delivery. No implementation, distribution, configuration or baseline edits were made by this audit.

Repository: `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib`.

Existing focused tests passed: **5 files / 31 tests**. These passing tests do not exercise the additional failures below.

## L01 — P1: Minimal offline HTML exposes metadata the contract says to omit

Source: `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/export/html.ts:51–55`.

`minimalDocument()` removes node notes only. It retains edge notes, node/edge links and evidence, and arbitrary extensions.

Executed reproduction used a validated document, real bundled standalone runtime, viewer CSS and actual bundled font bytes, with `includeSource:false`:

```text
PRIVATE_EDGE_NOTE: present
PRIVATE_NODE_NOTE: absent
PRIVATE_EXTENSION: present
https://example.com/private: present
receipt.sourceIncluded: false
```

Actual artifact: `/tmp/aesthc-audit-20261002/minimal-export.html` (888,026 bytes). The sentinels are synthetic audit data, not real secrets.

Contract: `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/docs/specs/editable-canvas/05-boundaries.md:27` explicitly states minimal metadata omits undisplayed notes, links/evidence and extensions. `includeSource:false` is not general redaction, but the documented minimal projection still must be implemented.

**Solution:** Centralize an allowlisted export metadata projection shared by portable formats; apply to both nodes and edges, preserve required viewer semantics, remove non-rendered extensions by default. Implement explicit `metadata:'all'` for HTML. In `exportDocument`, `options.metadata` currently appears only in enum validation, not behavior.

**Acceptance:** Seed unique sentinels in every excluded field and inspect all emitted payloads, including `aesthc-document`; source opt-in retains the exact original in a separate source payload.

Probe: `/tmp/aesthc-audit-20261002/probes/aesthc-library-audit.ts`.

## L02 — P1: WebM initialization failures leak resources or leave the promise unresolved

Source: `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/export/motion.ts:78–101,166–180`.

`captureStream()` and `new MediaRecorder()` occur outside `try/finally`. Finally unconditionally awaits an `onstop` event even when `start()` never succeeded.

Executed controlled platform-failure probes, with a valid one-second story:

```text
MediaRecorder constructor throws:
  function rejects "codec failed"
  tracks stopped: 0
  canvas remains 737×304

MediaRecorder.start() throws while state remains inactive:
  promise unresolved after 100 ms
  tracks stopped: 1
  canvas remains 737×304
```

This contradicts the always-release guarantee in `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/docs/guides/viewer.md:84–87`.

**Solution:** Put allocation/initialization in one guarded lifecycle. Track acquired resources and successful start. Do not await events an inactive recorder cannot emit. Handle recorder errors, interrupt image-loading/stop waits on cancellation, validate finite options and pixel limits before allocation.

**Acceptance:** Constructor, captureStream, start and async recorder failures; abort before/during image loading, recording and stopping. All promises settle with diagnostics and all acquired resources release.

These failures were induced using deterministic platform stubs, not observed real codec failures in a browser.

Probe: `/tmp/aesthc-audit-20261002/probes/aesthc-motion-audit.ts`.

## L03 — P1: Authored deployment profiles do not enforce their documented contract

Sources:

- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/editor-core/profiles.ts:23–30`
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/export/index.ts:153–161`

Executed failures:

1. Authored `metadata.engineeringProfile='deployment-ownership'` -> `validateDeploymentProfile(document)` returns `enabled:false`.
2. Same authored profile, missing owner -> explicit enabled validation reports `profile.owner-missing`, but canonical `exportDocument({quality:'publish'})` succeeds.
3. Two owned nodes in different `kind:'region'` groups, connected without crossing metadata -> enabled validation reports `nodes:2, regions:0, crossRegionEdges:0, diagnostics:[]`.

Current implementation reads `region:*` tags, not ancestor membership. It requires owners for external nodes and flags all public nodes, rather than applying the specific declared rules.

Contract: `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/docs/specs/editable-canvas/05-boundaries.md:92`: activation by authored profile, region membership via ancestors, owner exception for external, private database/storage, consistent security groups and crossing metadata.

**Solution:** One authoritative activation/rule implementation; canonical publish must invoke it rather than relying on a viewer checkbox. Align region/external/security-group rules with the contract. Changing the contract instead is an explicit scope change, not full completion.

**Acceptance:** Authored profile persists across save/load and portable HTML; invalid enabled documents cannot publish via any public path; ancestor-region and external-node fixtures verify exact rules.

Probes:

- `/tmp/aesthc-audit-20261002/probes/aesthc-additional-audit.ts`
- `/tmp/aesthc-audit-20261002/probes/aesthc-profile-rules-audit.ts`

## L04 — P1 scope gap: Custom renderers cannot be configured on public interactive components

Sources:

- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/editor/index.tsx:75–88,728`
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/viewer/DiagramViewer.tsx:33–49`

The registry is supported by headless `resolveDocument` and `exportDocument`. But EditorRoot exposes no registry prop/context, EditorSurface resolves without one, and DiagramViewer has no registry prop. HTML/cards/WebM also lack registry options. A valid custom-node document becomes an unavailable placeholder in the supplied editor/viewer. This is a statically verified API integration gap, not a browser reproduction.

**Solution:** Thread per-instance registries through editor/viewer resolution, incremental previews and supported export paths. Define whether offline export bundles trusted renderers or freezes canonical SVG; reject unsupported delivery explicitly.

**Acceptance:** Tarball consumer registers different renderers for the same key in two editors/viewers; both render, move, resize, undo and export independently without placeholders.

## L05 — P2: Custom-node theme ignores export theme overrides

Source: `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/editor-core/scene.ts:248,290–298`.

Custom SVG is generated using `document.presentation.theme.mode`; normal geometry later uses `renderSvg` options.theme.

Executed reproduction: light-mode document + registered custom renderer + `exportDocument({theme:'dark'})` succeeds but contains `data-audit-theme="light"`. Artifact mixes dark standard geometry with light custom geometry.

**Solution:** Use one effective theme for custom and standard rendering; include rendering context in cache keys, or produce theme-dependent custom SVG at render time.

**Acceptance:** Both override directions, mixed custom/standard nodes, simultaneous exports, original document remains unchanged.

Probe: `/tmp/aesthc-audit-20261002/probes/aesthc-library-audit.ts`.

## L06 — P2: Offline HTML theme override is lost when JavaScript starts

Sources:

- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/export/html.ts:64,101,118–123`
- `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/export/standalone.tsx:33–34`

Options.theme affects static SVG/fallback, but embedded runtime document retains its original mode and standalone boot renders that document.

Executed artifact inspection:

```text
export theme: dark
fallback data-theme: dark
embedded runtime document theme: light
```

**Solution:** Carry an explicit effective theme into standalone runtime without mutating optional canonical source. Keep fallback, chrome and geometry consistent.

**Acceptance:** JavaScript on/off; both override directions remain visually identical through loading/hydration.

Probe: `/tmp/aesthc-audit-20261002/probes/aesthc-html-theme-audit.ts`.

## L07 — P2: Cards accept invalid padding and return successful invalid SVG

Source: `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/export/cards.ts:87–93`.

Executed results:

| padding  | result                                                 |
| -------- | ------------------------------------------------------ |
| NaN      | success, translate(NaN NaN) scale(NaN)                 |
| Infinity | success, translate(Infinity Infinity) scale(-Infinity) |
| 400      | success, negative scale -0.5592…                       |
| -1       | negative padding accepted                              |

**Solution:** Require finite nonnegative padding less than half the short canvas dimension; reject unusable content areas and invalid options before scene work.

**Acceptance:** Boundaries/N+1, NaN/Infinity/negative cases return diagnostics, never success receipts or invalid transforms.

Probe: `/tmp/aesthc-audit-20261002/probes/aesthc-library-audit.ts`.

## L08 — P2: One malformed saved key prevents listing healthy documents

Source: `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/persistence/index.ts:183–200`.

`decodeURIComponent()` is covered by a whole-list catch rather than per-entry handling.

Executed reproduction: valid saved entry plus same-namespace key `adl-document-v1:audit:%zz` -> `list()` returns `storage.denied`. Removing malformed key returns the healthy entry immediately.

**Solution:** Treat malformed encoded keys as unreadable entries; skip/quarantine individually, preserve healthy entries, reserve storage.denied for actual denied access.

**Acceptance:** Healthy documents remain listable with corrupt envelopes and malformed keys present; corruption is not overwritten or misreported as permissions failure.

Probe: `/tmp/aesthc-audit-20261002/probes/aesthc-additional-audit.ts`.

## Verification executed and limits

```sh
export PATH=/Users/alansalazar/.nvm/versions/node/v22.23.2/bin:$PATH
pnpm exec vitest run \
  tests/editor-export.unit.spec.ts \
  tests/editor-persistence.unit.spec.ts \
  tests/editor-renderers.unit.spec.ts \
  tests/editor-motion.unit.spec.ts \
  tests/editor-share.unit.spec.ts \
  --maxWorkers=1 --no-file-parallelism
```

Result: **31 tests passed, 5 files passed**. Run reported duration 2.68 s.

Each retained probe was executed with `pnpm exec tsx /tmp/<probe-name>.ts`; all final probes completed. The initial motion fixture used a duration below the contract minimum and was rejected; the final retained probe uses a validated 1-second story and reproduces both lifecycle defects.

No browser, complete build, real-codec failure or exhaustive configuration permutation was run by this sub-audit. Root agent owns browser/full-suite validation. Existing passing tests and these additional failing probes must be reported separately.

## Key Learnings:

1. Headless registry/export success does not establish interactive customization.
2. Portable artifacts need shared metadata, theme and policy enforcement.
3. Resource cleanup must cover failures before recording starts.
