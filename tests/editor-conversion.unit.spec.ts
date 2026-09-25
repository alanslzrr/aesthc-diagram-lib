import { describe, it, expect } from 'vitest'
import { createDocument, convertToGraph } from '../src/editor-core'
import type { DiagramSpec } from '../src/types'
import fixtures from './fixtures/editor/legacy-specs.json'
describe('explicit graph conversion', () => {
  it.each(Object.entries(fixtures))(
    'converts %s as a new document with declared losses',
    (type, spec) => {
      const source = createDocument(spec as DiagramSpec, { id: 'source', locale: 'en' })
      if (!source.ok) throw Error('fixture')
      const before = JSON.stringify(source.value),
        converted = convertToGraph(source.value, { id: 'converted' })
      expect(converted.ok).toBe(true)
      if (!converted.ok) return
      expect(converted.value.document.id).toBe('converted')
      expect(converted.value.document.spec.type).toBe('graph')
      expect(converted.value.sourceDocumentId).toBe('source')
      if (['band', 'swimlane', 'sequence', 'timeline'].includes(type))
        expect(converted.value.losses.length).toBeGreaterThan(0)
      expect(JSON.stringify(source.value)).toBe(before)
    },
  )
})
