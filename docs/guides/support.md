# Support and verification

Declared consumer targets: ESM, Node **20.19+**, React and React DOM
**`^18.3.1 || ^19.0.0`**. Development uses Node 22.14+ and the manifest's pnpm version.
Declared ranges are not proof that every version or environment has been tested.

## Recorded baseline

The 2026-09-14 audit of commit `57c99597` recorded these checks:

| Environment | Verified scope | Evidence / limitation |
|---|---|---|
| Node 22.23.2, React 19 | Installed tarball, runtime, declarations and layouts | Audit baseline; not a public registry release |
| React 18.3.1 | Installed tarball, NodeNext/Bundler declarations | Exact peer minimum, not all React 18 versions |
| Vite 7.3.6 | Consumer build, hydration, styles, keyboard | One tested version |
| Next.js 15.5.25 | App Router build, hydration, styles, keyboard | Does not certify all Next versions |
| Chromium/mobile Chrome | Local browser and selected visual checks | Emulated mobile, not a physical device |
| Firefox/WebKit | Remote CI browser checks | No fresh local browser execution in that audit |
| Node 20.19.0 | Declared consumption minimum | Dedicated minimum-runtime smoke still pending |

Remote baseline: [merge CI](https://github.com/alanslzrr/aesthc-diagram-lib/actions/runs/34830258592).
New PR validation must state its own SHA, versions, commands and results rather
than treating this dated baseline as current certification.

The current 0.3.0 candidate is not yet available on npm. Passing tests, tags and
repository files do not establish public availability. See [the release runbook](../maintainers/releasing.md).
