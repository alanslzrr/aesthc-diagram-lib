// Canonical documentation model, authored with the real Heyo Docs config
// builder (@heyo-sh/heyo-docs@3.3.0, MIT). The static docs pipeline in
// scripts/docs consumes this manifest; see docs/maintainers/heyo-integration.md
// for the reuse map and the limitations of the runtime shell in this stack.
import { heyoDocs } from '@heyo-sh/heyo-docs/config'

export default heyoDocs({
  title: 'aesthc diagram library',
  description:
    'Seven SVG diagram layouts, a declarative data contract and the same visual language from the first node to the last connection.',
  content: 'docs',
  theme: 'grain',
  siteUrl: 'https://alanslzrr.github.io/aesthc-diagram-lib/docs',
  branding: { name: 'aesthc' },
  navigation: [
    { label: 'Playground', href: 'https://alanslzrr.github.io/aesthc-diagram-lib/playground.html' },
    { label: 'GitHub', href: 'https://github.com/alanslzrr/aesthc-diagram-lib' },
  ],
  groups: [
    {
      group: 'Start',
      sections: [
        {
          section: 'Start',
          pages: ['index', 'getting-started'],
        },
      ],
    },
    {
      group: 'Diagrams',
      sections: [
        {
          section: 'Layouts',
          pages: [
            'diagrams/band',
            'diagrams/flowchart',
            'diagrams/sequence',
            'diagrams/state-machine',
            'diagrams/er',
            'diagrams/timeline',
            'diagrams/swimlane',
          ],
        },
      ],
    },
    {
      group: 'Editor',
      sections: [
        {
          section: 'Edit diagrams',
          pages: ['guides/editor', 'guides/react', 'guides/theming'],
        },
      ],
    },
    {
      group: 'Viewer',
      sections: [{ section: 'Explore diagrams', pages: ['guides/viewer'] }],
    },
    {
      group: 'Export & sharing',
      sections: [{ section: 'Ship diagrams', pages: ['guides/share-export', 'guides/migration'] }],
    },
    {
      group: 'Extending',
      sections: [{ section: 'Customise', pages: ['guides/extending', 'agents/integrate'] }],
    },
    {
      group: 'Reference',
      sections: [
        { section: 'Reference', pages: ['api/index', 'guides/support', 'guides/troubleshooting'] },
      ],
    },
    {
      group: 'Maintainers',
      sections: [
        {
          section: 'Maintainers',
          pages: ['maintainers/releasing', 'maintainers/heyo-integration'],
        },
      ],
    },
  ],
})
