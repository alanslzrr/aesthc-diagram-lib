import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import Ajv from 'ajv'
import { createGenerator } from 'ts-json-schema-generator'
import ts from 'typescript'

const directory = dirname(fileURLToPath(import.meta.url))
const root = resolve(directory, '../../..')
const read = (name) => readFileSync(join(directory, name), 'utf8')
const data = JSON.parse(read('traceability.json'))
assert.equal(data.schemaVersion, 1)
assert.equal(data.status, 'proposed-not-implemented')
assert.equal(data.tasks.length, 25)
assert.equal(data.requirements.length, 56)
const tasks = new Map(data.tasks.map((task) => [task.id, task]))
assert.equal(tasks.size, data.tasks.length, 'Duplicate task ID')
const ids = new Set()
const tests = new Set()
const assigned = new Set()
const seen = new Set()
const active = new Set()
function visit(id) {
  assert(tasks.has(id), `Unknown task ${id}`)
  assert(!active.has(id), `Task dependency cycle at ${id}`)
  if (seen.has(id)) return
  active.add(id)
  for (const dependency of tasks.get(id).dependsOn) visit(dependency)
  active.delete(id)
  seen.add(id)
}
for (const task of data.tasks) {
  assert(/^E\d{2}$/.test(task.id))
  assert(['M0', 'M1', 'M2', 'M3'].includes(task.milestone))
  for (const field of ['title', 'red', 'green', 'refactor', 'done'])
    assert(task[field]?.trim(), `${task.id}: ${field}`)
  assert(task.files.length > 0)
  for (const path of task.files) assert(!path.startsWith('/') && !path.split('/').includes('..'))
  visit(task.id)
}
for (const requirement of data.requirements) {
  assert(/^R\d{2}$/.test(requirement.id) && !ids.has(requirement.id))
  ids.add(requirement.id)
  assert(tasks.has(requirement.task))
  assigned.add(requirement.task)
  assert(requirement.acceptance.trim())
  assert(requirement.tests.length >= 2)
  for (const test of requirement.tests) {
    assert(
      /^T\d{2}\.\d+$/.test(test.id) && !tests.has(test.id),
      `Duplicate/invalid test ${test.id}`,
    )
    tests.add(test.id)
    assert(['unit', 'e2e', 'package', 'framework'].includes(test.layer))
    assert(/^(tests\/|scripts\/)/.test(test.file) && !test.file.split('/').includes('..'))
    for (const field of ['given', 'when', 'then'])
      assert(test[field]?.trim(), `${test.id}: missing ${field}`)
  }
}
assert.equal(tests.size, 112)
assert.equal(assigned.size, tasks.size, 'Task without acceptance requirements')

const testCatalog = [
  '# Catálogo trazable de aceptación y pruebas',
  '',
  'Generado desde `traceability.json` por `node docs/specs/editable-canvas/verify-spec.mjs --write-catalog`. Escenarios previstos, no tests ya ejecutados. Cada R tiene tarea, criterio verificable y dos casos Given/When/Then. Los nombres de archivos son destinos de implementación.',
  '',
  ...data.requirements.flatMap((requirement) => [
    `## ${requirement.id} — ${requirement.title}`,
    '',
    `**Tarea:** [${requirement.task}](task-catalog.md#${requirement.task.toLowerCase()}) · **Hito:** ${tasks.get(requirement.task).milestone}.`,
    '',
    `**Aceptación:** ${requirement.acceptance}`,
    '',
    ...requirement.tests.flatMap((test) => [
      `### ${test.id} · ${test.layer}`,
      '',
      `**Archivo:** \`${test.file}\`.`,
      '',
      `- **Given:** ${test.given}.`,
      `- **When:** ${test.when}.`,
      `- **Then:** ${test.then}.`,
      '',
    ]),
  ]),
].join('\n')
const taskCatalog = [
  '# Catálogo ejecutable de tareas',
  '',
  'Generado desde `traceability.json`. Archivos propuestos, no necesariamente existentes. Todos los estados iniciales son **pendiente de implementación**. El orden numérico es topológico; se puede trabajar secuencialmente sin resolver dependencias implícitas.',
  '',
  ...data.tasks.flatMap((task) => [
    `<a id="${task.id.toLowerCase()}"></a>`,
    `## ${task.id} — ${task.title}`,
    '',
    `**Hito:** ${task.milestone} · **Depende de:** ${task.dependsOn.join(', ') || 'ninguna'} · **Estado:** pendiente.`,
    '',
    `**Requisitos:** ${data.requirements
      .filter((requirement) => requirement.task === task.id)
      .map((requirement) => requirement.id)
      .join(', ')}.`,
    '',
    '**Archivos destino:**',
    ...task.files.map((path) => `- \`${path}\``),
    '',
    `1. **RED:** ${task.red}`,
    `2. **GREEN:** ${task.green}`,
    `3. **REFACTOR:** ${task.refactor}`,
    '',
    `**Cierre verificable:** ${task.done}`,
    '',
  ]),
].join('\n')
for (const [name, content] of [
  ['test-catalog.md', testCatalog],
  ['task-catalog.md', taskCatalog],
]) {
  if (process.argv.includes('--write-catalog')) writeFileSync(join(directory, name), content)
  else assert.equal(read(name), content, `${name} drift: run --write-catalog`)
}

const validatorPath = join(root, 'dist/validation/index.js')
assert(existsSync(validatorPath), 'Build the current package first with pnpm build')
const { validateDiagramSpec } = await import(pathToFileURL(validatorPath).href)
const legacy = JSON.parse(read('fixtures/legacy-specs.json'))
assert.equal(Object.keys(legacy).length, 7)
for (const [name, spec] of Object.entries(legacy)) {
  assert.equal(name, spec.type)
  const result = validateDiagramSpec(spec)
  assert(result.success, `${name} fixture invalid: ${JSON.stringify(result)}`)
}
const generator = createGenerator({
  path: join(directory, 'contracts.ts'),
  type: 'DiagramDocument',
  tsconfig: join(directory, 'tsconfig.json'),
  additionalProperties: false,
  skipTypeCheck: false,
})
const draftSchema = generator.createSchema('DiagramDocument')
const ajv = new Ajv({ allErrors: true, strict: false })
const validateDraft = ajv.compile(draftSchema)
const graph = JSON.parse(read('fixtures/graph-document.json'))
assert(
  validateDraft(graph),
  `Graph fixture fails proposed structural contract: ${JSON.stringify(validateDraft.errors)}`,
)
const nodeIds = new Set(graph.spec.nodes.map((node) => node.id))
const edgeIds = new Set(graph.spec.edges.map((edge) => edge.id))
assert.equal(nodeIds.size, graph.spec.nodes.length)
assert.equal(edgeIds.size, graph.spec.edges.length)
for (const edge of graph.spec.edges) assert(nodeIds.has(edge.from) && nodeIds.has(edge.to))
for (const id of Object.keys(graph.scene.nodes)) assert(nodeIds.has(id))
assert.deepEqual(new Set(graph.scene.zOrder), nodeIds)
const expected = JSON.parse(read('fixtures/graph-expected.json'))
for (let index = 0; index < expected.routeAC.edgeIds.length; index += 1) {
  const edge = graph.spec.edges.find(
    (candidate) => candidate.id === expected.routeAC.edgeIds[index],
  )
  assert.equal(edge?.from, expected.routeAC.nodeIds[index])
  assert.equal(edge?.to, expected.routeAC.nodeIds[index + 1])
}
for (const id of expected.downstreamA.edgeIds) assert(edgeIds.has(id))
for (const id of expected.downstreamA.nodeIds) assert(nodeIds.has(id))
const hostile = JSON.parse(read('fixtures/hostile-inputs.json'))
assert.equal(hostile.length, 10)
for (const entry of hostile) assert(typeof entry.value === 'string' && entry.expected)

const seeds = readdirSync(join(directory, 'tdd/seeds')).filter((name) => name.endsWith('.spec.ts'))
assert.equal(seeds.length, 4)
for (const name of seeds) {
  const source = read(`tdd/seeds/${name}`)
  assert(
    !/\b(?:it|test|describe)\.(?:skip|todo|only)\b/.test(source),
    `Disabled/exclusive test in ${name}`,
  )
  for (const id of source.matchAll(/\bT\d{2}\.\d+\b/g))
    assert(tests.has(id[0]), `${name}: unmapped ${id[0]}`)
  const compiled = ts.transpileModule(source, {
    fileName: name,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  })
  assert(
    !(compiled.diagnostics ?? []).some(
      (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
    ),
    `Seed syntax error in ${name}`,
  )
}
for (const name of readdirSync(directory).filter((entry) => entry.endsWith('.md'))) {
  for (const match of read(name).matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const href = match[1]
    if (/^(https?:|mailto:|#)/.test(href)) continue
    const path = decodeURIComponent(href.split('#')[0])
    assert(existsSync(resolve(directory, path)), `${name}: missing local link ${href}`)
  }
}
process.stdout.write(
  `Spec OK: ${tasks.size} tasks, ${ids.size} requirements, ${tests.size} scenarios, 7 legacy specs, 1 proposed graph document, ${seeds.length} syntax-checked seed suites.\n`,
)
process.stdout.write(
  'This verifies specification integrity and fixture structure, not implementation coverage or behavioral RED/GREEN tests.\n',
)
