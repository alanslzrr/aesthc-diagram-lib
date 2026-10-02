import { describe, expect, it } from 'vitest'
import {
  createDocument,
  createEditorStore,
  validateDocument,
  relayoutScene,
} from '../src/editor-core'
import fixture from './fixtures/editor/graph-document.json'

function doc() {
  const result = validateDocument(structuredClone(fixture))
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
  return result.value
}
function makeStore(maxEntries = 100) {
  const result = validateDocument(structuredClone(fixture))
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics))
  let ordinal = 0
  return createEditorStore({
    document: result.value,
    idFactory: (kind) => `${kind}-${++ordinal}`,
    permissions: { edit: true, save: true, export: true },
    history: { maxEntries, maxBytes: 8 * 1024 * 1024 },
  })
}

describe('editor transaction store', () => {
  it('T10.1 rejects an entire batch when its second command is invalid', () => {
    const store = makeStore()
    const before = store.getSnapshot().document
    let commits = 0
    const unsubscribe = store.onCommit(() => {
      commits += 1
    })
    const result = store.dispatch({
      id: 'atomic',
      label: 'Invalid batch',
      expectedRevision: 0,
      commands: [
        { type: 'nodes.move', positions: { a: { x: 32, y: 64 } } },
        { type: 'route.set', id: 'missing', route: { mode: 'auto' } },
      ],
    })
    expect(result.status).toBe('rejected')
    expect(store.getSnapshot().document).toEqual(before)
    expect(store.getSnapshot().canUndo).toBe(false)
    expect(commits).toBe(0)
    unsubscribe()
    store.dispose()
  })

  it('T11.1 undoes content without moving the revision counter backwards', () => {
    const store = makeStore()
    const original = structuredClone(store.getSnapshot().document.scene.nodes.a)
    const moved = store.dispatch({
      id: 'move',
      label: 'Move A',
      expectedRevision: 0,
      commands: [{ type: 'nodes.move', positions: { a: { x: 32, y: 64 } } }],
    })
    expect(moved.status).toBe('committed')
    expect(store.getSnapshot().document.revision).toBe(1)
    expect(store.undo().status).toBe('committed')
    expect(store.getSnapshot().document.scene.nodes.a).toEqual(original)
    expect(store.getSnapshot().document.revision).toBe(2)
    expect(store.redo().status).toBe('committed')
    expect(store.getSnapshot().document.scene.nodes.a).toMatchObject({ x: 32, y: 64 })
    expect(store.getSnapshot().document.revision).toBe(3)
    store.dispose()
  })

  it('T10.2 rejects stale writes and T11.2 does not record no-op moves', () => {
    const store = makeStore()
    const command = { type: 'nodes.move' as const, positions: { a: { x: 0, y: 0 } } }
    expect(
      store.dispatch({ id: 'noop', label: 'No-op', expectedRevision: 0, commands: [command] })
        .status,
    ).toBe('noop')
    expect(store.getSnapshot().document.revision).toBe(0)
    expect(store.getSnapshot().canUndo).toBe(false)
    expect(
      store.dispatch({ id: 'stale', label: 'Stale', expectedRevision: 99, commands: [command] })
        .status,
    ).toBe('rejected')
    expect(store.getSnapshot().document.revision).toBe(0)
    store.dispose()
  })

  it('T12.1 evicts the oldest undo entry and T13.1 isolates stores', () => {
    const store = makeStore(2)
    const other = makeStore(2)
    for (let index = 0; index < 3; index += 1) {
      expect(
        store.dispatch({
          id: `move-${index}`,
          label: 'Move A',
          expectedRevision: index,
          commands: [{ type: 'nodes.move', positions: { a: { x: (index + 1) * 16, y: 0 } } }],
        }).status,
      ).toBe('committed')
    }
    expect(store.undo().status).toBe('committed')
    expect(store.undo().status).toBe('committed')
    expect(store.getSnapshot().document.scene.nodes.a.x).toBe(16)
    expect(store.getSnapshot().canUndo).toBe(false)
    expect(store.undo().status).toBe('noop')
    expect(other.getSnapshot().document.scene.nodes.a.x).toBe(0)
    expect(other.getSnapshot().document.revision).toBe(0)
    store.dispose()
    other.dispose()
  })
})

describe('history replay', () => {
  it('invalidates redo after branching from an undone state', () => {
    const store = makeStore()
    const move = (x: number) =>
      store.dispatch({
        id: 'm' + x,
        label: 'move',
        expectedRevision: store.getSnapshot().document.revision,
        commands: [{ type: 'nodes.move', positions: { a: { x, y: 0 } } }],
      })
    move(20)
    move(40)
    store.undo()
    expect(store.getSnapshot().canRedo).toBe(true)
    move(60)
    expect(store.getSnapshot().canRedo).toBe(false)
    expect(store.redo().status).toBe('noop')
    expect(store.getSnapshot().document.scene.nodes.a.x).toBe(60)
  })
})
describe('granular change sets', () => {
  it('invalidates only layout for moves and marks exactly the moved nodes', () => {
    const store = createEditorStore({
      document: doc(),
      permissions: { edit: true, save: true, export: true },
    })
    const changes: Array<{ invalidates: string[]; affected: string[] }> = []
    store.onCommit((result) =>
      changes.push({
        invalidates: [...result.changes.invalidates],
        affected: result.changes.affected.map((r) => r.id),
      }),
    )
    const r = store.dispatch({
      id: 'm',
      label: 'move',
      expectedRevision: 0,
      commands: [{ type: 'nodes.move', positions: { a: { x: 10, y: 10 }, b: { x: 20, y: 20 } } }],
    })
    expect(r.status).toBe('committed')
    expect(changes.at(-1)?.invalidates).toEqual(['layout'])
    expect(changes.at(-1)?.affected.sort()).toEqual(['a', 'b'])
    store.dispose()
  })
  it('adds graph invalidation only when topology actually changes', () => {
    const store = createEditorStore({
      document: doc(),
      permissions: { edit: true, save: true, export: true },
    })
    const changes: string[][] = []
    store.onCommit((result) => changes.push([...result.changes.invalidates]))
    const rename = store.dispatch({
      id: 'r',
      label: 'rename',
      expectedRevision: 0,
      commands: [
        {
          type: 'spec.replace',
          spec: { ...structuredClone(doc().spec), caption: 'x' },
          references: 'reject',
        },
      ],
    })
    expect(rename.status).toBe('committed')
    expect(changes.at(-1)).toEqual(['layout'])
    const addSpec = structuredClone(doc().spec)
    const add = store.dispatch({
      id: 'a',
      label: 'add',
      expectedRevision: 1,
      commands: [
        {
          type: 'spec.replace',
          spec: {
            ...addSpec,
            nodes: [
              ...(addSpec.type === 'graph' ? addSpec.nodes : []),
              { id: 'z', label: 'Z', description: '' },
            ],
          } as never,
          references: 'reject',
        },
      ],
    })
    expect(add.status).toBe('committed')
    expect(changes.at(-1)).toContain('graph')
    store.dispose()
  })
  it('invalidates style and layout for presentation changes and everything for replacements', () => {
    const store = createEditorStore({
      document: doc(),
      permissions: { edit: true, save: true, export: true },
    })
    const changes: string[][] = []
    store.onCommit((result) => changes.push([...result.changes.invalidates]))
    const theme = store.dispatch({
      id: 't',
      label: 'theme',
      expectedRevision: 0,
      commands: [
        {
          type: 'presentation.set',
          presentation: { ...structuredClone(doc().presentation), textScale: 1.2 },
        },
      ],
    })
    expect(theme.status).toBe('committed')
    expect(changes.at(-1)?.sort()).toEqual(['layout', 'style'])
    const replace = store.dispatch({
      id: 'x',
      label: 'replace',
      expectedRevision: 1,
      commands: [{ type: 'document.replace-content', document: doc() }],
    })
    expect(replace.status).toBe('committed')
    expect(changes.at(-1)?.sort()).toEqual(['graph', 'layout', 'style', 'views'])
    store.dispose()
  })
})
describe('change set regressions', () => {
  it('invalidates graph when an edge reconnects without changing its id', () => {
    const store = createEditorStore({
      document: doc(),
      permissions: { edit: true, save: true, export: true },
    })
    const changes: string[][] = []
    const affected: string[][] = []
    store.onCommit((result) => {
      changes.push([...result.changes.invalidates])
      affected.push(result.changes.affected.map((r) => `${r.kind}:${r.id}`))
    })
    const spec = structuredClone(doc().spec)
    if (spec.type === 'graph') {
      const edge = spec.edges.find((e) => e.id === 'ad')
      if (edge) edge.to = 'isolated'
    }
    const r = store.dispatch({
      id: 'reconnect',
      label: 'reconnect',
      expectedRevision: 0,
      commands: [{ type: 'spec.replace', spec: spec as never, references: 'reject' }],
    })
    expect(r.status).toBe('committed')
    expect(changes.at(-1)).toContain('graph')
    expect(affected.at(-1)).toContain('edge:ad')
    store.dispose()
  })
  it('invalidates layout when undo restores geometry', () => {
    const store = createEditorStore({
      document: doc(),
      permissions: { edit: true, save: true, export: true },
    })
    const changes: string[][] = []
    store.onCommit((result) => changes.push([...result.changes.invalidates]))
    store.dispatch({
      id: 'm',
      label: 'move',
      expectedRevision: 0,
      commands: [{ type: 'nodes.move', positions: { a: { x: 50, y: 50 } } }],
    })
    const undone = store.undo()
    expect(undone.status).toBe('committed')
    expect(changes.at(-1)).toContain('layout')
    expect(changes.at(-1)).toContain('graph')
    store.dispose()
  })
  it('T02.2 keeps the edge identity and authored order across reconnect and undo', () => {
    const store = createEditorStore({
      document: doc(),
      permissions: { edit: true, save: true, export: true },
    })
    const snapshot = store.getSnapshot()
    if (snapshot.document.spec.type !== 'graph') throw Error('fixture')
    const original = JSON.stringify(snapshot.document.spec.edges)
    const spec = structuredClone(snapshot.document.spec)
    const edge = spec.edges.find((e) => e.id === 'ad')
    if (!edge) throw Error('edge')
    edge.to = 'isolated'
    const reconnected = store.dispatch({
      id: 'reconnect',
      label: 'Reconnect',
      expectedRevision: 0,
      commands: [{ type: 'spec.replace', spec: spec as never, references: 'reject' }],
    })
    expect(reconnected.status).toBe('committed')
    const after = store.getSnapshot().document.spec
    if (after.type !== 'graph') throw Error('type')
    expect(after.edges.find((e) => e.id === 'ad')?.to).toBe('isolated')
    const undone = store.undo()
    expect(undone.status).toBe('committed')
    const restored = store.getSnapshot().document.spec
    if (restored.type !== 'graph') throw Error('type')
    expect(JSON.stringify(restored.edges)).toBe(original)
    store.dispose()
  })
})
describe('relayout transaction', () => {
  it('applies as one undoable entry, restores exactly on undo and cancels without changes', () => {
    const store = createEditorStore({
      document: doc(),
      permissions: { edit: true, save: true, export: true },
    })
    const before = JSON.stringify(store.getSnapshot().document.scene.nodes)
    const scene = relayoutScene(store.getSnapshot().document)
    if (!scene.ok) throw Error('relayout')
    const id = 'relayout-gesture'
    expect(store.beginGesture({ id, label: 'Re-layout', expectedRevision: 0 }).ok).toBe(true)
    expect(store.previewGesture([{ type: 'scene.set', scene: scene.value }]).ok).toBe(true)
    const committed = store.commitGesture()
    expect(committed.status).toBe('committed')
    expect(store.getSnapshot().canUndo).toBe(true)
    expect(JSON.stringify(store.getSnapshot().document.scene.nodes)).not.toBe(before)
    const undone = store.undo()
    expect(undone.status).toBe('committed')
    expect(JSON.stringify(store.getSnapshot().document.scene.nodes)).toBe(before)
    store.dispose()
  })
  it('cancel restores the document without history', () => {
    const store = createEditorStore({
      document: doc(),
      permissions: { edit: true, save: true, export: true },
    })
    const before = JSON.stringify(store.getSnapshot().document.scene)
    const scene = relayoutScene(store.getSnapshot().document)
    if (!scene.ok) throw Error('relayout')
    store.beginGesture({ id: 'cancel', label: 'Re-layout', expectedRevision: 0 })
    store.previewGesture([{ type: 'scene.set', scene: scene.value }])
    store.cancelGesture()
    expect(JSON.stringify(store.getSnapshot().document.scene)).toBe(before)
    expect(store.getSnapshot().canUndo).toBe(false)
    store.dispose()
  })
})
describe('runtime permissions', () => {
  it('T22.2 guards mutations after edit permission is revoked and restores them on re-grant', () => {
    const store = createEditorStore({
      document: doc(),
      permissions: { edit: true, save: true, export: true },
    })
    const granted = store.dispatch({
      id: 'm',
      label: 'move',
      expectedRevision: 0,
      commands: [{ type: 'nodes.move', positions: { a: { x: 10, y: 10 } } }],
    })
    expect(granted.status).toBe('committed')
    store.setPermissions({ edit: false, save: true, export: true })
    const before = JSON.stringify(store.getSnapshot().document)
    const denied = store.dispatch({
      id: 'm2',
      label: 'move',
      expectedRevision: 1,
      commands: [{ type: 'nodes.move', positions: { a: { x: 90, y: 90 } } }],
    })
    expect(denied.status).toBe('rejected')
    expect(denied.diagnostics.map((x) => x.code)).toContain('permission.edit')
    expect(JSON.stringify(store.getSnapshot().document)).toBe(before)
    store.setPermissions({ edit: true, save: true, export: true })
    const reGranted = store.dispatch({
      id: 'm3',
      label: 'move',
      expectedRevision: 1,
      commands: [{ type: 'nodes.move', positions: { a: { x: 90, y: 90 } } }],
    })
    expect(reGranted.status).toBe('committed')
    store.dispose()
  })
})
describe('group moves and ungroup', () => {
  function grouped() {
    const d = doc()
    d.scene.groups = [
      { id: 'g1', label: 'Group 1', kind: 'visual', nodeIds: ['a'], locked: false },
      {
        id: 'g2',
        label: 'Group 2',
        kind: 'visual',
        nodeIds: ['b'],
        parentGroup: 'g1',
        locked: false,
      },
    ]
    return d
  }
  it('moves every descendant exactly once in one transaction', () => {
    const store = createEditorStore({
      document: grouped(),
      permissions: { edit: true, save: true, export: true },
    })
    const result = store.dispatch({
      id: 'move-group',
      label: 'Move group',
      expectedRevision: 0,
      commands: [
        {
          type: 'nodes.move',
          positions: {
            a: { x: 20, y: 30 },
            b: { x: 40, y: 50 },
          },
        },
      ],
    })
    expect(result.status).toBe('committed')
    expect(store.getSnapshot().document.scene.nodes.a).toMatchObject({ x: 20, y: 30 })
    expect(store.getSnapshot().document.scene.nodes.b).toMatchObject({ x: 40, y: 50 })
    store.dispose()
  })
  it('rejects ungroup while a member is locked and restores exactly on undo after unlocking', () => {
    const d = grouped()
    d.scene.nodes.b.locked = true
    const store = createEditorStore({
      document: d,
      permissions: { edit: true, save: true, export: true },
    })
    const rejected = store.dispatch({
      id: 'ungroup-locked',
      label: 'Ungroup',
      expectedRevision: 0,
      commands: [{ type: 'group.remove', id: 'g1', members: 'keep' }],
    })
    expect(rejected.status).toBe('rejected')
    expect(rejected.diagnostics.map((x) => x.code)).toContain('entity.locked')
    store.dispatch({
      id: 'unlock',
      label: 'Unlock',
      expectedRevision: 0,
      commands: [{ type: 'nodes.set-lock', ids: ['b'], locked: false }],
    })
    const before = JSON.stringify(store.getSnapshot().document.scene.nodes)
    const ungrouped = store.dispatch({
      id: 'ungroup',
      label: 'Ungroup',
      expectedRevision: 1,
      commands: [{ type: 'group.remove', id: 'g1', members: 'keep' }],
    })
    expect(ungrouped.status).toBe('committed')
    expect(store.getSnapshot().document.scene.groups.some((g) => g.id === 'g1')).toBe(false)
    expect(JSON.stringify(store.getSnapshot().document.scene.nodes)).toBe(before)
    const undone = store.undo()
    expect(undone.status).toBe('committed')
    expect(store.getSnapshot().document.scene.groups.some((g) => g.id === 'g1')).toBe(true)
    store.dispose()
  })
})
describe('trusted preview deltas', () => {
  it('rejects non-finite positions and keeps the last valid preview', () => {
    const store = createEditorStore({
      document: doc(),
      permissions: { edit: true, save: true, export: true },
    })
    expect(store.beginGesture({ id: 'preview', label: 'Preview', expectedRevision: 0 }).ok).toBe(
      true,
    )
    const valid = store.previewGesture(
      [{ type: 'nodes.move', positions: { a: { x: 10, y: 20 } } }],
      { skipValidation: true },
    )
    expect(valid.ok).toBe(true)
    if (!valid.ok) return
    const validDraft = store.getSnapshot().draft
    if (validDraft.kind !== 'gesture') throw Error('draft')
    expect(validDraft.preview.scene.nodes.a.x).toBe(10)
    const invalid = store.previewGesture(
      [{ type: 'nodes.move', positions: { a: { x: Number.NaN, y: 20 } } }],
      { skipValidation: true },
    )
    expect(invalid.ok).toBe(false)
    if (!invalid.ok) expect(invalid.diagnostics.map((x) => x.code)).toContain('data.finite')
    const draft = store.getSnapshot().draft
    if (draft.kind !== 'gesture') throw Error('draft')
    expect(draft.preview.scene.nodes.a.x).toBe(10)
    const committed = store.commitGesture()
    expect(committed.status).toBe('committed')
    expect(store.getSnapshot().document.scene.nodes.a.x).toBe(10)
    store.dispose()
  })
  it('rejects oversized routes and invalid specs in previews', () => {
    const store = createEditorStore({
      document: doc(),
      permissions: { edit: true, save: true, export: true },
    })
    store.beginGesture({ id: 'preview2', label: 'Preview', expectedRevision: 0 })
    const route = store.previewGesture(
      [
        {
          type: 'route.set',
          id: 'ab-primary',
          route: {
            mode: 'manual',
            source: { side: 'right', offset: 0.5 },
            target: { side: 'left', offset: 0.5 },
            points: Array.from({ length: 70 }, () => ({ x: 1, y: 1 })),
          },
        },
      ],
      { skipValidation: true },
    )
    expect(route.ok).toBe(false)
    if (!route.ok) expect(route.diagnostics.map((x) => x.code)).toContain('limit.route-points')
    const spec = store.previewGesture(
      [
        {
          type: 'spec.replace',
          spec: {
            type: 'graph',
            caption: 'Broken',
            legend: { main: 'Main', branch: 'Branch' },
            nodes: [],
            edges: [{ id: 'e1', from: 'missing', to: 'other' }],
          },
          references: 'reject',
        },
      ],
      { skipValidation: true },
    )
    expect(spec.ok).toBe(false)
    store.cancelGesture()
    store.dispose()
  })
})

describe('scene-only optimization boundaries', () => {
  it('rejects out-of-range committed coordinates', () => {
    const store = makeStore()
    expect(
      store.dispatch({
        id: 'range',
        label: 'Range',
        expectedRevision: 0,
        commands: [{ type: 'nodes.move', positions: { a: { x: 100001, y: 0 } } }],
      }).status,
    ).toBe('rejected')
  })
  it('keeps non-scene edits dirty when a scene command restores saved geometry', () => {
    const store = makeStore()
    const original = store.getSnapshot().document.scene.nodes.a
    const spec = structuredClone(store.getSnapshot().document.spec)
    spec.caption = 'Unsaved caption'
    store.dispatch({
      id: 'caption',
      label: 'Caption',
      expectedRevision: 0,
      commands: [{ type: 'spec.replace', spec, references: 'reject' }],
    })
    store.dispatch({
      id: 'move',
      label: 'Move',
      expectedRevision: 1,
      commands: [{ type: 'nodes.move', positions: { a: { x: original.x + 1, y: original.y } } }],
    })
    store.dispatch({
      id: 'restore',
      label: 'Restore',
      expectedRevision: 2,
      commands: [{ type: 'nodes.move', positions: { a: { x: original.x, y: original.y } } }],
    })
    expect(store.getSnapshot().dirty).toBe(true)
  })
})

it('shares frozen untouched placements without mutating the committed baseline', () => {
  const store = makeStore()
  const before = store.getSnapshot().document
  store.beginGesture({ id: 'sharing', label: 'Move', expectedRevision: before.revision })
  store.previewGesture([{ type: 'nodes.move', positions: { a: { x: 500, y: 400 } } }], {
    skipValidation: true,
  })
  const draft = store.getSnapshot().draft
  if (draft.kind !== 'gesture') throw Error('gesture')
  expect(draft.preview.spec).toBe(before.spec)
  expect(draft.preview.scene.nodes.b).toBe(before.scene.nodes.b)
  expect(draft.preview.scene.nodes.a).not.toBe(before.scene.nodes.a)
  expect(Object.isFrozen(draft.preview.scene.nodes.b)).toBe(true)
  expect(before.scene.nodes.a.x).not.toBe(500)
  store.cancelGesture()
  expect(store.getSnapshot().document).toBe(before)
})

describe('locked transition invariants', () => {
  function locked(scope: 'node' | 'group' | 'none') {
    const document = doc()
    if (scope === 'node') document.scene.nodes.a.locked = true
    if (scope === 'group')
      document.scene.groups = [
        { id: 'g1', label: 'Group', kind: 'visual', nodeIds: ['a'], locked: true },
      ]
    return createEditorStore({
      document,
      idFactory: (kind) => `${kind}-locked`,
      permissions: { edit: true, save: true, export: true },
    })
  }
  it.each(['node', 'group'] as const)(
    'scene.set cannot move a %s-locked node or clear its protection',
    (scope) => {
      const store = locked(scope)
      const before = store.getSnapshot()
      let notifications = 0
      let commits = 0
      const unsubscribe = store.subscribe(() => {
        notifications += 1
      })
      const offCommit = store.onCommit(() => {
        commits += 1
      })
      const moved = structuredClone(before.document.scene)
      moved.nodes.a.x += 40
      const rejected = store.dispatch({
        id: 'move-locked',
        label: 'Move locked',
        expectedRevision: 0,
        commands: [{ type: 'scene.set', scene: moved }],
      })
      expect(rejected.status).toBe('rejected')
      expect(rejected.diagnostics.map((diagnostic) => diagnostic.code)).toContain('entity.locked')
      const unlocked = structuredClone(before.document.scene)
      if (scope === 'node') unlocked.nodes.a.locked = false
      else unlocked.groups[0].locked = false
      const cleared = store.dispatch({
        id: 'clear-lock',
        label: 'Clear lock',
        expectedRevision: 0,
        commands: [{ type: 'scene.set', scene: unlocked }],
      })
      expect(cleared.status).toBe('rejected')
      expect(store.getSnapshot().document).toBe(before.document)
      expect(store.getSnapshot().canUndo).toBe(false)
      expect(notifications).toBe(0)
      expect(commits).toBe(0)
      unsubscribe()
      offCommit()
      store.dispose()
    },
  )
  it('allows an explicit unlock and edit in the same transaction', () => {
    const store = locked('node')
    const candidate = structuredClone(store.getSnapshot().document)
    candidate.scene.nodes.a = { ...candidate.scene.nodes.a, locked: false, x: 321 }
    const committed = store.dispatch({
      id: 'unlock-move',
      label: 'Unlock and move',
      expectedRevision: 0,
      commands: [
        { type: 'nodes.set-lock', ids: ['a'], locked: false },
        { type: 'document.replace-content', document: candidate },
      ],
    })
    expect(committed.status).toBe('committed')
    expect(store.getSnapshot().document.scene.nodes.a).toMatchObject({ locked: false, x: 321 })
    expect(store.undo().status).toBe('committed')
    expect(store.getSnapshot().document.scene.nodes.a.locked).toBe(true)
    store.dispose()
  })
  it.each(['node', 'group'] as const)(
    'document.replace-content preserves %s-locked content and placement',
    (scope) => {
      const store = locked(scope)
      const before = store.getSnapshot().document
      const candidate = structuredClone(before)
      if (candidate.spec.type !== 'graph') throw Error('graph')
      candidate.spec.nodes[0].label = 'Rewritten'
      candidate.scene.nodes.a.x += 40
      const rejected = store.dispatch({
        id: 'replace-locked',
        label: 'Replace locked',
        expectedRevision: 0,
        commands: [{ type: 'document.replace-content', document: candidate }],
      })
      expect(rejected.status).toBe('rejected')
      expect(rejected.diagnostics.map((diagnostic) => diagnostic.code)).toContain('entity.locked')
      expect(store.getSnapshot().document).toBe(before)
      store.dispose()
    },
  )
  it('keeps scene previews of locked nodes rejected and the last draft intact', () => {
    const store = locked('node')
    expect(store.beginGesture({ id: 'locked-preview', label: 'Move', expectedRevision: 0 }).ok).toBe(
      true,
    )
    const scene = structuredClone(store.getSnapshot().document.scene)
    scene.nodes.a.x += 40
    const rejected = store.previewGesture([{ type: 'scene.set', scene }], { skipValidation: true })
    expect(rejected.ok).toBe(false)
    if (!rejected.ok)
      expect(rejected.diagnostics.map((diagnostic) => diagnostic.code)).toContain('entity.locked')
    const draft = store.getSnapshot().draft
    if (draft.kind !== 'gesture') throw Error('draft')
    expect(draft.preview.scene.nodes.a.x).toBe(0)
    store.cancelGesture()
    store.dispose()
  })
})

describe('replacement identity and type', () => {
  it('accepts a replacement with the same id and type', () => {
    const store = makeStore()
    const candidate = structuredClone(store.getSnapshot().document)
    candidate.spec.caption = 'Edited caption'
    const committed = store.dispatch({
      id: 'same',
      label: 'Same identity',
      expectedRevision: 0,
      commands: [{ type: 'document.replace-content', document: candidate }],
    })
    expect(committed.status).toBe('committed')
    expect(store.getSnapshot().document.spec.caption).toBe('Edited caption')
    store.dispose()
  })
  it('rejects a foreign document id with a stable diagnostic', () => {
    const store = makeStore()
    const before = store.getSnapshot().document
    const candidate = structuredClone(before)
    candidate.id = 'foreign-document'
    candidate.spec.caption = 'Foreign'
    const rejected = store.dispatch({
      id: 'foreign-id',
      label: 'Foreign id',
      expectedRevision: 0,
      commands: [{ type: 'document.replace-content', document: candidate }],
    })
    expect(rejected.status).toBe('rejected')
    expect(rejected.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      'replacement.id-mismatch',
    )
    expect(store.getSnapshot().document).toBe(before)
    store.dispose()
  })
  it('rejects a different diagram type with a stable diagnostic', () => {
    const store = makeStore()
    const before = store.getSnapshot().document
    const created = createDocument(
      {
        type: 'timeline',
        caption: 'Timeline',
        legend: { main: 'Main', branch: 'Alt' },
        events: [{ id: 'e1', label: 'One', description: '' }],
      },
      { id: before.id, locale: 'en' },
    )
    if (!created.ok) throw Error('timeline')
    const rejected = store.dispatch({
      id: 'foreign-type',
      label: 'Foreign type',
      expectedRevision: 0,
      commands: [{ type: 'document.replace-content', document: created.value }],
    })
    expect(rejected.status).toBe('rejected')
    expect(rejected.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      'replacement.type-mismatch',
    )
    expect(store.getSnapshot().document).toBe(before)
    store.dispose()
  })
  it('surfaces a foreign id through the text draft without losing the buffer', () => {
    const store = makeStore()
    const candidate = structuredClone(store.getSnapshot().document)
    candidate.id = 'foreign-document'
    candidate.spec.caption = 'Pasted'
    store.setTextDraft(JSON.stringify(candidate))
    const committed = store.commitTextDraft()
    expect(committed.status).toBe('rejected')
    if (committed.status === 'rejected')
      expect(committed.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
        'replacement.id-mismatch',
      )
    const draft = store.getSnapshot().draft
    if (draft.kind !== 'text') throw Error('draft')
    expect(draft.text).toContain('foreign-document')
    expect(store.getSnapshot().document.id).toBe('doc-fixture')
    store.dispose()
  })
  it('keeps the explicit import path for another document identity', () => {
    const store = makeStore()
    const created = createDocument(structuredClone(store.getSnapshot().document.spec), {
      id: 'imported-document',
      locale: 'en',
    })
    if (!created.ok) throw Error('import')
    const replaced = store.replaceDocument(created.value, {
      expectedRevision: 0,
      history: 'reset',
    })
    expect(replaced.status).toBe('committed')
    expect(store.getSnapshot().document.id).toBe('imported-document')
    expect(store.getSnapshot().canUndo).toBe(false)
    store.dispose()
  })
})

describe('preview validation allowlist', () => {
  function previewing() {
    const store = makeStore()
    expect(store.beginGesture({ id: 'allowlist', label: 'Preview', expectedRevision: 0 }).ok).toBe(
      true,
    )
    const valid = structuredClone(store.getSnapshot().document.scene)
    valid.nodes.a.x = 25
    expect(store.previewGesture([{ type: 'scene.set', scene: valid }], { skipValidation: true }).ok).toBe(
      true,
    )
    return store
  }
  it('fully validates presentation previews instead of trusting the skip flag', () => {
    const store = previewing()
    const presentation = structuredClone(store.getSnapshot().document.presentation)
    presentation.textScale = Number.NaN
    const rejected = store.previewGesture(
      [{ type: 'presentation.set', presentation }],
      { skipValidation: true },
    )
    expect(rejected.ok).toBe(false)
    if (!rejected.ok)
      expect(rejected.diagnostics.map((diagnostic) => diagnostic.code)).toContain('data.finite')
    const draft = store.getSnapshot().draft
    if (draft.kind !== 'gesture') throw Error('draft')
    expect(Number.isFinite(draft.preview.presentation.textScale)).toBe(true)
    expect(draft.preview.scene.nodes.a.x).toBe(25)
    store.cancelGesture()
    store.dispose()
  })
  it('rejects unsafe metadata links in previews', () => {
    const store = previewing()
    const metadata = structuredClone(store.getSnapshot().document.metadata)
    metadata.nodes.a = {
      ...(metadata.nodes.a ?? { roles: [], tags: [] }),
      links: [{ label: 'bad', href: 'javascript:1' }],
    }
    const rejected = store.previewGesture([{ type: 'metadata.set', metadata }], {
      skipValidation: true,
    })
    expect(rejected.ok).toBe(false)
    if (!rejected.ok)
      expect(rejected.diagnostics.map((diagnostic) => diagnostic.code)).toContain('url.scheme')
    store.cancelGesture()
    store.dispose()
  })
  it('does not let a mixed batch smuggle an invalid presentation through the scene path', () => {
    const store = previewing()
    const presentation = structuredClone(store.getSnapshot().document.presentation)
    presentation.textScale = Number.POSITIVE_INFINITY
    const rejected = store.previewGesture(
      [
        { type: 'nodes.move', positions: { b: { x: 10, y: 10 } } },
        { type: 'presentation.set', presentation },
      ],
      { skipValidation: true },
    )
    expect(rejected.ok).toBe(false)
    const draft = store.getSnapshot().draft
    if (draft.kind !== 'gesture') throw Error('draft')
    expect(draft.preview.scene.nodes.b.x).not.toBe(10)
    store.cancelGesture()
    store.dispose()
  })
  it('fully validates replacement previews and keeps the last valid draft', () => {
    const store = previewing()
    const candidate = structuredClone(store.getSnapshot().document)
    candidate.metadata.nodes.ghost = { roles: [], tags: [] }
    const rejected = store.previewGesture(
      [{ type: 'document.replace-content', document: candidate }],
      { skipValidation: true },
    )
    expect(rejected.ok).toBe(false)
    if (!rejected.ok)
      expect(rejected.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
        'reference.missing',
      )
    const draft = store.getSnapshot().draft
    if (draft.kind !== 'gesture') throw Error('draft')
    expect(draft.preview.metadata.nodes.ghost).toBeUndefined()
    expect(draft.preview.scene.nodes.a.x).toBe(25)
    store.cancelGesture()
    store.dispose()
  })
})
