import { readFileSync } from 'node:fs'
import { marked } from 'marked'
import hljs from 'highlight.js/lib/common'
import { renderDocument } from './render.tsx'
export const groups = [
  [
    'Start here',
    ['docs/index.md', 'docs/getting-started.md', 'docs/guides/react.md', 'docs/guides/theming.md'],
  ],
  [
    'Diagram layouts',
    ['band', 'flowchart', 'sequence', 'state-machine', 'er', 'timeline', 'swimlane'].map(
      (type) => `docs/diagrams/${type}.md`,
    ),
  ],
  [
    'Reference',
    [
      'docs/api/index.md',
      'docs/guides/share-export.md',
      'docs/guides/migration.md',
      'docs/guides/troubleshooting.md',
      'docs/guides/support.md',
    ],
  ],
  ['Work together', ['docs/agents/integrate.md', 'docs/maintainers/releasing.md']],
]
const labels = {
  'docs/index.md': 'Introduction',
  'docs/getting-started.md': 'Getting started',
  'docs/guides/react.md': 'React & Next.js',
  'docs/guides/theming.md': 'Theming',
  'docs/api/index.md': 'API reference',
  'docs/guides/share-export.md': 'Sharing & exports',
  'docs/guides/migration.md': 'Migration',
  'docs/guides/support.md': 'Support matrix',
  'docs/guides/troubleshooting.md': 'Troubleshooting',
  'docs/agents/integrate.md': 'Agent integration',
  'docs/maintainers/releasing.md': 'Releasing',
}
export const escape = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
export const label = (file) =>
  labels[file] ??
  file
    .split('/')
    .at(-1)
    .replace('.md', '')
    .replace(/^state-machine$/, 'State machine')
    .replace(/^er$/, 'Entity relationship')
    .replace(/^./, (c) => c.toUpperCase())

export function renderPage({ file, markdown, destination, routes, base, origin, version, stable }) {
  const ids = new Map()
  const headings = []
  const blocks = marked.lexer(markdown)
  marked.walkTokens(blocks, (token) => {
    if (token.type === 'heading') {
      const plain = token.text.replace(/<[^>]+>/g, '').replace(/[`*_]/g, '')
      const slug =
        plain
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]+/gu, '-')
          .replace(/^-|-$/g, '') || 'section'
      const count = ids.get(slug) ?? 0
      ids.set(slug, count + 1)
      token.id = count ? `${slug}-${count + 1}` : slug
      if (token.depth === 2 || token.depth === 3)
        headings.push({ id: token.id, text: plain, depth: token.depth })
    }
    if (token.type === 'code') {
      const language = (token.lang ?? 'text').split(/\s/)[0]
      const normalized =
        { tsx: 'typescript', ts: 'typescript', jsx: 'javascript', js: 'javascript' }[language] ??
        language
      token.highlighted = hljs.getLanguage(normalized)
        ? hljs.highlight(token.text, { language: normalized }).value
        : escape(token.text)
    }
  })
  const type = file.startsWith('docs/diagrams/')
    ? file.split('/').at(-1).replace('.md', '')
    : file === 'docs/index.md'
      ? 'band'
      : file === 'docs/getting-started.md'
        ? 'flowchart'
        : null
  const nav = groups.map(([name, files]) => ({
    name,
    pages: files.map((source) => ({
      file: source,
      label: label(source),
      url: base + routes.get(source),
    })),
  }))
  const order = nav.flatMap((group) => group.pages)
  const position = order.findIndex((page) => page.file === file)
  const data = {
    file,
    title: /^# (.+)$/m.exec(markdown)?.[1] ?? label(file),
    label: label(file),
    destination,
    base,
    origin,
    version,
    stable,
    group:
      nav.find((group) => group.pages.some((page) => page.file === file))?.name ?? 'Documentation',
    nav,
    previous: order[position - 1] ?? null,
    next: order[position + 1] ?? null,
    headings,
    blocks,
    preview: type
      ? {
          type,
          html: readFileSync(`site/dist/docs-assets/previews/${type}.html`, 'utf8'),
          code: readFileSync(`examples/${type}.tsx`, 'utf8'),
          highlighted: hljs.highlight(readFileSync(`examples/${type}.tsx`, 'utf8'), {
            language: 'typescript',
          }).value,
        }
      : null,
  }
  return { html: renderDocument(data), data }
}
