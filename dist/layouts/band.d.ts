import { B as BandDiagramSpec, e as LegacyBandSpec, P as PlacedNode, f as DiagramLayout } from '../layout-BFDKbm6N.js';
export { g as DiagramDecision, h as DiagramNode, i as EdgeVariant, j as PortSide } from '../layout-BFDKbm6N.js';
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
