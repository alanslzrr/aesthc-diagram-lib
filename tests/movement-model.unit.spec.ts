import { describe, expect, it } from 'vitest'
import { MOVEMENT_MODELS, movementModel } from '../site/src/lib/movement'
import type { EditorDiagramType } from '../src/editor-core'

const FREE: EditorDiagramType[] = ['graph', 'flowchart', 'state-machine', 'er']
const MEMBERSHIP: EditorDiagramType[] = ['band', 'swimlane']
const ORDER: EditorDiagramType[] = ['sequence', 'timeline']

describe('capability-aware movement vocabulary', () => {
  it('mirrors the adapter movement model for every diagram type', () => {
    for (const type of FREE) {
      expect(movementModel(type).kind).toBe('free')
      expect(movementModel(type).free).toBe(true)
    }
    for (const type of MEMBERSHIP) {
      expect(movementModel(type).kind).toBe('membership')
      expect(movementModel(type).free).toBe(false)
    }
    for (const type of ORDER) {
      expect(movementModel(type).kind).toBe('order')
      expect(movementModel(type).free).toBe(false)
    }
  })
  it('covers all authored types with both locales', () => {
    expect(Object.keys(MOVEMENT_MODELS)).toHaveLength(8)
    for (const model of Object.values(MOVEMENT_MODELS)) {
      expect(model.label.en.length).toBeGreaterThan(0)
      expect(model.label.es.length).toBeGreaterThan(0)
      expect(model.hint.en.length).toBeGreaterThan(0)
      expect(model.hint.es.length).toBeGreaterThan(0)
    }
    expect(movementModel('band').label.en).toContain('membership')
    expect(movementModel('timeline').label.en).toContain('order')
  })
})
