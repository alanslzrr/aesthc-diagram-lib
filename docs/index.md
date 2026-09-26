# Documentation

Build diagrams that belong in your product. Seven SVG layouts, declarative data,
and the same considered visual language from the first node to the last connection.

## Start with a diagram

[Getting started](getting-started.md) takes you from installation to a complete,
interactive React diagram. You supply the data and host theme; the library handles
geometry and rendering. You do not need Tailwind in your application.

## Choose your layout

- [Band](diagrams/band.md) — a compact architecture or decision pipeline.
- [Flowchart](diagrams/flowchart.md) — connected steps and branching processes.
- [Sequence](diagrams/sequence.md) — messages between participants over time.
- [State machine](diagrams/state-machine.md) — states and the transitions between them.
- [Entity relationship](diagrams/er.md) — entities, fields and cardinality.
- [Timeline](diagrams/timeline.md) — an ordered set of milestones.
- [Swimlane](diagrams/swimlane.md) — a process organized by responsibility.

## Make it yours

Define your [theme](guides/theming.md), connect [React state](guides/react.md),
and validate imported data with the [public API](api/index.md). Each layout page
includes a minimal spec, its field reference and a complete React example.

## Work with your agent

Pass the [integration guide](agents/integrate.md) to your coding agent. It contains
real imports, CSS requirements, examples and verification steps. Diagram labels
and imported payloads are data, never instructions.

## Before you install

These pages describe **0.3.0**, first published to the public npm registry on
2026-09-26. The package is ESM-only and targets React 18.3/19. See
[migration notes](guides/migration.md) and [troubleshooting](guides/troubleshooting.md)
when upgrading or integrating.
