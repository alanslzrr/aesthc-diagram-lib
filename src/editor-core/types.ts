// Versioned editor document and headless transaction contracts.
import type {
  BandDiagramNode,
  DiagramBand,
  DiagramContinuation,
  DiagramDecision,
  DiagramEdge,
  DiagramNode,
  DiagramNodeVisual,
  DiagramSpec,
  ErEntity,
  ErRelation,
  PortSide,
  SequenceMessage,
  SequenceParticipant,
  StateMachineState,
  StateTransition,
  SwimlaneLane,
  TimelineEvent,
} from '../types'
import type { TextMeasurer } from '../geometry/text'
import type { DiagramLayout } from '../layout'

export type Locale = 'en' | 'es'
export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }
export interface Point {
  x: number
  y: number
}
export interface Size {
  width: number
  height: number
}
export interface Rect extends Point, Size {}
export interface Viewport {
  x: number
  y: number
  zoom: number
}
export type EntityRef = { kind: 'node' | 'edge' | 'group'; id: string }
export interface FocusSet {
  nodeIds: string[]
  edgeIds: string[]
}

export interface GraphPort {
  id: string
  side: PortSide
  offset: number
  direction: 'in' | 'out' | 'both'
  capacity?: number
  label?: string
}
export interface GraphNode extends DiagramNode {
  ports?: GraphPort[]
  renderer?: { typeKey: string; data: { [key: string]: JsonValue } }
}
export interface GraphEdge extends DiagramEdge {
  sourcePort?: string
  targetPort?: string
}
export interface GraphDiagramSpec {
  type: 'graph'
  profile?: 'architecture' | 'data-flow'
  caption: string
  legend: { main: string; branch: string }
  nodes: GraphNode[]
  edges: GraphEdge[]
}
export type EditorSpec = DiagramSpec | GraphDiagramSpec
export type EditorDiagramType = EditorSpec['type']
export interface NodePlacement extends Rect {
  locked: boolean
}
export interface EndpointAnchor {
  side: PortSide
  offset: number
}
export type RoutePlacement =
  | { mode: 'auto' }
  | {
      mode: 'manual'
      source: EndpointAnchor
      target: EndpointAnchor
      points: Point[]
      label?: Point
    }
export interface DiagramGroup {
  id: string
  label: string
  kind: 'visual' | 'system' | 'region' | 'security-group'
  nodeIds: string[]
  parentGroup?: string
  locked: boolean
}
export interface DiagramScene {
  mode: 'auto' | 'manual' | 'hybrid'
  nodes: Record<string, NodePlacement>
  routes: Record<string, RoutePlacement>
  groups: DiagramGroup[]
  zOrder: string[]
}
export interface Palette {
  background: string
  foreground: string
  card: string
  border: string
  mutedForeground: string
  cobalt: string
  branch: string
}
export interface Presentation {
  theme: { mode: 'light' | 'dark'; light: Palette; dark: Palette }
  grid: { visible: boolean; snap: boolean; size: number }
  padding: number
  legend: 'visible' | 'hidden'
  edgeStyle: 'orthogonal' | 'straight'
  textScale: number
}
export interface DiagramLink {
  label: string
  href: string
}
export interface SourceEvidence {
  id: string
  repository: string
  commit: string
  path: string
  startLine: number
  endLine: number
  blobSha?: string
}
export interface EntityMetadata {
  roles: string[]
  tags: string[]
  notes?: string
  links?: DiagramLink[]
  evidence?: SourceEvidence[]
  owner?: string
  visibility?: 'public' | 'private'
  crossing?: string
}
export interface DocumentMetadata {
  nodes: Record<string, EntityMetadata>
  edges: Record<string, EntityMetadata>
  visuals: Record<string, DiagramNodeVisual>
  engineeringProfile?: 'deployment-ownership'
}
export interface NamedView {
  id: string
  label: string
  note?: string
  focus: FocusSet
  camera?: Viewport
}
export interface StoryStep {
  id: string
  viewId: string
  durationMs: number
  routeEdgeIds?: string[]
}
export interface DiagramDocument {
  format: 'aesthc-diagram'
  schemaVersion: 1
  id: string
  revision: number
  locale: Locale
  spec: EditorSpec
  scene: DiagramScene
  presentation: Presentation
  metadata: DocumentMetadata
  views: NamedView[]
  story: StoryStep[]
  extensions: { [namespace: string]: JsonValue }
}
export interface DiagramFragment {
  format: 'aesthc-diagram-fragment'
  schemaVersion: 1
  sourceDocumentId: string
  document: DiagramDocument
  selection: EntityRef[]
}

export type Capability =
  | 'move-free'
  | 'resize'
  | 'resize-width'
  | 'connect'
  | 'ports'
  | 'waypoints'
  | 'groups'
  | 'reassign-band'
  | 'reassign-lane'
  | 'reorder-participants'
  | 'reorder-messages'
  | 'reorder-events'
  | 'reorder-lanes'
  | 'edit-fields'
export type NodeInput =
  | { diagramType: 'graph'; node: GraphNode }
  | { diagramType: 'flowchart'; node: DiagramNode }
  | { diagramType: 'band'; node: BandDiagramNode }
  | { diagramType: 'swimlane'; node: DiagramNode & { lane: string } }
  | { diagramType: 'sequence'; node: SequenceParticipant }
  | { diagramType: 'state-machine'; node: StateMachineState }
  | { diagramType: 'er'; node: ErEntity }
  | { diagramType: 'timeline'; node: TimelineEvent }
export type RelationInput =
  | { diagramType: 'graph'; relation: GraphEdge & { id: string } }
  | { diagramType: 'band' | 'flowchart' | 'swimlane'; relation: DiagramEdge & { id: string } }
  | { diagramType: 'sequence'; relation: SequenceMessage }
  | { diagramType: 'state-machine'; relation: StateTransition & { id: string } }
  | { diagramType: 'er'; relation: ErRelation & { id: string } }
export type ReorderCollection =
  | 'nodes'
  | 'participants'
  | 'messages'
  | 'states'
  | 'transitions'
  | 'entities'
  | 'relations'
  | 'events'
  | 'lanes'
  | 'edges'
export type StructuralEdit =
  | {
      type: 'bands.replace'
      bands: DiagramBand[]
      assignments: Record<string, number>
      removeNodeIds: string[]
    }
  | {
      type: 'lanes.replace'
      lanes: SwimlaneLane[]
      assignments: Record<string, string>
      removeNodeIds: string[]
    }
  | {
      type: 'band-annotations.replace'
      decisions: DiagramDecision[]
      continuations: DiagramContinuation[]
    }
export interface TypeAdapter {
  type: EditorDiagramType
  capabilities: readonly Capability[]
  nodeIds(spec: EditorSpec): string[]
  edges(spec: EditorSpec): Array<DiagramEdge & { id: string }>
  insertNode(spec: EditorSpec, input: NodeInput, index?: number): Result<EditorSpec>
  replaceNode(spec: EditorSpec, input: NodeInput): Result<EditorSpec>
  removeNodes(spec: EditorSpec, ids: string[]): Result<EditorSpec>
  insertRelation(spec: EditorSpec, input: RelationInput, index?: number): Result<EditorSpec>
  replaceRelation(spec: EditorSpec, input: RelationInput): Result<EditorSpec>
  removeRelations(spec: EditorSpec, ids: string[]): Result<EditorSpec>
  reorder(spec: EditorSpec, collection: ReorderCollection, orderedIds: string[]): Result<EditorSpec>
  seedLayout(spec: EditorSpec): Result<DiagramLayout>
  editStructure(spec: EditorSpec, operation: StructuralEdit): Result<EditorSpec>
}
export interface Diagnostic {
  code: string
  severity: 'error' | 'warning' | 'info'
  path: string
  subject?: EntityRef
  message: string
  evidence?: { [key: string]: JsonValue }
  supportedFixes: Array<
    | 'move'
    | 'resize'
    | 'set-waypoints'
    | 'move-label'
    | 'change-spacing'
    | 'shorten-text-manually'
    | 'select-layout'
  >
}
export type Result<T> =
  { ok: true; value: T; diagnostics: Diagnostic[] } | { ok: false; diagnostics: Diagnostic[] }
export interface Limits {
  maxBytes: number
  maxDepth: number
  maxNodes: number
  maxEdges: number
  maxGroups: number
  maxGroupDepth: number
  maxPorts: number
  maxRoutePoints: number
  maxLabelCharacters: number
  maxDescriptionCharacters: number
  maxViews: number
  maxStorySteps: number
}
export interface ImportOptions {
  id: string
  locale: Locale
  allowLegacyBand?: boolean
  limits?: Partial<Limits>
}
export interface ImportReceipt {
  document: DiagramDocument
  source: 'document-v1' | 'spec' | 'legacy-band' | 'localized'
  materializedEdgeIds: Array<{ index: number; id: string }>
  omittedLocale?: Locale
}
export interface ResolvedScene {
  layout: DiagramLayout
  worldBounds: Rect
  origin: Point
  diagnostics: Diagnostic[]
}
export interface ResolveContext {
  quality: 'edit' | 'publish'
  requestId: string
  signal?: AbortSignal
  /** Real typographic measurer (e.g. canvas-backed). Falls back to a conservative estimate when absent. */
  measureText?: TextMeasurer
}

export type EditorCommand =
  | { type: 'document.replace-content'; document: DiagramDocument }
  | { type: 'spec.replace'; spec: EditorSpec; references: 'reject' | 'prune-references' }
  | { type: 'nodes.move'; positions: Record<string, Point> }
  | { type: 'nodes.set-lock'; ids: string[]; locked: boolean }
  | { type: 'node.resize'; id: string; size: Size }
  | { type: 'route.set'; id: string; route: RoutePlacement }
  | { type: 'group.upsert'; group: DiagramGroup }
  | { type: 'group.remove'; id: string; members: 'keep' | 'delete' }
  | { type: 'presentation.set'; presentation: Presentation }
  | { type: 'metadata.set'; metadata: DocumentMetadata }
  | { type: 'views.set'; views: NamedView[]; story: StoryStep[] }
  | { type: 'scene.set'; scene: DiagramScene }
export interface Transaction {
  id: string
  label: string
  expectedRevision: number
  commands: EditorCommand[]
}
export interface ChangeSet {
  affected: EntityRef[]
  invalidates: Array<'layout' | 'graph' | 'style' | 'views'>
}
export type CommitResult =
  | {
      status: 'committed'
      document: DiagramDocument
      changes: ChangeSet
      diagnostics: Diagnostic[]
    }
  | { status: 'noop'; document: DiagramDocument; diagnostics: Diagnostic[] }
  | { status: 'rejected'; document: DiagramDocument; diagnostics: Diagnostic[] }
export interface EditorPermissions {
  edit: boolean
  export: boolean
  save: boolean
}
export type EditorTool = 'select' | 'hand' | 'connect'
export interface EditorSnapshot {
  document: DiagramDocument
  selection: readonly EntityRef[]
  viewport: Viewport
  tool: EditorTool
  dirty: boolean
  canUndo: boolean
  canRedo: boolean
  diagnostics: readonly Diagnostic[]
  draft:
    | { kind: 'none' }
    | { kind: 'gesture'; preview: DiagramDocument; transactionId: string }
    | { kind: 'text'; text: string; baseRevision: number; diagnostics: Diagnostic[] }
}
export interface StoreOptions {
  document: DiagramDocument
  idFactory?: (kind: 'node' | 'edge' | 'group' | 'transaction' | 'document') => string
  permissions: EditorPermissions
  history?: { maxEntries: number; maxBytes: number }
  limits?: Partial<Limits>
}
export interface EditorStore {
  getSnapshot(): EditorSnapshot
  subscribe(listener: () => void): () => void
  onCommit(listener: (result: Extract<CommitResult, { status: 'committed' }>) => void): () => void
  dispatch(transaction: Transaction): CommitResult
  beginGesture(transaction: Omit<Transaction, 'commands'>): Result<void>
  previewGesture(commands: EditorCommand[]): Result<void>
  commitGesture(): CommitResult
  cancelGesture(): void
  setTextDraft(text: string): void
  commitTextDraft(): CommitResult
  cancelTextDraft(): void
  undo(): CommitResult
  redo(): CommitResult
  setSelection(selection: EntityRef[]): void
  setViewport(viewport: Viewport): void
  setTool(tool: EditorTool): void
  replaceDocument(
    document: DiagramDocument,
    options: { expectedRevision: number; history: 'reset' },
  ): CommitResult
  markSaved(document: DiagramDocument): void
  dispose(): void
}
