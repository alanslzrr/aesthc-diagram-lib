import { describe, expect, it } from 'vitest'
import { createDocument } from '../src/editor-core'
import type { DiagramDocument } from '../src/editor-core/types'
import { CARD_HEIGHT, CARD_WIDTH, cardSvg, validateCardQuery } from '../src/export/cards'

function document(): DiagramDocument {
  const made = createDocument(
    {
      type: 'graph',
      caption: 'Card fixture',
      legend: { main: 'Main', branch: 'Branch' },
      nodes: [
        { id: 'a', label: 'Alpha', description: '' },
        { id: 'b', label: 'Beta', description: '' },
        { id: 'c', label: 'Gamma', description: '' },
      ],
      edges: [
        { id: 'ab-1', from: 'a', to: 'b' },
        { id: 'ab-2', from: 'a', to: 'b' },
        { id: 'bc', from: 'b', to: 'c' },
      ],
    },
    { id: 'card-seed', locale: 'en' },
  )
  if (!made.ok) throw Error(JSON.stringify(made.diagnostics))
  return made.value
}

describe('E17 context cards', () => {
  it('T41.2 rejects stale, altered and empty receipts without a misleading fallback', () => {
    const doc = document()
    const stale = validateCardQuery(doc, {
      documentId: doc.id,
      revision: doc.revision + 1,
      nodeIds: ['a'],
      edgeIds: [],
    })
    expect(stale.ok).toBe(false)
    expect(stale.diagnostics.some((d) => d.code === 'query.stale')).toBe(true)
    const foreign = validateCardQuery(doc, {
      documentId: 'other-document',
      revision: doc.revision,
      nodeIds: ['a'],
      edgeIds: [],
    })
    expect(foreign.ok).toBe(false)
    const altered = validateCardQuery(doc, {
      documentId: doc.id,
      revision: doc.revision,
      nodeIds: ['ghost'],
      edgeIds: [],
    })
    expect(altered.ok).toBe(false)
    expect(altered.diagnostics.some((d) => d.code === 'reference.missing')).toBe(true)
    const empty = validateCardQuery(doc, {
      documentId: doc.id,
      revision: doc.revision,
      nodeIds: [],
      edgeIds: [],
    })
    expect(empty.ok).toBe(false)
    expect(empty.diagnostics.some((d) => d.code === 'query.invalid')).toBe(true)
  })

  it('T41.2 a canonical card never carries highlights and the query card marks exact parallel ids', () => {
    const doc = document()
    const canonical = cardSvg(doc)
    if (!canonical.ok) throw Error(JSON.stringify(canonical.diagnostics))
    expect(canonical.value.canonical).toBe(true)
    expect(canonical.value.svg).toContain(`width="${CARD_WIDTH}" height="${CARD_HEIGHT}"`)
    expect(canonical.value.svg).toContain(`viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}"`)
    expect(canonical.value.svg).not.toContain('data-query-highlight')
    const query = cardSvg(doc, {
      query: {
        documentId: doc.id,
        revision: doc.revision,
        nodeIds: ['a', 'b'],
        edgeIds: ['ab-1', 'ab-2'],
        label: 'Route Alpha → Beta',
      },
    })
    if (!query.ok) throw Error(JSON.stringify(query.diagnostics))
    expect(query.value.canonical).toBe(false)
    const markup = query.value.svg.replace(/<style>[\s\S]*?<\/style>/g, '')
    const marks = [...markup.matchAll(/data-query-highlight="true"/g)]
    expect(marks.length).toBe(4)
    // Exact parallel identity: ab-2 is highlighted, bc is not.
    expect(markup).toContain('data-edge-id="ab-2" data-query-highlight="true"')
    expect(markup).not.toContain('data-edge-id="bc" data-query-highlight="true"')
    expect(query.value.svg).toContain('Route Alpha → Beta')
  })
})
