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

Deploy the matching static docs with `DOCS_CHANNEL=stable`. Re-run the human and
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

After verifying a stable docs build, copy its `site/dist/versions/VERSION` folder
into `site/public/versions/VERSION` in the release follow-up. These immutable
snapshots are carried into future builds; the generator will not overwrite a
frozen version. Versioned documentation links stay within that version and
source links target its Git tag. Do not freeze a candidate as a stable release.

Transfer budgets gate total site JavaScript at 175 KiB gzip, CSS at 12 KiB gzip,
and the package at 2 MiB packed / 8 MiB unpacked. These are regression ceilings,
not performance scores; changes require measured justification.
