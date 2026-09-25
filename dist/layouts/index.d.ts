import { F as FlowchartDiagramSpec, D as DiagramLayout, p as SequenceDiagramSpec, q as StateMachineDiagramSpec, r as ErDiagramSpec, T as TimelineDiagramSpec, s as SwimlaneDiagramSpec, h as DiagramSpec, b as LegacyBandSpec } from '../layout-DmZ-4ly5.js';
export { CanvasMetrics, PlacedBand, canvasMetrics, layoutBand } from './band.js';
import '../theme.js';

declare function layoutFlowchart(spec: FlowchartDiagramSpec): DiagramLayout;

declare function layoutSequence(spec: SequenceDiagramSpec): DiagramLayout;

declare function layoutStateMachine(spec: StateMachineDiagramSpec): DiagramLayout;

declare function layoutEr(spec: ErDiagramSpec): DiagramLayout;

declare function layoutTimeline(spec: TimelineDiagramSpec): DiagramLayout;

declare function layoutSwimlane(spec: SwimlaneDiagramSpec): DiagramLayout;

/**
 * Convert an authored spec (any supported type) into shared pixel geometry.
 * Accepts the legacy band spec without a `type` field for backwards
 * compatibility with the original API.
 */
declare function layoutByType(spec: DiagramSpec | LegacyBandSpec): DiagramLayout;
/** Alias kept for API parity with the original `layoutDiagram` helper. */
declare function layoutDiagram(spec: DiagramSpec | LegacyBandSpec): DiagramLayout;

export { layoutByType, layoutDiagram, layoutEr, layoutFlowchart, layoutSequence, layoutStateMachine, layoutSwimlane, layoutTimeline };
