import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

export function snapshotFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? snapshotFiles(join(directory, entry.name))
      : [join(directory, entry.name)],
  )
}
export function sealSnapshot(directory, metadata) {
  const files = Object.fromEntries(
    snapshotFiles(directory)
      .filter((file) => !file.endsWith('/snapshot.json'))
      .map((file) => [
        relative(directory, file).replaceAll('\\', '/'),
        createHash('sha256').update(readFileSync(file)).digest('hex'),
      ]),
  )
  writeFileSync(
    join(directory, 'snapshot.json'),
    JSON.stringify({ ...metadata, files }, null, 2) + '\n',
  )
}
export function verifySnapshot(directory) {
  const manifest = JSON.parse(readFileSync(join(directory, 'snapshot.json'), 'utf8'))
  for (const [path, checksum] of Object.entries(manifest.files)) {
    if (path.split('/').some((part) => part === '..') || path.startsWith('/'))
      throw Error('Unsafe snapshot path')
    if (
      createHash('sha256')
        .update(readFileSync(join(directory, path)))
        .digest('hex') !== checksum
    )
      throw Error(`Snapshot checksum mismatch: ${path}`)
  }
  const actual = snapshotFiles(directory)
    .filter((file) => !file.endsWith('/snapshot.json'))
    .map((file) => relative(directory, file).replaceAll('\\', '/'))
    .sort()
  if (JSON.stringify(actual) !== JSON.stringify(Object.keys(manifest.files).sort()))
    throw Error('Snapshot file inventory changed')
  return manifest
}
export function copySnapshotResources(out, directory, base, _contentBase, version) {
  for (const path of ['assets', 'docs-assets', 'examples', 'licenses']) {
    if (existsSync(join(out, path)))
      cpSync(join(out, path), join(directory, path), { recursive: true })
  }
  mkdirSync(join(directory, 'schemas'), { recursive: true })
  cpSync(join(out, 'schemas', version), join(directory, 'schemas', version), { recursive: true })
  for (const path of ['favicon.svg', 'og.png', 'llms.txt', 'llms-full.txt']) {
    if (existsSync(join(out, path))) cpSync(join(out, path), join(directory, path))
  }
  // Vite's relative module imports remain local. Absolute font/resource URLs
  // inside copied CSS must point at the immutable snapshot too.
  for (const file of snapshotFiles(directory)) {
    if (!/\.css$/.test(file)) continue
    const source = readFileSync(file, 'utf8')
    writeFileSync(file, source.replaceAll(`${base}assets/`, './'))
  }
}
