// Every runnable block in the shipped sharing guide must be a real public
// import. This test reads the guide from the installed tarball, compiles the
// blocks against the installed declarations and executes them with minimal
// browser shims, so documentation drift cannot pass as prose.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const consumer = process.cwd()
const packageRoot = fileURLToPath(new URL('./node_modules/@aesthc/diagram-lib/', import.meta.url))
const guide = readFileSync(resolve(packageRoot, 'docs/guides/share-export.md'), 'utf8')
const examples = [...guide.matchAll(/```ts ([a-z0-9-]+)\n([\s\S]*?)```/g)].map((match) => ({
  id: match[1],
  source: match[2],
}))
const work = resolve(consumer, '.docs-examples')

test('the sharing guide documents only identified, unique examples', () => {
  const fences = guide.match(/```ts[ \n]/g) ?? []
  assert.equal(examples.length, fences.length, 'every ts block must carry an example id')
  assert.ok(examples.length >= 14, `expected the public API examples, found ${examples.length}`)
  assert.equal(new Set(examples.map(({ id }) => id)).size, examples.length)
  assert.match(guide, /Public package APIs/)
  assert.match(guide, /Editable hosts/)
  assert.match(guide, /Legacy showcase/)
  assert.match(guide, /Share link/)
})

test('every documented example compiles against the installed declarations', () => {
  rmSync(work, { recursive: true, force: true })
  mkdirSync(work, { recursive: true })
  const files = []
  for (const example of examples) {
    const file = join(work, `${example.id}.ts`)
    writeFileSync(file, example.source)
    files.push(file)
  }
  const tsc = resolve(consumer, 'node_modules/typescript/bin/tsc')
  execFileSync(
    process.execPath,
    [
      tsc,
      '--noEmit',
      '--strict',
      '--target',
      'ES2022',
      '--module',
      'ESNext',
      '--moduleResolution',
      'Bundler',
      '--skipLibCheck',
      resolve(consumer, 'docs-node.d.ts'),
      ...files,
    ],
    { cwd: consumer, stdio: 'pipe' },
  )
})

for (const example of examples) {
  test(`documented example runs: ${example.id}`, () => {
    const file = join(work, `${example.id}.mjs`)
    writeFileSync(file, example.source)
    try {
      execFileSync(
        process.execPath,
        ['--import', pathToFileURL(resolve(consumer, 'browser-stubs.mjs')).href, file],
        { cwd: consumer, stdio: 'pipe' },
      )
    } catch (error) {
      assert.fail(
        `${example.id} failed against the installed tarball:\n${error.stderr ?? error.message}`,
      )
    }
  })
}
