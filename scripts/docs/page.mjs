import { readFileSync } from 'node:fs'
import { marked } from 'marked'
import hljs from 'highlight.js/lib/core'
import typescript from 'highlight.js/lib/languages/typescript'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import css from 'highlight.js/lib/languages/css'
import bash from 'highlight.js/lib/languages/bash'
for (const [name, language] of Object.entries({ typescript, javascript, json, css, bash }))
  hljs.registerLanguage(name, language)
hljs.registerAliases(['tsx', 'ts'], { languageName: 'typescript' })
hljs.registerAliases(['jsx', 'js'], { languageName: 'javascript' })
const highlighted = (text, language) =>
  hljs.getLanguage(language) ? hljs.highlight(text, { language }).value : escape(text)

// A stroke-based disclosure indicator; details owns the accessible open state.
const disclosureIcon =
  '<svg class="disclosure-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'

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

function commandBlock(command) {
  const match = /^npm install (.+)$/.exec(command.trim())
  if (!match) return null
  const commands = {
    npm: command.trim(),
    pnpm: `pnpm add ${match[1]}`,
    yarn: `yarn add ${match[1]}`,
    bun: `bun add ${match[1]}`,
  }
  return `<section class="code-block" data-package-command ${Object.entries(commands)
    .map(([key, value]) => `data-${key}="${escape(value)}"`)
    .join(
      ' ',
    )} aria-label="Package installation"><div class="code-toolbar"><div class="package-tabs js-only" role="group" aria-label="Package manager">${Object.keys(
    commands,
  )
    .map(
      (manager) =>
        `<button type="button" data-manager="${manager}" aria-pressed="${manager === 'npm'}">${manager}</button>`,
    )
    .join(
      '',
    )}</div><span class="install-label">Install package</span><button type="button" class="control copy-code js-only" data-copy-code aria-label="Copy installation command">Copy</button></div><pre tabindex="0" role="region" aria-label="Installation command"><code>${escape(command.trim())}</code></pre></section>`
}
export function renderPage({ file, markdown, destination, routes, base, origin, version, stable }) {
  const headings = []
  const ids = new Map()
  const renderer = new marked.Renderer()
  renderer.heading = function (token) {
    const text = this.parser.parseInline(token.tokens)
    const plain = token.text.replace(/<[^>]+>/g, '').replace(/[`*_]/g, '')
    const slug =
      plain
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-|-$/g, '') || 'section'
    const count = ids.get(slug) ?? 0
    ids.set(slug, count + 1)
    const id = count ? `${slug}-${count + 1}` : slug
    if (token.depth === 2 || token.depth === 3)
      headings.push({ id, text: plain, depth: token.depth })
    return `<h${token.depth} id="${id}">${text}${token.depth > 1 ? `<a class="heading-anchor" href="#${id}" aria-label="Link to ${escape(plain)}">#</a>` : ''}</h${token.depth}>`
  }
  renderer.code = function (token) {
    if (token.lang === 'bash') {
      const command = commandBlock(token.text)
      if (command) return command
    }
    const language = (token.lang ?? 'text').split(/\s/)[0]
    return `<section class="code-block"><div class="code-toolbar"><span>${escape(language)}</span><button type="button" class="control copy-code js-only" data-copy-code aria-label="Copy ${escape(language)} code">Copy</button></div><pre tabindex="0" role="region" aria-label="${escape(language)} code"><code>${highlighted(token.text, language)}</code></pre></section>`
  }
  let content = marked.parse(markdown, { renderer })
  if (file === 'docs/agents/integrate.md')
    content = content.replace(
      /<blockquote>[\s\S]*?<\/blockquote>/,
      (quote) =>
        `<section class="agent-request"><div class="preview-head"><span>Ready for your agent</span><button type="button" class="control js-only" data-copy-agent>Copy integration request</button></div>${quote}</section>`,
    )
  const title = /^# (.+)$/m.exec(markdown)?.[1] ?? label(file)
  const navLink = (source) =>
    `<a href="${base}${routes.get(source)}" ${source === file ? 'aria-current="page"' : ''}>${escape(label(source))}</a>`
  const nav = groups
    .map(
      ([name, files]) =>
        `<section class="nav-group"><h2>${name}</h2>${files.map(navLink).join('')}</section>`,
    )
    .join('')
  const order = groups.flatMap(([, files]) => files)
  const position = order.indexOf(file)
  const previous = order[position - 1],
    next = order[position + 1]
  const pagination = `<nav class="pagination" aria-label="Documentation pages">${previous ? `<a href="${base}${routes.get(previous)}"><small>Previous</small>← ${escape(label(previous))}</a>` : ''}${next ? `<a href="${base}${routes.get(next)}"><small>Next</small>${escape(label(next))} →</a>` : ''}</nav>`
  const type = file.startsWith('docs/diagrams/')
    ? file.split('/').at(-1).replace('.md', '')
    : file === 'docs/getting-started.md' || file === 'docs/index.md'
      ? file === 'docs/getting-started.md'
        ? 'flowchart'
        : 'band'
      : null
  const preview = type
    ? `<section class="preview" aria-label="${type} preview"><div class="preview-head"><span>${file === 'docs/index.md' ? 'One visual language, seven layouts' : `${label(file)} preview`}</span><a class="control" href="${base}?only=example-${type}#main">Open playground ↗</a></div><div class="preview-canvas" tabindex="0" role="region" aria-label="Scrollable ${type} illustration">${readFileSync(`site/dist/docs-assets/previews/${type}.html`, 'utf8')}</div><p class="preview-caption">Rendered from the ${file.startsWith('docs/diagrams/') ? 'minimal spec below' : `${type} example`}. Explore focus, selection and editing in the playground.</p></section>`
    : ''
  const sample = file.startsWith('docs/diagrams/')
    ? `<div class="page-meta"><a class="control" href="${base}examples/${type}.tsx" download>React example ↓</a><a class="control" href="${base}examples/${type}.json" download>JSON spec ↓</a></div>`
    : ''
  const toc = headings
    .map(
      (heading) =>
        `<a class="level-${heading.depth}" href="#${heading.id}">${escape(heading.text)}</a>`,
    )
    .join('')
  const group = groups.find(([, files]) => files.includes(file))?.[0] ?? 'Documentation'
  // Place the real preview after the opening description, not ahead of the title.
  const reactExample = file.startsWith('docs/diagrams/')
    ? `<details class="complete-example"><summary><span>Complete React example</span>${disclosureIcon}</summary><section class="code-block"><div class="code-toolbar"><span>tsx</span><button type="button" class="control copy-code js-only" data-copy-code aria-label="Copy complete React example">Copy</button></div><pre tabindex="0" role="region" aria-label="Complete React example"><code>${highlighted(readFileSync(`examples/${type}.tsx`, 'utf8'), 'tsx')}</code></pre></section></details>`
    : ''
  const withPreview =
    (type ? content.replace(/(<\/p>)/, `$1${preview}${sample}`) : content) + reactExample
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="icon" href="${base}favicon.svg" type="image/svg+xml"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} · @aesthc/diagram-lib</title><meta name="description" content="${escape(title)} for @aesthc/diagram-lib ${version}"><link rel="canonical" href="${origin}${destination}"><meta property="og:title" content="${escape(title)}"><meta property="og:image" content="${origin}og.png"><link rel="stylesheet" href="${base}docs-assets/canvas.css"><link rel="stylesheet" href="${base}docs-assets/docs.css"><link rel="alternate" type="text/markdown" href="${base}${destination}index.md"><link rel="describedby" href="${base}llms.txt" type="text/plain"><script src="${base}docs-assets/theme.js"></script><script type="module" src="${base}docs-assets/docs.js"></script></head><body><a class="skip" href="#content">Skip to content</a><header class="docs-header"><div class="header-inner"><a class="brand" href="${base}">aesthc / diagrams</a><nav class="header-nav" aria-label="Main navigation"><a href="${base}docs/" aria-current="page">Docs</a><a href="${base}#main">Playground</a></nav><div class="header-actions"><button class="control search-trigger js-only" type="button" data-open-search data-search-index="${base}docs-assets/search.json"><span>Search docs</span><kbd>⌘ K</kbd></button><a class="control github-link" href="https://github.com/alanslzrr/aesthc-diagram-lib" target="_blank" rel="noreferrer">GitHub ↗</a><button class="control js-only" data-theme-toggle type="button">Light</button></div></div></header><details class="mobile-nav"><summary><span class="mobile-nav-label"><span>Browse docs</span><span class="current-doc">${escape(label(file))}</span></span>${disclosureIcon}</summary><nav aria-label="Mobile documentation">${order.map(navLink).join('')}</nav></details><div class="docs-layout"><aside class="sidebar"><nav aria-label="Documentation">${nav}</nav><p class="sidebar-footer">Seven layouts.<br>Your data. Your theme.</p></aside><main class="article" id="content" tabindex="-1"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="${base}docs/">Docs</a><span aria-hidden="true">›</span><span>${escape(group)}</span></nav><div class="page-meta"><span class="version-label">${version} · ${stable ? 'Stable' : 'Release candidate'}</span><a href="index.md">Read Markdown ↗</a><a href="https://github.com/alanslzrr/aesthc-diagram-lib/blob/main/${file}">Edit this page ↗</a></div>${withPreview}${pagination}<footer class="docs-footer"><span>MIT · Maintained by Alan Salazar</span><span>Docs in English · Playground in English / Español</span></footer></main><aside class="toc"><nav aria-label="On this page"><p>On this page</p>${toc}</nav><div class="toc-resource"><a href="${base}agents/">Integrate with your agent ↗</a><a href="${base}docs/guides/troubleshooting/">Need help?</a></div></aside></div><dialog class="search-dialog" aria-label="Search documentation"><form method="dialog"><label class="sr-only" for="docs-search">Search documentation</label><input id="docs-search" type="search" placeholder="Search layouts, guides, API…" autocomplete="off"><button class="control" type="button" data-close-search aria-label="Close search">Esc</button></form><div class="search-results"></div><p class="search-status" role="status"></p></dialog><span class="sr-only" role="status" data-copy-status></span></body></html>`
}
