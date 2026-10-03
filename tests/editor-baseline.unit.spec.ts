import { expect, it } from 'vitest'
import { createDocument, createEditorStore, resolveDocument } from '../src/editor-core'
import { baselineUpdate, type BaselineFrame } from '../src/editor/baseline'

it('patches only changed committed entities and invalidates presentation and topology', () => {
  const made = createDocument(
    {
      type: 'graph',
      caption: 'Patch',
      legend: { main: 'M', branch: 'B' },
      nodes: [
        { id: 'a', label: 'A', description: '' },
        { id: 'b', label: 'B', description: '' },
      ],
      edges: [{ id: 'ab', from: 'a', to: 'b', label: 'link' }],
    },
    { id: 'patch', locale: 'en' },
  )
  if (!made.ok) throw Error('fixture')
  made.value.scene.mode = 'manual'
  made.value.scene.nodes = {
    a: { x: 10, y: 20, width: 200, height: 90, locked: false },
    b: { x: 400, y: 20, width: 200, height: 90, locked: false },
  }
  const store = createEditorStore({
    document: made.value,
    permissions: { edit: true, save: true, export: true },
  })
  const frame = (): BaselineFrame => {
    const document = store.getSnapshot().document
    const scene = resolveDocument(document, { quality: 'edit', requestId: 'patch' })
    if (!scene.ok) throw Error('scene')
    return { document, scene: scene.value, theme: 'light', fontGeneration: 0, instanceId: 'patch' }
  }
  const before = frame()
  expect(baselineUpdate(null, before).full).toBe(true)
  expect(baselineUpdate(before, before).markup).toBe('')
  const commit = store.dispatch({
    id: 'move',
    label: 'Move',
    expectedRevision: 0,
    commands: [{ type: 'nodes.move', positions: { a: { x: 30, y: 40 } } }],
  })
  expect(commit.status).toBe('committed')
  const after = frame(),
    update = baselineUpdate(before, after)
  expect(update.full).toBe(false)
  expect(update.markup).toContain('data-node-id="a"')
  expect(update.markup).not.toContain('data-node-id="b"')
  expect(update.markup).toContain('data-edge-id="ab"')
  expect(update.markup).toContain('data-edge-label="ab"')
  expect(baselineUpdate(after, { ...after, fontGeneration: 1 }).full).toBe(true)
  expect(baselineUpdate(after, { ...after, theme: 'dark' }).full).toBe(true)
  store.undo()
  expect(baselineUpdate(after, frame()).markup).toContain('data-node-id="a"')
})
