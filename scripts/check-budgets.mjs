import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { execFileSync } from 'node:child_process'

// Multi-entry site: enforce the existing transfer limits on each entry graph,
// counting shared and lazy chunks for every entry that can load them.
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
    ['js', 175 * 1024],
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
