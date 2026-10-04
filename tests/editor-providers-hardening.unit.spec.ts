import { describe, expect, it, vi } from 'vitest'
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
      caption: 'Provider hardening seed',
      legend: { main: 'Main', branch: 'Branch' },
      nodes: [
        { id: 'a', label: 'A', description: '' },
        { id: 'b', label: 'B', description: '' },
        { id: 'locked', label: 'Locked', description: '' },
      ],
      edges: [{ id: 'ab', from: 'a', to: 'b' }],
    },
    { id: 'provider-hardening', locale: 'en' },
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
function register(
  registry: ReturnType<typeof createLayoutProviderRegistry>,
  provider: RegisteredLayoutProvider,
) {
  const registered = registry.register(provider)
  if (!registered.ok) throw Error(JSON.stringify(registered.diagnostics))
}

describe('F27 registered provider input isolation', () => {
  it('delegates an isolated, development-frozen snapshot, never the caller document', async () => {
    const registry = createLayoutProviderRegistry()
    let received: DiagramDocument | undefined
    let frozen = false
    register(registry, {
      id: 'inspect',
      async run({ document: input }) {
        received = input
        frozen =
          Object.isFrozen(input) &&
          Object.isFrozen(input.spec) &&
          Object.isFrozen(input.scene.nodes) &&
          Object.isFrozen(input.scene.groups)
        // Locked nodes may not be republished even unchanged.
        return { ...input.scene, nodes: { a: input.scene.nodes.a, b: input.scene.nodes.b } }
      },
    })
    const doc = document()
    const outcome = await runRegisteredLayout(doc, registry, 'inspect', {
      expectedRevision: doc.revision,
      latestRequestId: () => 'inspect-1',
      requestId: 'inspect-1',
    })
    if (!outcome.ok) throw Error(JSON.stringify(outcome.diagnostics))
    expect(outcome.value.status).toBe('applied')
    expect(received).toBeDefined()
    expect(received).not.toBe(doc)
    expect(received).not.toBe(outcome.value.document)
    expect(frozen).toBe(true)
  })

  it('mutation-then-throw leaves the caller byte-equivalent and returns last-good', async () => {
    const registry = createLayoutProviderRegistry()
    register(registry, {
      id: 'mutator',
      async run({ document: input }) {
        ;(input.spec as { caption: string }).caption = 'MUTATED BEFORE FAILURE'
        throw new Error('provider exploded')
      },
    })
    const doc = document()
    const snapshot = structuredClone(doc)
    const outcome = await runRegisteredLayout(doc, registry, 'mutator', {
      expectedRevision: doc.revision,
      latestRequestId: () => 'mutator-1',
      requestId: 'mutator-1',
    })
    if (!outcome.ok) throw Error(JSON.stringify(outcome.diagnostics))
    expect(outcome.value.status).toBe('rejected')
    expect(outcome.value.diagnostics).toContain('provider.failed')
    expect(outcome.value.document).toBe(doc)
    expect(doc).toEqual(snapshot)
    expect(JSON.stringify(doc)).toBe(JSON.stringify(snapshot))
  })

  it('mutation-then-invalid-result leaves the caller byte-equivalent', async () => {
    const registry = createLayoutProviderRegistry()
    register(registry, {
      id: 'invalid',
      async run({ document: input }) {
        try {
          ;(input.spec as { caption: string }).caption = 'MUTATED BEFORE INVALID'
        } catch {
          /* Development builds freeze the snapshot; mutation is impossible. */
        }
        return {
          ...input.scene,
          nodes: { ghost: { x: 1, y: 2, width: 10, height: 10, locked: false } },
        }
      },
    })
    const doc = document()
    const snapshot = structuredClone(doc)
    const outcome = await runRegisteredLayout(doc, registry, 'invalid', {
      expectedRevision: doc.revision,
      latestRequestId: () => 'invalid-1',
      requestId: 'invalid-1',
    })
    if (!outcome.ok) throw Error(JSON.stringify(outcome.diagnostics))
    expect(outcome.value.status).toBe('rejected')
    expect(outcome.value.diagnostics).toContain('reference.missing')
    expect(doc).toEqual(snapshot)
    expect(JSON.stringify(doc)).toBe(JSON.stringify(snapshot))
  })

  it('preserves locked-node and latest-wins checks under isolation', async () => {
    const registry = createLayoutProviderRegistry()
    register(registry, {
      id: 'locked-move',
      async run({ document: input }) {
        return {
          ...input.scene,
          nodes: { locked: { ...input.scene.nodes.locked, x: 999 } },
        }
      },
    })
    const doc = document()
    const rejected = await runRegisteredLayout(doc, registry, 'locked-move', {
      expectedRevision: doc.revision,
      latestRequestId: () => 'locked-1',
      requestId: 'locked-1',
    })
    if (!rejected.ok) throw Error(JSON.stringify(rejected.diagnostics))
    expect(rejected.value.status).toBe('rejected')
    expect(rejected.value.diagnostics).toContain('entity.locked')
    const stale = await runRegisteredLayout(doc, registry, 'locked-move', {
      expectedRevision: doc.revision,
      latestRequestId: () => 'newer',
      requestId: 'locked-1',
    })
    if (!stale.ok) throw Error(JSON.stringify(stale.diagnostics))
    expect(stale.value.status).toBe('rejected')
    expect(stale.value.diagnostics).toContain('provider.stale')
    expect(doc.scene.nodes.locked.x).toBe(400)
  })
})

describe('F28 registered provider abort forwarding', () => {
  it('pre-abort performs zero provider work', async () => {
    const registry = createLayoutProviderRegistry()
    let calls = 0
    register(registry, {
      id: 'never-called',
      async run() {
        calls += 1
        return document().scene
      },
    })
    const doc = document()
    const controller = new AbortController()
    controller.abort()
    const outcome = await runRegisteredLayout(doc, registry, 'never-called', {
      expectedRevision: doc.revision,
      latestRequestId: () => 'abort-0',
      requestId: 'abort-0',
      signal: controller.signal,
    })
    expect(calls).toBe(0)
    expect(outcome.ok).toBe(false)
    if (!outcome.ok)
      expect(outcome.diagnostics.some((d) => d.code === 'operation.aborted')).toBe(true)
  })

  it('midflight abort reaches the provider signal and bounds a non-settling provider', async () => {
    const registry = createLayoutProviderRegistry()
    let providerSignal: AbortSignal | undefined
    register(registry, {
      id: 'hang',
      run({ signal }) {
        providerSignal = signal
        return new Promise(() => {
          /* Never settles: the wrapper must not wait for it. */
        })
      },
    })
    const doc = document()
    const controller = new AbortController()
    const pending = runRegisteredLayout(doc, registry, 'hang', {
      expectedRevision: doc.revision,
      latestRequestId: () => 'hang-1',
      requestId: 'hang-1',
      signal: controller.signal,
    })
    expect(providerSignal?.aborted).toBe(false)
    controller.abort()
    const outcome = await pending
    expect(providerSignal?.aborted).toBe(true)
    expect(outcome.ok).toBe(false)
    if (!outcome.ok)
      expect(outcome.diagnostics.some((d) => d.code === 'operation.aborted')).toBe(true)
  })

  it('midflight abort forwarded to a provider that settles first still cancels publication', async () => {
    const registry = createLayoutProviderRegistry()
    let providerSignal: AbortSignal | undefined
    register(registry, {
      id: 'cooperative',
      async run({ document: input, signal }) {
        providerSignal = signal
        await new Promise((resolve) => setTimeout(resolve, 5))
        if (signal.aborted) throw new Error('operation.aborted')
        return input.scene
      },
    })
    const doc = document()
    const controller = new AbortController()
    const pending = runRegisteredLayout(doc, registry, 'cooperative', {
      expectedRevision: doc.revision,
      latestRequestId: () => 'cooperative-1',
      requestId: 'cooperative-1',
      signal: controller.signal,
    })
    controller.abort()
    const outcome = await pending
    expect(providerSignal?.aborted).toBe(true)
    expect(outcome.ok).toBe(false)
  })

  it('settled calls detach their abort listeners', async () => {
    const registry = createLayoutProviderRegistry()
    let providerSignal: AbortSignal | undefined
    register(registry, {
      id: 'settled',
      async run({ document: input, signal }) {
        providerSignal = signal
        return { ...input.scene, nodes: { a: input.scene.nodes.a, b: input.scene.nodes.b } }
      },
    })
    const doc = document()
    const controller = new AbortController()
    const addSpy = vi.spyOn(controller.signal, 'addEventListener')
    const removeSpy = vi.spyOn(controller.signal, 'removeEventListener')
    const outcome = await runRegisteredLayout(doc, registry, 'settled', {
      expectedRevision: doc.revision,
      latestRequestId: () => 'settled-1',
      requestId: 'settled-1',
      signal: controller.signal,
    })
    if (!outcome.ok) throw Error(JSON.stringify(outcome.diagnostics))
    expect(outcome.value.status).toBe('applied')
    expect(addSpy).toHaveBeenCalledTimes(1)
    expect(removeSpy).toHaveBeenCalledTimes(1)
    expect(removeSpy.mock.calls[0][0]).toBe(addSpy.mock.calls[0][0])
    // Aborting after settlement proves the forward listener is gone.
    controller.abort()
    expect(providerSignal?.aborted).toBe(false)
    addSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
