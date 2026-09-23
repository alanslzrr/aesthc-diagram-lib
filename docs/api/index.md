# Public API

The package is ESM. Always use declared exports rather than internal files.

| Import | Exports and purpose |
|---|---|
| `@aesthc/diagram-lib` | Data/types, theme constants, common geometry, registry |
| `/types` | `DiagramSpec`, seven concrete specs, nodes/relations/localized data |
| `/theme` | Geometry constants; not a runtime theme provider |
| `/layout` | `DiagramLayout`, placed geometry, `identifyEdges`, `edgeId`, `diagramEdges`, `buildAdjacency`, `connectedIds`, `nodePorts`, path helpers |
| `/layouts` | `layoutDiagram`, `layoutByType`, seven named layout functions |
| `/layouts/band` | Dedicated band layout and canvas metrics |
| `/registry` | `registerDiagram`, `registerDiagrams`, `getDiagram`, `getDiagramEntry`, `getDiagramKeys`, `getDiagramVisuals`, `hasDiagram` |
| `/canvas` | `DiagramCanvas`, `ArchitectureNodeIcon`, `DiagramCanvasProps` |
| `/showcase` | `DiagramShowcase`, `DiagramShowcaseProps`, `ShowcaseEntry`, `DEFAULT_SHOWCASE_ENTRIES` |
| `/examples` | `EXAMPLE_DIAGRAMS`, `registerExampleDiagrams`, `ARCHITECTURE_EXAMPLES`, `ArchitectureExample`; compatibility: `CLOUD_ARCHITECTURE_SPEC`, `CLOUD_ARCHITECTURE_VISUALS` |
| `/validation` | `validateDiagramSpec`, `assertDiagramSpec`, `validateLocalizedDiagram`, issue/result types |
| `/icons` | `BrandIcon`, `BrandIconName`, `BrandIconProps`; selected local brand artwork with theme variants |
| `/styles.css` | Generated stylesheet, imported once by the host |
| `/editor-core` | Opt-in versioned document, validation, adapters, immutable store, scene and viewport math |
| `/editor` | React editor composition: root, surface, toolbar, inspector and JSON draft panel |
| `/graph` | Authored directed route and reach queries with stable edge identities |
| `/export` | Snapshot-based JSON/SVG/PNG/JPEG/WebP export; explicit fonts and side effects |
| `/persistence` | Memory storage, Web-Locks local storage and opt-in autosave |
| `/render` | Pure escaped SVG renderer for resolved editor scenes |
| `/editor.css` | Opt-in editor control styles; does not change legacy canvas styles |
| `/fonts/*` | Packaged Geist Sans/Mono WOFF2 assets for same-origin loading and export embedding |

## Canvas contract

`layout` is required geometry. `highlight`, `activeNodeId`, `focusedNodeId` and
`selectedNodeId` are controlled state (use null when inactive). Required callbacks:
`onTooltipNodeChange(id, open)`, `onFocusNode(id | null)`, `onSelectNode(id)` and
`onDismissNode(id)`. Also pass unique `instanceId`, meaningful `ariaLabel` and a
`nodeVisuals` record. The complete getting-started example wires these together.

## Validation

`validateDiagramSpec(unknown)` returns `{ success: true, data }` or
`{ success: false, issues }`. Each issue has a JSON-pointer-like `path`, `code` and
`message`. It never evaluates input text. `assertDiagramSpec` throws a formatted
error for invalid data. Validate once at trust boundaries rather than repeatedly
on every render. JSON Schemas describe structure; the helper additionally checks
references, duplicates and finite values. Localized validation also checks topology.

## Layout behavior and defaults

All layouts return pixel geometry without DOM measurements. `layoutDiagram`
dispatches on `type`; the legacy band shape without `type` remains accepted by the
layout dispatcher. Prefer explicit `type` in new data and validation.

Band groups by column; flowchart uses topological levels and routes back edges;
sequence follows authored message order; state machines use a compact ellipse;
ER uses a grid; timeline follows authored event order; swimlane groups responsibility
lanes with topological columns. These are authored layouts, not arbitrary graph
optimization. `flowchart.level` is a global override, not a per-node level.

Legend/caption are required in every spec. Relation variant defaults to `main`;
flowchart direction defaults to `top-down`. Optional layout hints do not replace
reference validation. Inspect each diagram's generated field reference for the
full data model and use explicit IDs for persistent relation identity.

## Brand icons

```tsx
import { BrandIcon } from '@aesthc/diagram-lib/icons'
import '@aesthc/diagram-lib/styles.css'

export function PackageMark() {
  return <BrandIcon name="pnpm" width={16} height={16} aria-label="pnpm" aria-hidden={false} role="img" />
}
```

`BrandIconName` is the supported name union; icons are local, not a remote loader.
For diagram nodes, use explicit `nodeVisuals` with `source: 'thesvg'`; names and
provenance live in [the icon contribution recipe](../../CONTRIBUTING.md#adding-a-brand-icon).
See [Theming](../guides/theming.md) for architecture examples and compatibility constants.

<!-- generated-export-inventory -->
## Complete public symbol inventory

Generated from the TypeScript export graph by `pnpm docs:generate`. Edit the
source contract and the purpose table above, not this inventory. No public
subpaths are excluded; the stylesheet has no JavaScript symbols.

### @aesthc/diagram-lib

`Adjacency`, `BAND_PITCH`, `BAND_X0`, `BandDiagramNode`, `BandDiagramSpec`, `CANVAS_BOTTOM_PAD`, `CANVAS_MIN_WIDTH`, `CANVAS_W`, `CARD_H_FULL`, `CARD_H_SLIM`, `CARD_PADDING_RIGHT`, `CARD_R`, `CARD_TEXT_X`, `CARD_W`, `CONTENT_TOP`, `CONTINUATION_LABEL_GAP`, `CONTINUATION_LABEL_OFFSET`, `CONTINUATION_LENGTH`, `CONTINUATION_PORT_INSET`, `ContinuationAnchor`, `ContinuationSide`, `DECISION_PILL_H`, `DECISION_PILL_R`, `DIMMED_OPACITY`, `DOT_R`, `DiagramBand`, `DiagramContinuation`, `DiagramDecision`, `DiagramDocument`, `DiagramEdge`, `DiagramFragment`, `DiagramLayout`, `DiagramNode`, `DiagramNodeShape`, `DiagramNodeTextAnchor`, `DiagramNodeVisual`, `DiagramRegistration`, `DiagramSpec`, `DiagramType`, `EDGE_STROKE_WIDTH`, `EdgeLabelPlacement`, `EdgeLane`, `EdgeVariant`, `ErDiagramSpec`, `ErEntity`, `ErRelation`, `FLOW_GAP_X`, `FLOW_GAP_Y`, `FlowchartDiagramSpec`, `GraphDiagramSpec`, `Highlight`, `LABEL_CHAR_WIDTH`, `LABEL_EDGE_GAP`, `LABEL_HORIZONTAL_PADDING`, `LANE_R`, `LIFELINE_TOP`, `LegacyBandSpec`, `LocalizedDiagram`, `MESSAGE_PITCH`, `NODE_ICON_SIZE`, `NodePort`, `NodeWeight`, `PILL_H`, `PILL_R`, `PlacedContainer`, `PlacedContinuation`, `PlacedDecision`, `PlacedEdge`, `PlacedLifeline`, `PlacedNode`, `PortSide`, `RegistryEntry`, `SIDE_LANE_GAP`, `SLOT_PITCH`, `SWIMLANE_HEADER_W`, `SWIMLANE_PAD`, `SWIMLANE_ROW_PAD`, `SemanticNodeIconKey`, `SequenceDiagramSpec`, `SequenceMessage`, `SequenceParticipant`, `StateMachineDiagramSpec`, `StateMachineState`, `StateTransition`, `SvglNodeIconKey`, `SwimlaneDiagramSpec`, `SwimlaneLane`, `TIMELINE_ALT_OFFSET`, `TIMELINE_EVENT_GAP`, `TableField`, `ThesvgNodeIconKey`, `TimelineDiagramSpec`, `TimelineEvent`, `buildAdjacency`, `connectY`, `connectedIds`, `diagramEdges`, `edgeId`, `getDiagram`, `getDiagramEntry`, `getDiagramKeys`, `getDiagramVisuals`, `hasDiagram`, `identifyEdges`, `isMutedNode`, `labelPillWidth`, `nodeHeight`, `nodePorts`, `registerDiagram`, `registerDiagrams`, `roundedPolyline`, `splitBackEdges`

### /canvas

`ArchitectureNodeIcon`, `DiagramCanvas`, `DiagramCanvasDefault`, `DiagramCanvasProps`

### /layouts

`CanvasMetrics`, `PlacedBand`, `canvasMetrics`, `layoutBand`, `layoutByType`, `layoutDiagram`, `layoutEr`, `layoutFlowchart`, `layoutSequence`, `layoutStateMachine`, `layoutSwimlane`, `layoutTimeline`

### /layouts/band

`BandSpecInput`, `CanvasMetrics`, `DiagramDecision`, `DiagramNode`, `EdgeVariant`, `PlacedBand`, `PlacedBandNode`, `PortSide`, `canvasMetrics`, `layoutBand`, `textTop`

### /registry

`RegistryEntry`, `getDiagram`, `getDiagramEntry`, `getDiagramKeys`, `getDiagramVisuals`, `hasDiagram`, `registerDiagram`, `registerDiagrams`

### /types

`BandDiagramNode`, `BandDiagramSpec`, `ContinuationAnchor`, `ContinuationSide`, `DiagramBand`, `DiagramContinuation`, `DiagramDecision`, `DiagramDocument`, `DiagramEdge`, `DiagramFragment`, `DiagramNode`, `DiagramNodeShape`, `DiagramNodeTextAnchor`, `DiagramNodeVisual`, `DiagramRegistration`, `DiagramSpec`, `DiagramType`, `EdgeLabelPlacement`, `EdgeLane`, `EdgeVariant`, `ErDiagramSpec`, `ErEntity`, `ErRelation`, `FlowchartDiagramSpec`, `GraphDiagramSpec`, `LegacyBandSpec`, `LocalizedDiagram`, `NodeWeight`, `PortSide`, `SemanticNodeIconKey`, `SequenceDiagramSpec`, `SequenceMessage`, `SequenceParticipant`, `StateMachineDiagramSpec`, `StateMachineState`, `StateTransition`, `SvglNodeIconKey`, `SwimlaneDiagramSpec`, `SwimlaneLane`, `TableField`, `ThesvgNodeIconKey`, `TimelineDiagramSpec`, `TimelineEvent`

### /theme

`BAND_PITCH`, `BAND_X0`, `CANVAS_BOTTOM_PAD`, `CANVAS_MIN_WIDTH`, `CANVAS_W`, `CARD_H_FULL`, `CARD_H_SLIM`, `CARD_PADDING_RIGHT`, `CARD_R`, `CARD_TEXT_X`, `CARD_W`, `CONTENT_TOP`, `CONTINUATION_LABEL_GAP`, `CONTINUATION_LABEL_OFFSET`, `CONTINUATION_LENGTH`, `CONTINUATION_PORT_INSET`, `DECISION_PILL_H`, `DECISION_PILL_R`, `DIMMED_OPACITY`, `DOT_R`, `EDGE_STROKE_WIDTH`, `FLOW_GAP_X`, `FLOW_GAP_Y`, `LABEL_CHAR_WIDTH`, `LABEL_EDGE_GAP`, `LABEL_HORIZONTAL_PADDING`, `LANE_R`, `LIFELINE_TOP`, `MESSAGE_PITCH`, `NODE_ICON_SIZE`, `PILL_H`, `PILL_R`, `SIDE_LANE_GAP`, `SLOT_PITCH`, `SWIMLANE_HEADER_W`, `SWIMLANE_PAD`, `SWIMLANE_ROW_PAD`, `TIMELINE_ALT_OFFSET`, `TIMELINE_EVENT_GAP`

### /layout

`Adjacency`, `DIMMED_OPACITY`, `DiagramLayout`, `Highlight`, `NodePort`, `PlacedContainer`, `PlacedContinuation`, `PlacedDecision`, `PlacedEdge`, `PlacedLifeline`, `PlacedNode`, `buildAdjacency`, `connectY`, `connectedIds`, `diagramEdges`, `edgeId`, `identifyEdges`, `isMutedNode`, `labelPillWidth`, `nodeHeight`, `nodePorts`, `roundedPolyline`, `splitBackEdges`

### /examples

`ARCHITECTURE_EXAMPLES`, `ArchitectureExample`, `CLOUD_ARCHITECTURE_SPEC`, `CLOUD_ARCHITECTURE_VISUALS`, `EXAMPLE_DIAGRAMS`, `registerExampleDiagrams`

### /showcase

`DEFAULT_SHOWCASE_ENTRIES`, `DiagramShowcase`, `DiagramShowcaseDefault`, `DiagramShowcaseProps`, `ShowcaseEntry`

### /validation

`ValidationIssue`, `ValidationResult`, `assertDiagramSpec`, `diagramNodeIds`, `validateDiagramSpec`, `validateLocalizedDiagram`

### /icons

`BrandIcon`, `BrandIconName`, `BrandIconProps`

### /editor-core

`Capability`, `ChangeSet`, `CommitResult`, `ConversionReceipt`, `DEFAULT_LIMITS`, `Diagnostic`, `DiagramDocument`, `DiagramFragment`, `DiagramGroup`, `DiagramLink`, `DiagramScene`, `DocumentMetadata`, `EditorCommand`, `EditorDiagramType`, `EditorPermissions`, `EditorSnapshot`, `EditorSpec`, `EditorStore`, `EditorTool`, `EndpointAnchor`, `EntityMetadata`, `EntityRef`, `FocusSet`, `GraphDiagramSpec`, `GraphEdge`, `GraphNode`, `GraphPort`, `ImportOptions`, `ImportReceipt`, `JsonValue`, `Limits`, `Locale`, `NamedView`, `NodeInput`, `NodePlacement`, `Palette`, `Point`, `Presentation`, `Rect`, `RelationInput`, `ReorderCollection`, `ResolveContext`, `ResolvedScene`, `Result`, `RoutePlacement`, `Size`, `SourceEvidence`, `StoreOptions`, `StoryStep`, `StructuralEdit`, `Transaction`, `TypeAdapter`, `Viewport`, `applyTransaction`, `canonicalizeContent`, `convertToGraph`, `createDocument`, `createEditorStore`, `createFragment`, `defaultPresentation`, `fitViewport`, `getAdapter`, `importDocument`, `pasteFragment`, `resolveDocument`, `screenToWorld`, `serializeDocument`, `validateDocument`, `validateEditorSpec`, `worldToScreen`, `zoomAt`

### /editor

`EditorInspector`, `EditorJsonPanel`, `EditorNodeGeometry`, `EditorOutline`, `EditorRelations`, `EditorRoot`, `EditorRoute`, `EditorSelectionTools`, `EditorStructuredInspector`, `EditorSurface`, `EditorToolbar`, `useEditor`, `useEditorSelector`, `useEditorSnapshot`, `useEditorStore`

### /graph

`GraphFilter`, `GraphSnapshot`, `ReachResult`, `RouteResult`, `findReach`, `findRoute`, `graphSnapshot`

### /export

`ExportArtifact`, `ExportFormat`, `ExportOptions`, `copyArtifact`, `downloadArtifact`, `exportDocument`, `getExportCapabilities`

### /persistence

`AutosaveState`, `SaveResult`, `StorageAdapter`, `StoredDocument`, `StoredEntry`, `createAutosave`, `createLocalStorageAdapter`, `createMemoryStorage`

### /render

`RenderOptions`, `escapeXml`, `renderSceneMarkup`, `renderSvg`
