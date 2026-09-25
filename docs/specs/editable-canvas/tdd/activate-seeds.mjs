import assert from 'node:assert/strict'
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../../../..')
const phase = process.argv[2]
const phases = {
  M0: ['editor-document.unit.spec.ts', 'editor-store.unit.spec.ts'],
  M1: ['editor-viewport.unit.spec.ts'],
  M2: ['editor-graph.unit.spec.ts'],
}
assert(phase in phases, 'Usage: node docs/specs/editable-canvas/tdd/activate-seeds.mjs M0|M1|M2')
assert(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).name === '@aesthc/diagram-lib')
const fixtures = [
  'legacy-specs.json',
  'graph-document.json',
  'graph-expected.json',
  'viewport-cases.json',
  'hostile-inputs.json',
]
const writes = phases[phase].map((name) => ({
  from: join(here, 'seeds', name),
  to: join(root, 'tests', name),
}))
for (const name of fixtures) {
  const from = join(here, '..', 'fixtures', name)
  const to = join(root, 'tests', 'fixtures', 'editor', name)
  if (existsSync(to)) {
    assert(
      readFileSync(from).equals(readFileSync(to)),
      `Existing fixture differs; refusing to overwrite ${to}`,
    )
  } else writes.push({ from, to })
}
for (const { from, to } of writes) {
  assert(existsSync(from), `Missing source: ${from}`)
  assert(!existsSync(to), `Refusing to overwrite ${to}`)
}
for (const { from, to } of writes) {
  mkdirSync(dirname(to), { recursive: true })
  copyFileSync(from, to)
  process.stdout.write(`Created ${to}\n`)
}
process.stdout.write(
  `Activated ${phase}. Tests target future APIs: a missing-module failure is not yet a behavioral RED.\n`,
)
