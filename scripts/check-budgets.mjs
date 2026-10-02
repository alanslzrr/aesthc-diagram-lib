import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { execFileSync } from 'node:child_process'

// Multi-entry site: enforce the existing transfer limits on each entry graph,
// counting shared and lazy chunks for every entry that can load them.
//
// Reviewed editor-entry budget: `playground.html` and `studio.html` embed the
// full public editor (store, surface, inspector, toolbar). Their measured
// graphs sit just under 180 KiB gzip, above the 175 KiB ceiling that still
// applies to every reader-facing entry. This is a measured ceiling for the two
// editor surfaces, not a general increase.
//
// Reviewed docs-entry budget: `docs.html` mounts the real `@heyo-sh/heyo-docs`
// runtime shell under /docs. Its measured graph is ~233 KiB gzip (DocsApp,
// base-ui primitives, search, MDX/OpenAPI surfaces and shared React chunks),
// so the 175 KiB reader ceiling cannot cover a full documentation runtime.
// The ceiling below is the measured graph plus ~7 KiB of headroom; review it
// with `pnpm docs:build && pnpm check:budgets` after every Heyo upgrade.
const editorEntryBudgets = {
  'playground.html': 180 * 1024,
  'studio.html': 180 * 1024,
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
    ['js', docsEntryBudgets[entry] ?? editorEntryBudgets[entry] ?? 175 * 1024],
    ['css', 12 * 1024],
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
