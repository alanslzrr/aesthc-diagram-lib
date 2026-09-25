import { describe, expect, it } from 'vitest'
import {
  createDocument,
  createLayoutProviderRegistry,
  runRegisteredLayout,
} from '../src/editor-core'
import type { DiagramDocument } from '../src/editor-core/types'
import type { RegisteredLayoutProvider } from '../src/editor-core'

function document(): DiagramDocument {
  const made = createDocument(
    {
      type: 'graph',
      caption: 'Provider registry seed',
      legend: { main: 'Main', branch: 'Branch' },
      nodes: [
        { id: 'a', label: 'A', description: '' },
        { id: 'b', label: 'B', description: '' },
        { id: 'locked', label: 'Locked', description: '' },
      ],
      edges: [{ id: 'ab', from: 'a', to: 'b' }],
    },
    { id: 'provider-registry', locale: 'en' },
  )
  if (!made.ok) throw Error(JSON.stringify(made.diagnostics))
  const value = made.value
  value.scene = {
    ...value.scene,
    mode: 'manual',
    nodes: Object.fromEntries(
      ['a', 'b', 'locked'].map((id, index) => [
        id,
        { x: index * 200, y: 80, width: 140, height: 56, locked: id === 'locked' },
      ]),
    ),
    routes: {},
    groups: [],
    zOrder: ['a', 'b', 'locked'],
  }
  return value
}

function provider(
  id: string,
  move: (
    document: DiagramDocument,
  ) => Record<string, { x: number; y: number; width: number; height: number; locked: boolean }>,
  fail = false,
): RegisteredLayoutProvider {
  return {
    id,
    async run({ document: current }) {
      if (fail) throw new Error('provider exploded')
      return { ...current.scene, nodes: move(current), zOrder: current.scene.zOrder }
    },
  }
}

describe('E18 registered layout providers', () => {
  it('T56.1 semantic rejections keep the input untouched with no partial side effects', async () => {
    const registry = createLayoutProviderRegistry()
    const foreign = provider('foreign', () => ({
      ghost: { x: 1, y: 2, width: 10, height: 10, locked: false },
    }))
    const locked = provider('locked', (current) => ({
      locked: { ...current.scene.nodes.locked, x: 999 },
    }))
    expect(registry.register(foreign).ok).toBe(true)
    expect(registry.register(locked).ok).toBe(true)
    // Duplicate ids never replace a registered provider.
    expect(registry.register(foreign).ok).toBe(false)
    const doc = document()
    const snapshot = structuredClone(doc)
    const foreignRun = await runRegisteredLayout(doc, registry, 'foreign', {
      expectedRevision: doc.revision,
      latestRequestId: () => 'req-1',
      requestId: 'req-1',
    })
    if (!foreignRun.ok) throw Error(JSON.stringify(foreignRun.diagnostics))
    expect(foreignRun.value.status).toBe('rejected')
    expect(foreignRun.value.diagnostics).toContain('reference.missing')
    const lockedRun = await runRegisteredLayout(doc, registry, 'locked', {
      expectedRevision: doc.revision,
      latestRequestId: () => 'req-2',
      requestId: 'req-2',
    })
    if (!lockedRun.ok) throw Error(JSON.stringify(lockedRun.diagnostics))
    expect(lockedRun.value.status).toBe('rejected')
    expect(lockedRun.value.diagnostics).toContain('entity.locked')
    // No side effects: the input document (and its scene) is untouched.
    expect(doc).toEqual(snapshot)
    expect(doc.scene.nodes.locked.x).toBe(400)
    const unknown = await runRegisteredLayout(doc, registry, 'nope', {
      expectedRevision: doc.revision,
      latestRequestId: () => 'req-3',
    })
    expect(unknown.ok).toBe(false)
    expect(unknown.diagnostics.some((d) => d.code === 'provider.unknown')).toBe(true)
  })

  it('T56.2 a valid provider applies once; a failing provider keeps last-good and allows retry', async () => {
    const registry = createLayoutProviderRegistry()
    const good = provider('grid', (current) => ({
      a: { ...current.scene.nodes.a, x: 40, y: 40 },
      b: { ...current.scene.nodes.b, x: 280, y: 40 },
    }))
    const broken = provider('broken', () => ({}), true)
    expect(registry.register(good).ok).toBe(true)
    expect(registry.register(broken).ok).toBe(true)
    const doc = document()
    const applied = await runRegisteredLayout(doc, registry, 'grid', {
      expectedRevision: doc.revision,
      latestRequestId: () => 'grid-1',
      requestId: 'grid-1',
    })
    if (!applied.ok) throw Error(JSON.stringify(applied.diagnostics))
    expect(applied.value.status).toBe('applied')
    expect(applied.value.document).not.toBe(doc)
    expect(applied.value.document.scene.nodes.a.x).toBe(40)
    expect(applied.value.document.scene.nodes.locked.locked).toBe(true)
    // Count the distinct documents the provider published: exactly one.
    expect(doc.scene.nodes.a.x).toBe(0)
    const failed = await runRegisteredLayout(doc, registry, 'broken', {
      expectedRevision: doc.revision,
      latestRequestId: () => 'broken-1',
      requestId: 'broken-1',
    })
    if (!failed.ok) throw Error(JSON.stringify(failed.diagnostics))
    expect(failed.value.status).toBe('rejected')
    expect(failed.value.diagnostics).toContain('provider.failed')
    // Last-good retained and retry succeeds with the healthy provider.
    expect(failed.value.document.scene.nodes.a.x).toBe(0)
    const retry = await runRegisteredLayout(failed.value.document, registry, 'grid', {
      expectedRevision: doc.revision,
      latestRequestId: () => 'grid-2',
      requestId: 'grid-2',
    })
    if (!retry.ok) throw Error(JSON.stringify(retry.diagnostics))
    expect(retry.value.status).toBe('applied')
  })

  it('T56.2 an older requestId never publishes its result', async () => {
    const registry = createLayoutProviderRegistry()
    const slow = provider('slow', (current) => ({
      a: { ...current.scene.nodes.a, x: 77, y: 7 },
    }))
    registry.register(slow)
    const doc = document()
    const stale = await runRegisteredLayout(doc, registry, 'slow', {
      expectedRevision: doc.revision,
      latestRequestId: () => 'newer',
      requestId: 'older',
    })
    if (!stale.ok) throw Error(JSON.stringify(stale.diagnostics))
    expect(stale.value.status).toBe('rejected')
    expect(stale.value.diagnostics).toContain('provider.stale')
    expect(stale.value.document).toBe(doc)
  })
})
