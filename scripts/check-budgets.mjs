import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { execFileSync } from 'node:child_process'

// Multi-entry site: enforce the existing transfer limits on each entry graph,
// counting shared and lazy chunks for every entry that can load them.
//
// Reviewed editor-entry budget: `playground.html` and `studio.html` embed the
// full public editor (store, surface, inspector, toolbar) plus the shared
// current-document export dialog and movement panel. Measured 202,624 bytes
// (playground) and 192,839 bytes (studio) gzip after those required
// workflows, so the previous 180 KiB ceiling no longer covers the agreed
// editor surface. The ceilings below are the measured graphs plus ~6 KiB of
// headroom; review them with `pnpm site:build && pnpm check:budgets` whenever
// an editor-only feature is added. This is not a general reader increase.
//
// The editor CSS also crossed the 12 KiB reader stylesheet ceiling (12,655
// bytes on playground); the editor-only CSS ceiling is reviewed below.
//
// Reviewed landing budget: the reader landing keeps the Vercel design plus the
// shared host preference and filtered-navigation integration. Its measured
// graph is 179,957 bytes gzip, so the reviewed ceiling is 180 KiB (~4 KiB
// headroom) instead of the generic 175 KiB. Every other reader entry stays at
// 175 KiB.
//
// Reviewed docs-entry budget: `docs.html` mounts the real `@heyo-sh/heyo-docs`
// runtime shell under /docs. Its measured graph is ~233 KiB gzip (DocsApp,
// base-ui primitives, search, MDX/OpenAPI surfaces and shared React chunks),
// so the 175 KiB reader ceiling cannot cover a full documentation runtime.
// The ceiling below is the measured graph plus ~7 KiB of headroom; review it
// with `pnpm docs:build && pnpm check:budgets` after every Heyo upgrade.
const editorEntryBudgets = {
  'playground.html': 204 * 1024,
  'studio.html': 196 * 1024,
}
const editorEntryCssBudgets = {
  'playground.html': 13 * 1024,
  'studio.html': 13 * 1024,
}
const landingEntryBudget = {
  'index.html': 180 * 1024,
}
const docsEntryBudgets = {
  'docs.html': 240 * 1024,
}
const manifest = JSON.parse(readFileSync('site/dist/.vite/manifest.json', 'utf8'))
for (const [entry, _value] of Object.entries(manifest).filter(([, value]) => value.isEntry)) {
  const files = new Set()
  const seen = new Set()
  function visit(key) {
    if (seen.has(key)) return
    seen.add(key)
    const chunk = manifest[key]
    files.add(chunk.file)
    for (const css of chunk.css ?? []) files.add(css)
    for (const imported of [...(chunk.imports ?? []), ...(chunk.dynamicImports ?? [])])
      visit(imported)
  }
  visit(entry)
  for (const [extension, maximum] of [
    [
      'js',
      docsEntryBudgets[entry] ??
        editorEntryBudgets[entry] ??
        landingEntryBudget[entry] ??
        175 * 1024,
    ],
    ['css', editorEntryCssBudgets[entry] ?? 12 * 1024],
  ]) {
    const bytes = [...files]
      .filter((file) => file.endsWith(`.${extension}`))
      .reduce((sum, file) => sum + gzipSync(readFileSync(`site/dist/${file}`)).length, 0)
    console.log(`${entry} ${extension}: ${bytes} gzip bytes / ${maximum} budget`)
    if (bytes > maximum) throw Error(`${entry} ${extension} exceeds the reviewed transfer budget`)
  }
}
const [pack] = JSON.parse(
  execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { encoding: 'utf8' }),
)
console.log(
  `Package: ${pack.size} packed bytes; ${pack.unpackedSize} unpacked bytes; ${pack.files.length} files`,
)
if (pack.size > 2 * 1024 * 1024 || pack.unpackedSize > 8 * 1024 * 1024)
  throw Error('Package exceeds 2 MiB packed / 8 MiB unpacked budget')
