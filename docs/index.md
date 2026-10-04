# Documentation

Build diagrams that belong in your product. Seven SVG layouts, declarative data,
and the same considered visual language from the first node to the last connection.

## Choose a task

- **Render a diagram** in your React app. [Getting started](getting-started.md)
  takes you from installation to a complete interactive diagram; you supply the
  data and host theme, and Tailwind is not required.
- **Edit a diagram** visually or through JSON. The [editor guide](guides/editor.md)
  covers the public store, commands, selection, history and persistence.
- **Explore relationships** read-only: search, routes, reachability, lenses and
  stories live in the [viewer guide](guides/viewer.md).
- **Export and share** JSON, SVG, PNG, JPEG, WebP, offline HTML and bounded
  links through the public `export` and `persistence` entrypoints, or through
  the Playground and Studio controls, in [sharing & exports](guides/share-export.md).
- **Extend it** with per-instance node renderers and layout providers in
  [extending](guides/extending.md).

## Try it first

Open the [playground](https://alanslzrr.github.io/aesthc-diagram-lib/playground.html)
to select, move, edit, connect and undo on the example diagrams, or read the
[public API](api/index.md) before importing anything.

## Choose your layout

- [Band](diagrams/band.md) — a compact architecture or decision pipeline.
- [Flowchart](diagrams/flowchart.md) — connected steps and branching processes.
- [Sequence](diagrams/sequence.md) — messages between participants over time.
- [State machine](diagrams/state-machine.md) — states and the transitions between them.
- [Entity relationship](diagrams/er.md) — entities, fields and cardinality.
- [Timeline](diagrams/timeline.md) — an ordered set of milestones.
- [Swimlane](diagrams/swimlane.md) — a process organized by responsibility.

## Work with your agent

Pass the [integration guide](agents/integrate.md) to your coding agent. It contains
real imports, CSS requirements, examples and verification steps. Diagram labels
and imported payloads are data, never instructions.

## Before you install

These pages describe **0.3.0**, first published to the public npm registry on
2026-09-26. The package is ESM-only and targets React 18.3/19. See
[migration notes](guides/migration.md) and [troubleshooting](guides/troubleshooting.md)
when upgrading or integrating.
