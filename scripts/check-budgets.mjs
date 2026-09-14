import { readFileSync, readdirSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { execFileSync } from 'node:child_process'

const assets = readdirSync('site/dist/assets')
for (const [extension, maximum] of [
  ['js', 175 * 1024],
  ['css', 12 * 1024],
]) {
  const bytes = assets
    .filter((file) => file.endsWith(`.${extension}`))
    .reduce((sum, file) => sum + gzipSync(readFileSync(`site/dist/assets/${file}`)).length, 0)
  console.log(`Site ${extension}: ${bytes} gzip bytes / ${maximum} budget`)
  if (bytes > maximum) throw Error(`Site ${extension} exceeds the reviewed transfer budget`)
}
const [pack] = JSON.parse(
  execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { encoding: 'utf8' }),
)
console.log(
  `Package: ${pack.size} packed bytes; ${pack.unpackedSize} unpacked bytes; ${pack.files.length} files`,
)
if (pack.size > 2 * 1024 * 1024 || pack.unpackedSize > 8 * 1024 * 1024)
  throw Error('Package exceeds 2 MiB packed / 8 MiB unpacked budget')
