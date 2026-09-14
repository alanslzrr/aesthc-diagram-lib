# Shared registry identity across package entrypoints

- Date: 2026-09-13
- Status: implemented locally; not released
- Baseline: `62049effea727f95c84e7ee0d931a57443dca9e2`
- Scope: first distribution regression from W01/W02 of the open-source readiness plan

## Problem

The package exposes root, registry, examples and showcase entrypoints. With
`splitting: false`, tsup bundled a separate copy of the registry module into each
entrypoint. Each copy owned a different `Map`.

Source-level tests passed because they imported a single source module graph.
Installing the tarball outside the workspace reproduced four failures:

1. Root and registry exported different registry function instances.
2. Registering examples did not make them available through root or registry.
3. Registration through root could not be read through the registry subpath.
4. Showcase could not render a custom diagram registered through root.

## Decision

Enable ESM splitting in the existing tsup build. The public entrypoints import a
shared internal registry chunk. Keep public imports and types unchanged; internal
chunk filenames are not public API. The mechanism uses the existing bundler's
[code splitting support](https://tsup.egoist.dev/#code-splitting).

Enable clean output before building so obsolete hashed chunks cannot accumulate
in the tarball. The existing CSS step runs after tsup and recreates the stylesheet.
Continue adding `use client` to the public canvas and showcase entrypoints.

Do not use a `globalThis` singleton. Registry identity is shared within one physical
package installation and module graph, not between separate installations,
processes, workers or server/client graphs. This change does not provide
request-scoped isolation for server applications.

## Public contract inventory

No exports, version, peer ranges, runtime requirements or publication visibility
are changed in this increment.

| Subpath | Responsibility |
|---|---|
| Root | Types, theme, common layout helpers and registry |
| `/registry` | Registration and lookup |
| `/types` | Diagram data types; runtime module may be empty |
| `/theme` | Geometry and theme constants |
| `/layout` | Common layout, identity and connectivity helpers |
| `/layouts` | Layout dispatcher and per-type layout functions |
| `/layouts/band` | Dedicated band layout entrypoint |
| `/canvas` | Interactive SVG rendering; client entrypoint |
| `/examples` | Example data and explicit example registration |
| `/showcase` | Interactive showcase; client entrypoint |
| `/styles.css` | Generated layered stylesheet |

`/showcase/entries` is not currently an export. Its documentation mismatch remains
an open task; this fix does not introduce that subpath or claim it is available.

## Regression harness

`pnpm test:package` builds the package, creates an npm tarball with lifecycle scripts
disabled, and installs it in a temporary consumer outside the workspace. The
consumer verifies that import resolution points inside that installation.

Seven runtime checks cover resolution, shared registration and replacement,
example visibility, custom showcase SSR, declared export targets and client
directives. A separate process imports core/examples/layouts under the
`react-server` condition and computes all seven layouts. TypeScript checks every
JavaScript export and a typed React consumer with both NodeNext and Bundler
resolution, using the installed declarations without `skipLibCheck`.

CI runs the harness after its existing build. It also rejects untracked generated
chunks, in addition to modifications and deletions of tracked output.

### Scope of evidence

- Initial source baseline: 29 tests passed despite the four package failures.
- Fixed package: seven runtime checks pass; seven layouts execute under the
  server condition; declarations compile with NodeNext and Bundler resolution.
- Local execution environment: Node 25.9.0, pnpm 10.29.3, React/React DOM 19.2.8,
  TypeScript 5.9.3 and tsup 8.5.1.
- Existing CI configuration uses Node 20; a remote run is not implied by editing
  its workflow. React 18 and an actual Next App Router application remain pending.
- The consumer pins direct React/compiler versions to the installed workspace
  versions. Transitive consumer dependencies resolve through npm; this is an
  installed-package smoke test, not yet a fully locked compatibility matrix.
- Styles are checked for presence and their layer declaration. This does not
  replace browser validation of a host without Tailwind.

## Baseline publication checks

At execution start, remote `main` still matched the baseline commit. Anonymous npm
metadata lookup still returned HTTP 404 for `@aesthc/diagram-lib`. The local
manifest remains version 0.2.2 with restricted publication configuration.

This result does not establish whether the npm scope/name is available or private.
Account ownership, final support matrix, release number and public publishing
remain decisions before launch, not side effects of this fix.

## Consequences and follow-up

- Check in generated chunks together with the entrypoints that import them.
- Consumers must install the package, not copy isolated distribution entry files.
- The pure graph must remain importable without loading interactive React modules.
- The new `test:package` command requires npm and registry access and currently
  supplements, rather than replaces, unit and browser tests.
- Complete W00 compatibility decisions, W01 browser/README fixtures and the rest
  of W02 exports/CSS/publication preparation separately.
- Continue with relation identity collisions, followed by runtime data validation
  and compilable onboarding. These defects are not fixed by shared registry state.
