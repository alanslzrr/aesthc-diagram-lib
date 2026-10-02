import * as react from 'react';
import { D as DiagramLayout, H as Highlight, l as DiagramNodeVisual } from '../layout-B9EEWMV7.js';
import '../theme.js';

interface DiagramCanvasProps {
    layout: DiagramLayout;
    highlight: Highlight | null;
    activeNodeId: string | null;
    focusedNodeId: string | null;
    selectedNodeId: string | null;
    onTooltipNodeChange: (id: string, open: boolean) => void;
    onFocusNode: (id: string | null) => void;
    onSelectNode: (id: string) => void;
    onDismissNode: (id: string) => void;
    instanceId: string;
    ariaLabel: string;
    nodeVisuals: Record<string, DiagramNodeVisual>;
    /**
     * Paint the document dot grid. Set false when the host already renders a
     * single decorative backdrop behind the diagram (gallery, docs previews).
     */
    showGrid?: boolean;
    /**
     * `natural` keeps the legibility floor for wide artboards; `contain` scales
     * the whole SVG down to the container instead of forcing a horizontal scroll.
     */
    fit?: 'natural' | 'contain';
    /**
     * Visible frame. Defaults to the full artboard. Pass `previewBounds(layout)`
     * (or your own useful bounds) to crop authored empty margins while keeping
     * every node inside the frame.
     */
    view?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
declare function DiagramCanvas({ layout, highlight, activeNodeId, focusedNodeId, selectedNodeId, onTooltipNodeChange, onFocusNode, onSelectNode, onDismissNode, instanceId, ariaLabel, nodeVisuals, showGrid, fit, view, }: DiagramCanvasProps): react.JSX.Element;

/** Fit documentation to visible geometry, not unused layout margins.
 * Bezier control points conservatively contain each curve; unsupported path
 * commands retain the complete artboard rather than risking clipped content.
 *
 * `margin` is the decorative slack added on every side. The default is shared
 * with the landing gallery; documentation previews pass a tighter margin so
 * scaled-down labels stay readable at phone widths without touching layout
 * constants or the gallery frames.
 */
declare function previewBounds(layout: DiagramLayout, options?: {
    margin?: number;
}): {
    x: number;
    y: number;
    width: number;
    height: number;
};

interface ArchitectureNodeIconProps {
    size: number;
    visual: DiagramNodeVisual;
    x: number;
    y: number;
}
declare function ArchitectureNodeIcon({ size, visual, x, y }: ArchitectureNodeIconProps): react.JSX.Element;

export { ArchitectureNodeIcon, DiagramCanvas, DiagramCanvas as DiagramCanvasDefault, type DiagramCanvasProps, previewBounds };
