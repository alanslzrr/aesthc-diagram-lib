import * as react from 'react';
import { D as DiagramLayout, H as Highlight, k as DiagramNodeVisual } from '../layout-DmZ-4ly5.js';
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
