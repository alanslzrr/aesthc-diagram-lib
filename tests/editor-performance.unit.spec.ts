import { describe, it, expect } from 'vitest'
import type { GraphDiagramSpec } from '../src/types'
import {
  createDocument,
  importDocument,
  validateDocument,
  createEditorStore,
  resolveDocument,
} from '../src/editor-core'
import { graphSnapshot, findRoute, findReach } from '../src/graph'
import { exportDocument } from '../src/export'
import type { DiagramDocument } from '../src/editor-core/types'

function seededSpec(nodeCount: number, edgeCount: number): GraphDiagramSpec {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `n${i}`,
    label: `Node ${i}`,
    description: `Seeded node ${i}`,
  }))
  const edges = Array.from({ length: edgeCount }, (_, i) => ({
    id: `e${i}`,
    from: `n${i % nodeCount}`,
    to: `n${(i * 13 + 3) % nodeCount}`,
  }))
  return {
    type: 'graph',
    caption: `Performance seed ${nodeCount}`,
    legend: { main: 'Main', branch: 'Branch' },
    nodes,
    edges,
  }
}
function materializedDocument(nodeCount: number, edgeCount: number): DiagramDocument {
  const made = createDocument(seededSpec(nodeCount, edgeCount), { id: 'perf', locale: 'en' })
  if (!made.ok) throw Error(JSON.stringify(made.diagnostics))
  const doc = made.value
  doc.scene = {
    ...doc.scene,
    mode: 'manual',
    nodes: Object.fromEntries(
      doc.spec.type === 'graph'
        ? doc.spec.nodes.map((n, i) => [
            n.id,
            {
              x: (i % 40) * 180,
              y: Math.floor(i / 40) * 80,
              width: 140,
              height: 56,
              locked: false,
            },
          ])
        : [],
    ),
  }
  return doc
}
function p95(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]
}
function round(run: () => void, warmups = 5, samples = 30) {
  for (let i = 0; i < warmups; i++) run()
  const times: number[] = []
  for (let i = 0; i < samples; i++) {
    const start = performance.now()
    run()
    times.push(performance.now() - start)
  }
  return p95(times)
}
async function roundAsync(run: () => Promise<void>, warmups = 3, samples = 12) {
  for (let i = 0; i < warmups; i++) await run()
  const times: number[] = []
  for (let i = 0; i < samples; i++) {
    const start = performance.now()
    await run()
    times.push(performance.now() - start)
  }
  return p95(times)
}
function measure(run: () => void) {
  const rounds = [round(run), round(run), round(run)].sort((a, b) => a - b)
  return rounds[1]
}
async function measureAsync(run: () => Promise<void>) {
  const rounds = [await roundAsync(run), await roundAsync(run), await roundAsync(run)].sort(
    (a, b) => a - b,
  )
  return rounds[1]
}
describe('performance budgets on seeded datasets', () => {
  it.each([
    [100, 200, 25, 100, 16, 5, 500],
    [1000, 2000, 150, 1000, 50, 25, 3000],
  ])(
    'nodeCount=%i edgeCount=%i stays under validate=%ims resolve=%ims commit=%ims bfs=%ims export=%ims',
    async (nodeCount, edgeCount, validateMs, resolveMs, commitMs, bfsMs, exportMs) => {
      const documentJson = JSON.stringify(materializedDocument(nodeCount, edgeCount))
      const normalized = importDocument(JSON.parse(documentJson) as never, {
        id: 'perf',
        locale: 'en',
      })
      if (!normalized.ok) throw Error(JSON.stringify(normalized.diagnostics))
      const doc = normalized.value.document
      const store = createEditorStore({
        document: doc,
        permissions: { edit: true, save: true, export: true },
      })
      const graph = graphSnapshot(doc)
      const measured = {
        validate: measure(() => {
          const result = validateDocument(JSON.parse(documentJson) as never)
          if (!result.ok) throw Error('validate')
        }),
        resolve: measure(() => {
          const result = resolveDocument(doc, {
            quality: 'edit',
            requestId: 'bench',
            skipDiagnostics: true,
          })
          if (!result.ok) throw Error('resolve')
        }),
        commit: measure(() => {
          const current = store.getSnapshot().document
          if (current.spec.type !== 'graph') throw Error('type')
          const previous = current.scene.nodes.n0?.x ?? 0
          const result = store.dispatch({
            id: 'perf-move',
            label: 'Move',
            expectedRevision: current.revision,
            commands: [
              {
                type: 'nodes.move',
                positions: { n0: { x: (previous + 1) % 16, y: 0 } },
              },
            ],
          })
          if (result.status !== 'committed') throw Error(`commit ${result.status}`)
        }),
        bfs: measure(() => {
          const route = findRoute(graph, 'n0', `n${nodeCount - 1}`)
          if (!route.ok) throw Error('route')
          const reach = findReach(graph, 'n0', 'downstream', nodeCount)
          if (!reach.ok) throw Error('reach')
        }),
        export: await measureAsync(async () => {
          const result = await exportDocument(doc, {
            format: 'svg',
            scope: { type: 'document' },
            theme: 'light',
            quality: 'edit',
            background: 'theme',
            scale: 1,
            includeSource: false,
            metadata: 'minimal',
            fontPolicy: 'fallback',
          })
          if (!result.ok) throw Error(`export ${result.diagnostics.map((d) => d.code).join(', ')}`)
          if (!result.value.bytes.byteLength) throw Error('export empty artifact')
        }),
      }
      expect(measured.validate).toBeLessThanOrEqual(validateMs)
      expect(measured.resolve).toBeLessThanOrEqual(resolveMs)
      expect(measured.commit).toBeLessThanOrEqual(commitMs)
      expect(measured.bfs).toBeLessThanOrEqual(bfsMs)
      expect(measured.export).toBeLessThanOrEqual(exportMs)
      console.log(
        `perf ${nodeCount} nodes: validate ${measured.validate.toFixed(2)}ms (≤${validateMs}) ` +
          `resolve ${measured.resolve.toFixed(2)}ms (≤${resolveMs}) ` +
          `commit ${measured.commit.toFixed(2)}ms (≤${commitMs}) ` +
          `bfs ${measured.bfs.toFixed(2)}ms (≤${bfsMs}) ` +
          `export ${measured.export.toFixed(2)}ms (≤${exportMs})`,
      )
      store.dispose()
    },
    90_000,
  )
})
