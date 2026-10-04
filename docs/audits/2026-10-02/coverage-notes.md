# Supplemental library coverage notes — 2026-10-02

Read-only follow-up to `library.md`. The existing L01–L08 findings remain unchanged. Reviewed the copies in `docs/audits/2026-10-02/`; no implementation, browser, build or baseline changes were made here. New probes below are retained under `/tmp/aesthc-audit-20261002/probes/`.

## Verification executed

```sh
export PATH=/Users/alansalazar/.nvm/versions/node/v22.23.2/bin:$PATH
pnpm exec vitest run tests/editor-compare.unit.spec.ts tests/editor-evidence.unit.spec.ts tests/editor-layout-provider.unit.spec.ts tests/editor-providers.unit.spec.ts --maxWorkers=1 --no-file-parallelism
```

**4 files / 16 tests passed**. This is additional to the earlier 5 files / 31 tests. These 16 tests cover exact node-ID matching, label versus placement changes, sequence reorder, incompatible diagram types, declared-versus-verified status, rejected references, provider stale revisions/request IDs, unknown nodes, locks, failures and retry. They do not cover the negative probes below.

## C01 — P2: Comparison silently omits several real document changes

Source: `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/graph/compare.ts:89–92,114–148`.

Executed four separate mutations of otherwise equal validated documents:

- Change `spec.caption`.
- Add node metadata with a different owner and `database` role.
- Add a scene group containing a node.
- Add a named view focusing a node.

Each `compareDocuments` call returned success with all counts zero, empty node/edge lists and empty presentation changes. The implementation compares node/edge spec objects, their placements/routes, and document presentation/mode/zOrder only. It does not compare the remainder of the document.

**Implication:** The current API is not a complete document comparison despite its name and “exact structural comparison” description. This does not invalidate the existing exact-ID behavior; it limits its scope.

**Solution:** Define and implement document-level semantic/presentation fields, group/view/story metadata deltas, and update the comparison UI/receipt to expose them. If intentionally excluding fields, return an explicit unsupported/omitted-fields inventory rather than implying no differences.

**Acceptance:** Field-by-field mutation matrix including caption, legend, metadata, groups, views, story, locale and extensions; genuine equality must be distinguishable from unexamined content.

## C02 — P2: Evidence verifier cannot verify the declared line range through its callback contract

Source: `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/editor-core/evidence.ts:23–29,106–113`.

`TrustedVerifier.verify` receives repository, commit, path and optional blob SHA, but **not startLine/endLine**. Its `match` response marks the whole declared reference verified.

Executed probe used a valid full 40-character commit and declared lines 999999–1000000. The callback received only repository/commit/path and returned a file-match result. The receipt was `verified`, although the callback had no line range to check.

Contract: `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/docs/specs/editable-canvas/05-boundaries.md:90` requires exact repo/commit/blob/range verification.

**Solution:** Include the declared range in trusted verifier input and define matching all supplied coordinates; optionally distinguish file identity verification from range/content verification. The public Evidence React component currently shows declared-only data, which avoids falsely displaying these receipts but also means verified receipts are not integrated into that component.

**Acceptance:** Existing file with a range beyond its line count must not become fully verified; different requested ranges are received by the verifier. Exceptions/mismatch/unavailable stay non-verified.

**Confirmed positive:** Full document validation rejects a short 7-character commit. Although an internal helper regex looks broader, this is **not** an exposed short-commit validation bug. Hostile paths/schemes are rejected; no implicit network access occurs.

## C03 — P2: Registered provider failure isolation does not protect the original document

Source: `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/editor-core/providers.ts:70–80`.

`provider.run` receives the original mutable input object. Executed a trusted provider that changes `document.spec.caption` then throws. Outcome was `rejected`, but input and returned last-good caption were already `MUTATED BEFORE FAILURE`.

**Solution:** Pass an isolated snapshot, ideally deeply frozen in development; validate the original before delegation and publish only a validated returned result. Trusted means authorized code, not infallible code.

**Acceptance:** Mutation-then-throw and mutation-then-invalid-result leave the caller’s complete input byte-equivalent to its initial state. Continue preserving stale-result and locked-node tests.

## C04 — P2: Already-aborted layout work still starts with a non-aborted signal

Source: `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/editor-core/providers.ts:67–75,88`.

Executed `runRegisteredLayout` with a signal aborted before invocation. The provider still ran, observed `signal.aborted === false`, then the wrapper returned `operation.aborted` after the work completed. Adding an abort event listener after abort does not replay the earlier event.

**Solution:** Check before provider invocation; forward initial aborted state, detach the abort listener in finally, and define bounded cancellation for providers that do not settle.

**Acceptance:** A pre-aborted request never calls provider.run; during-flight abort reaches the supplied signal; settled calls do not retain listeners.

The provider signature returns `DiagramScene`, but `applyLayoutResult` currently applies only nodes and zOrder while forcing manual mode. Routes/groups in returned scenes are ignored. This is an additional API scope limitation to document or implement, not a newly executed negative probe.

## C05 — Share codec: core bounds work, but the claimed timeout is not a hard deadline

Source: `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/persistence/share.ts:45–52,69–72`.

Confirmed existing coverage: document/legacy round trips, future versions, malformed payloads, expansion bombs and encoded-size limits. `reader.releaseLock` runs on settled paths.

The clock is checked only before `await reader.read()`. The existing timeout test advances an injected clock before the first read, so it does not test a pending read.

Executed controlled stalled-decompressor probe: `timeoutMs:5` remained unsettled after 80 ms and reader cancellation was false. This is a **platform-stub fault test**, not a claim that the native browser codec normally hangs.

**Solution:** Race pending read against a real deadline/cancel signal; cancel and release without awaiting unbounded cancellation. Add a pending-read deadline regression alongside existing expansion tests.

## Offline CSP: implemented network restriction, not the contracted hash-only script policy

Source: `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/src/export/html.ts:112`.

Current policy has `default-src 'none'`, `connect-src 'none'`, data fonts/images, base/form restrictions, **and `script-src 'unsafe-inline'`**. Contract `/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/docs/specs/editable-canvas/05-boundaries.md:44` calls for computed internal-script hashes.

Existing HTML browser tests inspect zero external requests, valid offline viewer interaction, no-JS fallback and escaped hostile labels. Those tests do not establish hash-based script integrity. Do not describe the current policy as the complete contracted CSP. No active label-to-script exploit was found here; authored labels are escaped.

**Solution:** Hash the exact bundled runtime and allow only those hashes, retain required documented style allowances, and verify an extra inline script is blocked while legitimate boot works. Runtime/CSS inputs must be explicitly documented as trusted code inputs, not untrusted document fields.

## Fonts, raster and cancellation: scope limits, not newly claimed visual failures

- Canonical `exportDocument` embeds supplied font bytes and uses scoped per-export families for measurement. Existing required/fallback/error tests cover the basic paths.
- Font readiness waits are not signal-aware and have no timeout (`src/geometry/text.ts:105–112`; export awaits ready before disposing). This follow-up did not reproduce a naturally stalled font load.
- HTML embeds font declarations, but resolves geometry synchronously with the host canvas/estimator before the embedded faces load. The current browser test waits for fonts to load afterward; it does not compare fallback and hydrated geometry for long labels.
- Cards and WebM expose no font-byte/font-policy option. Their SVG image input does not include embedded font declarations, unlike canonical SVG/raster export. Consequently their exact portable Geist typography is **not certified** by canonical export font tests. Pixel parity was not tested in this follow-up.
- Raster `toBlob` completion is checked for cancellation afterward, not raced with abort. Image loading has a signal handler. No naturally stalled encoder was reproduced.
- Previously confirmed WebM lifecycle failures remain L02; do not dilute them into a generic limitation.

**Solution:** Shared asset-preparation and rasterization context for all export products, explicit font policy and platform limits, signal-aware readiness/encoding, and artifact-based typographic parity tests. Keep fallback diagnostics truthful.

## Retained evidence

- `/tmp/aesthc-audit-20261002/probes/aesthc-coverage-audit.ts` — comparison, evidence callback, mutation failure and pre-abort probes.
- `/tmp/aesthc-audit-20261002/probes/aesthc-share-deadline-audit.ts` — controlled stalled decompressor deadline probe.

No browser matrix, new build, real font-loading fault, raster pixel/font comparison or real decompressor hang was executed in this supplemental pass.

## Key Learnings:

1. An exact-ID comparator can still omit entire categories of document changes.
2. Verification cannot establish coordinates that are not passed to the verifier.
3. Latest-wins checks protect publication, but do not alone isolate input mutation or pre-aborted work.
