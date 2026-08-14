import type { DiagramSpec, LegacyBandSpec } from '../types'
import type { DiagramLayout } from '../layout'
import { layoutBand } from './band'
import { layoutFlowchart } from './flowchart'
import { layoutSequence } from './sequence'
import { layoutStateMachine } from './state-machine'
import { layoutEr } from './er'
import { layoutTimeline } from './timeline'
import { layoutSwimlane } from './swimlane'

export { layoutBand } from './band'
export { layoutFlowchart } from './flowchart'
export { layoutSequence } from './sequence'
export { layoutStateMachine } from './state-machine'
export { layoutEr } from './er'
export { layoutTimeline } from './timeline'
export { layoutSwimlane } from './swimlane'
export { canvasMetrics, type CanvasMetrics, type PlacedBand } from './band'

/**
 * Convert an authored spec (any supported type) into shared pixel geometry.
 * Accepts the legacy band spec without a `type` field for backwards
 * compatibility with the original API.
 */
export function layoutByType(spec: DiagramSpec | LegacyBandSpec): DiagramLayout {
  const type = 'type' in spec ? spec.type : 'band'
  switch (type) {
    case 'band':
      return layoutBand(spec as Parameters<typeof layoutBand>[0])
    case 'flowchart':
      return layoutFlowchart(spec as Parameters<typeof layoutFlowchart>[0])
    case 'sequence':
      return layoutSequence(spec as Parameters<typeof layoutSequence>[0])
    case 'state-machine':
      return layoutStateMachine(spec as Parameters<typeof layoutStateMachine>[0])
    case 'er':
      return layoutEr(spec as Parameters<typeof layoutEr>[0])
    case 'timeline':
      return layoutTimeline(spec as Parameters<typeof layoutTimeline>[0])
    case 'swimlane':
      return layoutSwimlane(spec as Parameters<typeof layoutSwimlane>[0])
    default:
      return layoutBand(spec as Parameters<typeof layoutBand>[0])
  }
}

/** Alias kept for API parity with the original `layoutDiagram` helper. */
export function layoutDiagram(spec: DiagramSpec | LegacyBandSpec): DiagramLayout {
  return layoutByType(spec)
}
