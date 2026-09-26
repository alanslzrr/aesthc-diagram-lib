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

describe('E17 document share envelopes', () => {
  it('T40.1 round-trips a document and reads legacy s= spec links', async () => {
    const { decodeShareDocument, encodeShareDocument } = await import('../src/persistence/share')
    const doc = document()
    const encoded = await encodeShareDocument(doc)
    if (!encoded.ok) throw Error(JSON.stringify(encoded.diagnostics))
    expect(encoded.value.startsWith('d=')).toBe(true)
    const decoded = await decodeShareDocument(`#${encoded.value}`)
    if (!decoded.ok) throw Error(JSON.stringify(decoded.diagnostics))
    expect(decoded.value.source).toBe('d')
    expect(decoded.value.document.id).toBe(doc.id)
    expect(decoded.value.document.spec).toEqual(doc.spec)
    // Legacy spec envelope: same shape as the site encoder, decoded as a document.
    const legacy = `s=j${Buffer.from(
      JSON.stringify({
        v: 1,
        k: 'example-graph',
        s: {
          type: 'graph',
          caption: 'Legacy shared',
          legend: { main: 'Main', branch: 'Branch' },
          nodes: [{ id: 'a', label: 'A', description: '' }],
          edges: [],
        },
        l: 'es',
      }),
    ).toString('base64url')}`
    const decodedLegacy = await decodeShareDocument(legacy)
    if (!decodedLegacy.ok) throw Error(JSON.stringify(decodedLegacy.diagnostics))
    expect(decodedLegacy.value.source).toBe('s')
    expect(decodedLegacy.value.document.locale).toBe('es')
    expect(decodedLegacy.value.document.id).toBe('example-graph')
  })

  it('T40.1 rejects future versions, malformed payloads, expansion bombs and timeouts', async () => {
    const { decodeShareDocument } = await import('../src/persistence/share')
    const base64 = (text: string) => Buffer.from(text).toString('base64url')
    // Future version.
    const future = await decodeShareDocument(`d=j${base64(JSON.stringify({ v: 99, d: {} }))}`)
    expect(future.ok).toBe(false)
    expect(future.diagnostics.some((d) => d.code === 'share.future')).toBe(true)
    // Malformed and broken base64.
    for (const hash of ['#d=zbroken', '#d=j@@', 'd=invalid', '']) {
      const result = await decodeShareDocument(hash)
      expect(result.ok).toBe(false)
    }
    // Expansion bomb: a highly compressible payload above the expanded limit.
    const bomb = JSON.stringify({ v: 1, d: { padding: 'a'.repeat(300 * 1024) } })
    const compressed = await new Response(
      new Blob([new TextEncoder().encode(bomb)])
        .stream()
        .pipeThrough(new CompressionStream('deflate-raw')),
    ).arrayBuffer()
    const bombHash = `d=z${Buffer.from(compressed).toString('base64url')}`
    const expanded = await decodeShareDocument(bombHash)
    expect(expanded.ok).toBe(false)
    expect(expanded.diagnostics.some((d) => d.code === 'share.expansion')).toBe(true)
    // Timeout with an injected clock: abort before any read resolves.
    let ticks = 0
    const timedOut = await decodeShareDocument(bombHash, {
      clock: () => ticks++ * 10000,
      timeoutMs: 100,
    })
    expect(timedOut.ok).toBe(false)
    expect(timedOut.diagnostics.some((d) => d.code === 'share.timeout')).toBe(true)
  })

  it('T40.1 encoder refuses oversized documents instead of producing an ambiguous link', async () => {
    const { encodeShareDocument } = await import('../src/persistence/share')
    const doc = document()
    const result = await encodeShareDocument(doc, { limits: { encoded: 8, expanded: 262144 } })
    expect(result.ok).toBe(false)
    expect(result.diagnostics.some((d) => d.code === 'share.too-long')).toBe(true)
  })
})
