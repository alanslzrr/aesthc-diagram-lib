# Release runbook

## Before publishing

1. Use the supported development runtime and frozen pnpm lockfile. Run `pnpm check`
   and the browser matrix. Inspect bundle budgets, dependency audit, notices and
   generated documentation. Record unavailable checks; do not mark them passed.
2. Prepare a focused version/changelog PR. Confirm manifest, docs, schemas and
   examples agree on the version. Tag only the exact reviewed commit.
3. Confirm npm scope ownership and maintainer authentication. For the first
   publication, npm may require an interactive login/bootstrap. Never store npm
   credentials in this repository or include OTPs in command logs.
4. Configure npm trusted publishing for this GitHub repository and release workflow
   after the package exists, using current npm documentation and required runtime.
   OIDC needs `id-token: write`; ordinary CI must not receive publishing permissions.
5. Confirm SECURITY/CoC contacts, branch/tag protection and public release approval.

## Publish

Run `pnpm release:check` on the exact candidate. Inspect `npm pack --dry-run --json`.
The `release.yml` workflow is dispatched manually on an existing reviewed version tag (not on `main`) and validates that its version tag matches the
manifest. It builds/checks before publishing with provenance and public access.
If initial trusted publishing cannot be configured until the package exists, the
maintainer must perform an authenticated first publish of the verified artifact.
Do not replace this with an unreviewed long-lived token committed to workflow files.

Verify anonymous `npm view @aesthc/diagram-lib@VERSION` and install into a clean
consumer. The package checksum must match the artifact produced from the tag.
Create GitHub release notes from the actual diff, including migrations, validation
and known limitations. Historical Git tags do not prove historical npm publication.

After anonymous registry verification, set `diagramRelease.channel` to `stable`
and `diagramRelease.npmAvailable` to `true` in the release follow-up and regenerate docs.
Deploy the matching static docs; `DOCS_CHANNEL`, if supplied, must match that metadata. Re-run the human and
agent onboarding from the public URL, not local aliases. Check JS-disabled docs,
Markdown, llms indexes, schemas, OG metadata and the seven playground types.

## Partial failure and recovery

A published npm version is immutable. Before retrying, inspect npm and GitHub:
never move a tag or overwrite a version. If npm succeeded but GitHub release/docs
failed, complete those steps using the existing version. For a faulty artifact,
publish a corrected new version and deprecate the affected one when appropriate.
Restore the last known-good Pages deployment if necessary. Changing `latest` may
help consumers temporarily, but does not remove an installed faulty version.

## Policy

Pre-1.0 minor versions may include documented breaking changes. Security support
targets the latest published minor. Do not promise arbitrary backwards compatibility,
response SLAs or browser/framework versions that were not verified. Publish notes
and migrations alongside the code, not retrospectively from memory.

The npm trusted publisher must name `alanslzrr`, `aesthc-diagram-lib`,
`release.yml`, and environment `npm`. Configure environment approval before enabling
publication. See [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).
The workflow publishes the exact verified tarball; it does not create or move tags,
write GitHub release notes, or declare candidate docs stable automatically.

Visual comparisons use `pnpm test:visual` against reviewed Chromium baselines.
Functional browser tests run independently of platform-specific screenshot baselines.

After verifying a stable docs build, run `pnpm docs:freeze VERSION` in the release
follow-up. This validates `snapshot.json` checksums before copying the complete
version directory into `site/public/versions/VERSION`; existing versions are rejected. These immutable
snapshots are carried into future builds; the generator will not overwrite a
frozen version. Versioned documentation links stay within that version and
source links target its Git tag. The directory contains HTML, page data, Markdown,
search, scripts/styles, fonts, examples, schemas, notices and agent indexes.
`contentBase` scopes resources/search/downloads; `base` remains the deployment root.
Frozen HTML/CSS uses relative resource/navigation URLs; client payloads derive the
serving prefix without rewriting the archive. The fixture also changes the base
between A and B to cover local and Pages consumption.
Do not freeze a candidate as a stable release. Run `pnpm test:snapshots` to verify
A survives a changed B build with and without JavaScript. Never edit a frozen
snapshot to repair drift; use a new version.

Transfer budgets gate total site JavaScript at 175 KiB gzip, CSS at 12 KiB gzip,
and the package at 2 MiB packed / 8 MiB unpacked. These are regression ceilings,
not performance scores; changes require measured justification.

## Documentation pipeline

`pnpm site:build` builds the package-consuming playground, renders seven validated
SVG illustrations through public exports, then builds the dedicated `/docs/` site.
The same Markdown supplies HTML pages, heading navigation and the local search
index. `site/docs` owns the responsive shell, theme and progressive enhancements;
reading, links and complete examples do not depend on browser JavaScript.

After editing navigation, check every page, heading link and download, including
`/agents/` and versioned routes. Test both themes, mobile navigation, package-manager
persistence and clipboard/search failure states. `pnpm test:e2e` covers these flows.
Run a Pages-base build with `SITE_BASE=/aesthc-diagram-lib/`; all local assets and
links must retain that prefix. Refresh visual baselines only after reviewing
intentional design changes, then rerun comparisons without updating snapshots.

## Public artifact verification

After an explicitly authorized publication, run the read-only verifier with the
exact tarball retained from the reviewed tag:

```sh
node scripts/verify-public-release.mjs /absolute/path/aesthc-diagram-lib-0.3.0.tgz
```

It fetches the version and archive anonymously, checks identity and SHA-512 against
both registry metadata and the reviewed tarball, then runs the isolated runtime
and declaration consumer tests on the downloaded artifact. It does not publish,
create a tag or change candidate metadata. The release workflow performs this in
a separate read-only job after publishing, without OIDC publishing permissions.

After deploying and freezing the matching stable documentation, include its base:

```sh
node scripts/verify-public-release.mjs /absolute/path/aesthc-diagram-lib-0.3.0.tgz https://alanslzrr.github.io/aesthc-diagram-lib/
```

This additionally rejects candidate, mismatched or untraceable snapshots and checks
version-local human/agent/schema endpoints. A registry-only success is not proof
of complete release readiness. A failed follow-up never republishes automatically.

## Deployment gates

Pages runs only after a successful **push-to-main CI** workflow, checks out that
workflow's exact SHA and rejects it if main has moved. CI includes functional
browser tests, the React 18 consumer, framework consumers, visual comparisons and
a separate Node 20.19.0 minimum-consumer job. Pull-request and manually dispatched
CI runs cannot trigger Pages. The build records version/channel/SHA in
`deployment.json`; the deployment verifies that public revision and docs/agent
endpoints with bounded retries. A failed smoke test requires investigation or an
explicit rollback, not a claim that deployment succeeded.

## Presentation assets

Rebuild the site, then explicitly regenerate the seven standalone Geist SVGs and
1200×630 social image from the public playground UI:

```sh
pnpm site:build
UPDATE_PRESENTATION_ASSETS=1 pnpm exec playwright test tests/e2e/presentation-assets.e2e.ts --project=chromium
```

Review the images before committing. This command is opt-in and is skipped in
ordinary CI; CI must never silently accept newly generated screenshot baselines.
Font and icon notices remain preserved, including historical font licenses.
