import { F as FlowchartDiagramSpec, f as DiagramLayout, o as SequenceDiagramSpec, p as StateMachineDiagramSpec, q as ErDiagramSpec, T as TimelineDiagramSpec, r as SwimlaneDiagramSpec, l as DiagramSpec, e as LegacyBandSpec } from '../layout-B5aXwz9Z.js';
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
