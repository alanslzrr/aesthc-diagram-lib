import * as react from 'react';
import { e as DiagramLayout, H as Highlight, m as DiagramNodeVisual } from '../layout-DyDatn-R.js';
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
}
declare function DiagramCanvas({ layout, highlight, activeNodeId, focusedNodeId, selectedNodeId, onTooltipNodeChange, onFocusNode, onSelectNode, onDismissNode, instanceId, ariaLabel, nodeVisuals, }: DiagramCanvasProps): react.JSX.Element;

interface ArchitectureNodeIconProps {
    size: number;
    visual: DiagramNodeVisual;
    x: number;
    y: number;
}
declare function ArchitectureNodeIcon({ size, visual, x, y }: ArchitectureNodeIconProps): react.JSX.Element;

export { ArchitectureNodeIcon, DiagramCanvas, DiagramCanvas as DiagramCanvasDefault, type DiagramCanvasProps };
