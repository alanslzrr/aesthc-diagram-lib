# Shared registry identity across package entrypoints

- Date: 2026-09-13
- Status: accepted; implemented; public availability is tracked separately
- Baseline: `62049effea727f95c84e7ee0d931a57443dca9e2`
- Scope: shared registry identity in the distributed ESM package

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

## Verification and consequences

Installed-package tests, rather than source aliases, verify shared registry identity,
registration and lookup across public entrypoints, showcase rendering and TypeScript
resolution. The pure layout graph remains importable under the React server condition.
See [Contributing](../../CONTRIBUTING.md) for current commands and
[Support](../guides/support.md) for dated verification scope.

- Commit regenerated chunks with the entrypoints that import them.
- Install the whole package, never isolated distribution files.
- Registry sharing does not cross installations or provide request-scoped isolation.
- Tarball consumers supplement unit tests; neither substitutes for browser checks.

The initial Node/version/test-count observations are historical evidence in Git,
not the current compatibility or release status.
