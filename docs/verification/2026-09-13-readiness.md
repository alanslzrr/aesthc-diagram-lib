# OSS readiness — local execution evidence

Date: 2026-09-13. Candidate: `@aesthc/diagram-lib@0.3.0`.
This is not a release announcement or a claim that the full plan is complete.

## Implemented locally

- Shared registry bundles and isolated tarball runtime/declaration tests.
- Relation identity, parallel-edge highlighting and activation collision fixes.
- Type-derived schemas, standalone structural validation and semantic checks.
- JSON-only editor, bounded versioned sharing, locale drafts, export errors.
- Seven generated runnable examples, README, API/type guides and static docs.
- Root AGENTS.md, single integration guide, Markdown and llms indexes.
- Public package metadata and approved security/conduct email contact.
- Community templates, support policy, roadmap and third-party license notices.
- Package-export-backed playground, mobile/keyboard/contrast improvements.
- CI/deploy/release workflows, generated checks and transfer budgets.

## Executed successfully

- 59 unit tests, including identity/Unicode and bounded-share regressions.
- Seven installed-tarball tests with React 19; seven layouts under react-server.
- Seven installed-tarball tests with React 18.3.1.
- Published declarations and all seven TSX examples compile with NodeNext/Bundler.
- Real Vite 7.3.6 and Next.js 15.5.25 production consumers build, hydrate, load
  distributed CSS and respond to keyboard selection.
- Six Chromium desktop E2E tests and six Pixel 7 Chromium emulation E2E tests.
- Axe serious/critical checks pass on the tested default flowchart page. This is
  not a manual screen-reader audit or complete WCAG certification.
- Desktop screenshots regenerated without fixed navigation obscuring diagrams.
- Source/site typechecking, package/site build and 16 static documentation pages.
- Final `pnpm check` passed end-to-end, including ESLint, Prettier, generated
  schemas/docs checks, typechecks, 59 unit tests, tarball tests, build and budgets.
- Dependency audit: zero reported vulnerabilities at the time of execution.
- Latest site assets: 153,868 bytes JS gzip and 7,250 bytes CSS gzip.
- Final tarball dry-run: 151,167 packed bytes, 894,401 unpacked bytes, 121 files.
- Chromium visual comparisons passed against all 14 refreshed baselines at a
  0.1% pixel-difference ceiling; functional tests also passed without baseline updates.

## Still required before closing the plan

- Final clean-commit checks, review of all generated artifacts and local changes.
- Require a successful final remote CI run for the reviewed commit. The first
  GitHub run passed all 45 browser tests (Chromium, Firefox, WebKit and mobile
  profiles), then exposed a missing Node type dependency in the isolated Next.js
  consumer. That dependency is now explicit; the corrected consumer also passes
  locally with `CI=1`. See [PR #5](https://github.com/alanslzrr/aesthc-diagram-lib/pull/5)
  for the current required-check result.
- Manual screen-reader/high-contrast/zoom review and broader visual review.
- Broader security/CSP review beyond the executable-data lint rules.
- Cold-start agent evaluation: no independent agent evaluation was performed.
- Review [PR #5](https://github.com/alanslzrr/aesthc-diagram-lib/pull/5) and verify
  its required check before merging. Remote security settings are already applied.
- Freeze versioned docs at release; verify links from the public deployed URL.
- npm authentication and scope ownership, trusted publisher/environment setup.
- Publish immutable artifact/tag/release, deploy stable docs and verify anonymous
  installation from the actual registry rather than a local tarball.
- GitHub social image/settings verification; optional historical release notes.

The maintainer approved public visibility, version 0.3.0 and contact
`alansalazarfg2@gmail.com` / GitHub `alanslzrr`. npm currently reports `ENEEDAUTH`.
GitHub push/PR/security protection was explicitly authorized on 2026-09-13.
Dependency alerts/fixes, private vulnerability reporting, secret scanning and push
protection are enabled. Main requires a pull request, the up-to-date
`Contracts and package` check, and resolved conversations; force-push and deletion
are disabled, including for administrators. No additional reviewer is required
for the solo-maintainer workflow.
The implementation is being submitted as a pull request. No tags or npm releases
have been created. Remote CI results must be checked separately.
The original checklist remains conservative: do not mark a workpackage complete
merely because some implementation files exist. W15 remains optional backlog.
