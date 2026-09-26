# Support and verification

Declared consumer targets: ESM, Node **20.19+**, React and React DOM
**`^18.3.1 || ^19.0.0`**. Development uses Node 22.14+ and the manifest's pnpm version.
Declared ranges are not proof that every version or environment has been tested.

## Recorded baseline

The 2026-09-14 audit of commit `57c99597` recorded these checks:

| Environment            | Verified scope                                       | Evidence / limitation                                                         |
| ---------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| Node 22.23.2, React 19 | Installed tarball, runtime, declarations and layouts | Audit baseline; not a public registry release                                 |
| React 18.3.1           | Installed tarball, NodeNext/Bundler declarations     | Exact peer minimum, not all React 18 versions                                 |
| Vite 7.3.6             | Consumer build, hydration, styles, keyboard          | One tested version                                                            |
| Next.js 15.5.25        | App Router build, hydration, styles, keyboard        | Does not certify all Next versions                                            |
| Chromium/mobile Chrome | Local browser and selected visual checks             | Emulated mobile, not a physical device                                        |
| Firefox/WebKit         | Remote CI browser checks                             | No fresh local browser execution in that audit                                |
| Node 20.19.0           | Declared consumption minimum                         | Not run at this historical baseline; now covered by the minimum-consumer gate |

Remote baseline: [merge CI](https://github.com/alanslzrr/aesthc-diagram-lib/actions/runs/34830258592).
New PR validation must state its own SHA, versions, commands and results rather
than treating this dated baseline as current certification.

0.3.0 was first published to the public npm registry on 2026-09-26. Passing
tests, tags and repository files alone do not establish public availability;
verify the installed artifact as described in
[the release runbook](../maintainers/releasing.md).

## Current verification gates

CI builds with Node 22, then installs and tests the tarball with the exact
consumer minimum Node 20.19.0 and React 18.3.1. The required contracts job fails if
that minimum consumer does not succeed. Runtime and declaration checks do not
certify every version admitted by the peer range.

Visual comparisons use Ubuntu 24.04 and the lockfile-pinned Playwright Chromium,
with separate Linux references; macOS references are supplementary local checks.
Functional Firefox, WebKit and mobile-emulation checks remain part of the browser
matrix. No screenshot baseline or browser emulation establishes physical-device
coverage. See the [release runbook](../maintainers/releasing.md) for promotion and
public-artifact verification requirements.
