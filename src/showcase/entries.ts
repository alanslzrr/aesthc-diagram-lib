import type { ShowcaseEntry } from './Showcase'

/**
 * Default showcase lineup — one entry per supported diagram type.
 * Localized copy is provided by the host (see DiagramShowcase props);
 * the English defaults below match the library's example diagrams.
 */
export const DEFAULT_SHOWCASE_ENTRIES: ShowcaseEntry[] = [
  {
    key: 'example-band',
    title: 'Band',
    description:
      'Vertical columns with centred card stacks and bezier edges between bands — the layout of the Validation Orchestrator and Quote Agent case studies.',
  },
  {
    key: 'example-flowchart',
    title: 'Flowchart',
    description:
      'Top-down or left-right levels assigned by topological order, with vertical links and branch pills for failures and rollbacks.',
  },
  {
    key: 'example-sequence',
    title: 'Sequence',
    description:
      'Participants as vertical lifelines with horizontal messages and activation bars, from a checkout to a webhook reconciliation.',
  },
  {
    key: 'example-state-machine',
    title: 'State machine',
    description:
      'States on a ring with curved transitions, self-loops, double-outline initial states and hollow final states.',
  },
  {
    key: 'example-er',
    title: 'ER / data model',
    description:
      'Entities as typed tables in a grid — primary keys, foreign keys and unique constraints — connected by labelled relations.',
  },
  {
    key: 'example-timeline',
    title: 'Timeline',
    description:
      'A dashed central spine with events alternating above and below it, from an internal kickoff to a public launch.',
  },
  {
    key: 'example-swimlane',
    title: 'Swimlane',
    description:
      'Labelled horizontal lanes for cross-team flows, with edges that cross lanes when work hands off.',
  },
]
