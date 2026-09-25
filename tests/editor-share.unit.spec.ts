import { describe, expect, it } from 'vitest'
import { createDocument } from '../src/editor-core'
import type { DiagramDocument } from '../src/editor-core/types'
import { decodeViewerState, encodeViewerState } from '../src/viewer/views'

function document(): DiagramDocument {
  const made = createDocument(
    {
      type: 'graph',
      caption: 'Share seed',
      legend: { main: 'Main', branch: 'Branch' },
      nodes: [
        { id: 'n~1', label: 'Tilde', description: '' },
        { id: 'n%2', label: 'Percent', description: '' },
        { id: 'nû', label: 'Unicode', description: '' },
      ],
      edges: [{ id: 'e~1', from: 'n~1', to: 'n%2' }],
    },
    { id: 'share-seed', locale: 'en' },
  )
  if (!made.ok) throw Error(JSON.stringify(made.diagnostics))
  made.value.views = [
    {
      id: 'v-main',
      label: 'Main view',
      focus: { nodeIds: ['n~1'], edgeIds: ['e~1'] },
    },
  ]
  return made.value
}

describe('E14 viewer state codec', () => {
  it('T35.2 round-trips ids with ~, % and Unicode through escaping', () => {
    const doc = document()
    // Named view: the stored focus is implied, never contradicted.
    const viewState = {
      viewId: 'v-main',
      camera: { x: -12.5, y: 3.25, zoom: 0.75 },
    }
    const decodedView = decodeViewerState(encodeViewerState(viewState), doc)
    if (!decodedView.ok) throw Error(JSON.stringify(decodedView.diagnostics))
    expect(decodedView.value).toEqual({
      viewId: 'v-main',
      focus: { nodeIds: ['n~1'], edgeIds: ['e~1'] },
      camera: { x: -12.5, y: 3.25, zoom: 0.75 },
    })
    // Explicit focus with reserved characters survives a full round-trip.
    const focusState = {
      focus: { nodeIds: ['n~1', 'nû'], edgeIds: ['e~1'] },
      camera: { x: 0, y: 0, zoom: 1 },
    }
    const decodedFocus = decodeViewerState(encodeViewerState(focusState), doc)
    if (!decodedFocus.ok) throw Error(JSON.stringify(decodedFocus.diagnostics))
    expect(decodedFocus.value).toEqual(focusState)
  })

  it('T35.2 an unknown view degrades to the overview without guessing focus', () => {
    const doc = document()
    const decoded = decodeViewerState('v=v-gone&c=0,0,1', doc)
    if (!decoded.ok) throw Error(JSON.stringify(decoded.diagnostics))
    expect(decoded.value).toEqual({ camera: { x: 0, y: 0, zoom: 1 } })
    expect(decoded.value.viewId).toBeUndefined()
    expect(decoded.value.focus).toBeUndefined()
  })

  it('T35.2 contradictions and unknown ids are rejected, not restored ambiguously', () => {
    const doc = document()
    // Focus that contradicts the named view (different count of nodes).
    const contradiction = decodeViewerState(`v=v-main&f=${encodeURIComponent('n%2,nû')}&k=2:0`, doc)
    expect(contradiction.ok).toBe(false)
    expect(contradiction.diagnostics.some((d) => d.code === 'query.invalid')).toBe(true)
    // Focus referencing a node that does not exist.
    const missing = decodeViewerState('f=ghost&k=1:0', doc)
    expect(missing.ok).toBe(false)
    expect(missing.diagnostics.some((d) => d.code === 'query.invalid')).toBe(true)
    // Malformed kind counts.
    const malformed = decodeViewerState('f=a,b&k=9:9', doc)
    expect(malformed.ok).toBe(false)
    // Camera outside the bounded range.
    const camera = decodeViewerState('c=0,0,99', doc)
    expect(camera.ok).toBe(false)
    expect(camera.diagnostics.some((d) => d.code === 'layout.range')).toBe(true)
  })
})
