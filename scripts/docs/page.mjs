import { existsSync, readFileSync } from 'node:fs'
import { marked } from 'marked'
import hljs from 'highlight.js/lib/common'
import heyoConfig from '../../heyo-docs.config.mjs'
import { renderDocument } from './render.tsx'
// Heyo Docs owns the content model: groups → sections → pages. Pages are
// extensionless MDX references there; this pipeline serves the Markdown twins.
const docFile = (page) => `docs/${page}.md`
export const groups = heyoConfig.groups.map((group) => {
  const files = (group.sections ?? []).flatMap((section) => section.pages ?? []).map(docFile)
  for (const file of files)
    if (!existsSync(file)) throw new Error(`Heyo config references a missing page: ${file}`)
  if (!files.length) throw new Error(`Heyo config group without pages: ${group.group}`)
  return [group.group, files]
})
const labels = {
  'docs/index.md': 'Introduction',
  'docs/getting-started.md': 'Getting started',
  'docs/guides/editor.md': 'Editor guide',
  'docs/guides/react.md': 'React & Next.js',
  'docs/guides/theming.md': 'Theming',
  'docs/guides/viewer.md': 'Viewer guide',
  'docs/guides/extending.md': 'Extending',
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
      ? 'overview'
      : file === 'docs/getting-started.md'
        ? 'flowchart'
        : null
  const previewCode = type === 'overview' ? 'band' : type
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
    description: (blocks.find((block) => block.type === 'paragraph')?.text ?? label(file))
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*`_]|<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .slice(0, 180),
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
          playground: previewCode,
          html: readFileSync(`site/dist/docs-assets/previews/${type}.html`, 'utf8'),
          code: readFileSync(`examples/${previewCode}.tsx`, 'utf8'),
          highlighted: hljs.highlight(readFileSync(`examples/${previewCode}.tsx`, 'utf8'), {
            language: 'typescript',
          }).value,
        }
      : null,
  }
  return { html: renderDocument(data), data }
}
