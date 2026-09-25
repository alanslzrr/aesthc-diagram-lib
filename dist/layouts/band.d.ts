import { B as BandDiagramSpec, d as LegacyBandSpec, P as PlacedNode, e as DiagramLayout } from '../layout-DyDatn-R.js';
export { f as DiagramDecision, g as DiagramNode, h as EdgeVariant, i as PortSide } from '../layout-DyDatn-R.js';
import '../theme.js';

type BandSpecInput = BandDiagramSpec | LegacyBandSpec;
interface PlacedBand {
    title: string;
    index: number;
    x: number;
}
/** A placed card that remembers its authored column for edge routing. */
interface PlacedBandNode extends PlacedNode {
    band: number;
    slot: number;
}
interface CanvasMetrics {
    height: number;
    midline: number;
}
/** Derives vertical canvas geometry from content instead of a fixed canvas height. */
declare function canvasMetrics(diagram: BandSpecInput): CanvasMetrics;
/** Vertical position of a node's text top inside a card (kind line). */
declare const textTop: (node: PlacedNode) => number;
declare function layoutBand(spec: BandSpecInput, _locale?: 'en' | 'es'): DiagramLayout;

export { type BandSpecInput, type CanvasMetrics, type PlacedBand, type PlacedBandNode, canvasMetrics, layoutBand, textTop };
