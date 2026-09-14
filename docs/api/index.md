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
| `/examples` | `EXAMPLE_DIAGRAMS`, `registerExampleDiagrams` |
| `/validation` | `validateDiagramSpec`, `assertDiagramSpec`, `validateLocalizedDiagram`, issue/result types |
| `/styles.css` | Generated stylesheet, imported once by the host |

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
