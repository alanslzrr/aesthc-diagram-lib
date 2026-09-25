import type {
  ChangeSet,
  CommitResult,
  Diagnostic,
  DiagramDocument,
  EditorCommand,
  EditorSnapshot,
  EditorStore,
  EntityRef,
  Limits,
  StoreOptions,
  Transaction,
} from './types'
import { canonicalizeContent, importDocument } from './document'
import { applyCommand } from './commands'
import { edgesOf, nodesOf } from './model'
import {
  failure,
  freezeData,
  inspectData,
  issue,
  limitsWith,
  pointer,
  success,
  validId,
} from './data'
import { validateDocument, validateEditorSpec, validateSceneOnly } from './validation'

/** Validates the changed payload of a trusted preview without revalidating the whole document. */
function validateCommandDeltas(commands: EditorCommand[], limits: Limits): Diagnostic[] {
  const issues: Diagnostic[] = []
  const inRange = (value: unknown, min: number, max: number) =>
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
  const finite = (value: unknown, path: string) => {
    if (typeof value !== 'number' || !Number.isFinite(value))
      issues.push({ ...issue('data.finite', path) })
  }
  const finitePoint = (point: { x: number; y: number }, path: string) => {
    finite(point.x, `${path}/x`)
    finite(point.y, `${path}/y`)
    if (!inRange(point.x, -100000, 100000) || !inRange(point.y, -100000, 100000))
      issues.push({ ...issue('layout.range', path) })
  }
  for (const command of commands) {
    switch (command.type) {
      case 'nodes.move':
        for (const [id, point] of Object.entries(command.positions))
          finitePoint(point, `/scene/nodes/${pointer(id)}`)
        break
      case 'node.resize':
        finite(command.size.width, `/scene/nodes/${pointer(command.id)}/width`)
        finite(command.size.height, `/scene/nodes/${pointer(command.id)}/height`)
        if (!inRange(command.size.width, 96, 4096) || !inRange(command.size.height, 48, 4096))
          issues.push({ ...issue('layout.range', `/scene/nodes/${pointer(command.id)}`) })
        break
      case 'route.set':
        if (command.route.mode === 'auto') break
        if (command.route.points.length > limits.maxRoutePoints)
          issues.push({ ...issue('limit.route-points', `/scene/routes/${pointer(command.id)}`) })
        for (const point of command.route.points) finitePoint(point, '/scene/routes')
        if (command.route.label) finitePoint(command.route.label, '/scene/routes')
        finite(command.route.source.offset, '/scene/routes')
        finite(command.route.target.offset, '/scene/routes')
        break
      case 'scene.set':
        for (const [id, placement] of Object.entries(command.scene.nodes)) {
          const path = `/scene/nodes/${pointer(id)}`
          finite(placement.x, `${path}/x`)
          finite(placement.y, `${path}/y`)
          finite(placement.width, `${path}/width`)
          finite(placement.height, `${path}/height`)
          if (
            !inRange(placement.x, -100000, 100000) ||
            !inRange(placement.y, -100000, 100000) ||
            !inRange(placement.width, 96, 4096) ||
            !inRange(placement.height, 48, 4096)
          )
            issues.push({ ...issue('layout.range', path) })
        }
        for (const [edgeId, route] of Object.entries(command.scene.routes)) {
          if (route.mode !== 'manual') continue
          for (const point of route.points) finitePoint(point, `/scene/routes/${pointer(edgeId)}`)
        }
        break
      case 'spec.replace': {
        const checked = validateEditorSpec(command.spec, limits)
        if (!checked.ok) return [...issues, ...checked.diagnostics]
        break
      }
      default:
        break
    }
  }
  return issues
}

/** Content identity and byte size are stable per frozen document object; cache them. */
const contentCache = new WeakMap<DiagramDocument, string>()
const bytesCache = new WeakMap<DiagramDocument, number>()
function contentOf(document: DiagramDocument): string {
  let value = contentCache.get(document)
  if (value === undefined) {
    value = canonicalizeContent(document)
    contentCache.set(document, value)
  }
  return value
}
function bytesOf(document: DiagramDocument): number {
  let value = bytesCache.get(document)
  if (value === undefined) {
    // The canonical keeps revision 0; the true JSON differs only in the digits
    // of the revision token, which is inconsequential for the history guard.
    value = new TextEncoder().encode(contentOf(document)).length
    bytesCache.set(document, value)
  }
  return value
}
const SCENE_ONLY: ReadonlySet<EditorCommand['type']> = new Set([
  'scene.set',
  'nodes.move',
  'node.resize',
  'nodes.set-lock',
  'route.set',
  'group.upsert',
])
/** Commands that can change the scene's structure; moves/resizes only touch values. */
const SCENE_STRUCTURE: ReadonlySet<EditorCommand['type']> = new Set([
  'scene.set',
  'route.set',
  'group.upsert',
])
const isSceneOnly = (commands: EditorCommand[]) =>
  commands.length > 0 && commands.every((command) => SCENE_ONLY.has(command.type))
/** Copy only mutable placement records; unchanged branches remain frozen and shared. */
function cloneSceneForCommands(scene: DiagramDocument['scene'], commands: EditorCommand[]) {
  const ids = new Set<string>()
  for (const command of commands) {
    if (command.type === 'nodes.move') Object.keys(command.positions).forEach((id) => ids.add(id))
    else if (command.type === 'node.resize') ids.add(command.id)
    else if (command.type === 'nodes.set-lock') command.ids.forEach((id) => ids.add(id))
    else return structuredClone(scene)
  }
  const nodes = { ...scene.nodes }
  for (const id of ids) if (nodes[id]) nodes[id] = { ...nodes[id] }
  return { ...scene, nodes }
}
/** True when applying these commands to `scene` would change nothing. */
function commandsMatchScene(scene: DiagramDocument['scene'], commands: EditorCommand[]): boolean {
  for (const command of commands) {
    switch (command.type) {
      case 'nodes.move':
        for (const [id, point] of Object.entries(command.positions)) {
          const placement = scene.nodes[id]
          if (!placement || placement.x !== point.x || placement.y !== point.y) return false
        }
        break
      case 'node.resize': {
        const placement = scene.nodes[command.id]
        if (
          !placement ||
          placement.width !== command.size.width ||
          placement.height !== command.size.height
        )
          return false
        break
      }
      case 'nodes.set-lock':
        for (const id of command.ids) {
          const placement = scene.nodes[id]
          if (!placement || placement.locked !== command.locked) return false
        }
        break
      case 'route.set':
        if (JSON.stringify(scene.routes[command.id]) !== JSON.stringify(command.route)) return false
        break
      case 'scene.set':
        if (!sceneEquals(scene, command.scene)) return false
        break
      case 'group.upsert':
        if (
          JSON.stringify(scene.groups.find((g) => g.id === command.group.id)) !==
          JSON.stringify(command.group)
        )
          return false
        break
      case 'group.remove':
        if (scene.groups.some((g) => g.id === command.id)) return false
        break
    }
  }
  return true
}
/** Structural scene comparison; the scene is flat enough for a direct walk. */
function sceneEquals(a: DiagramDocument['scene'], b: DiagramDocument['scene']): boolean {
  if (a.mode !== b.mode || a.zOrder.length !== b.zOrder.length) return false
  for (let i = 0; i < a.zOrder.length; i++) if (a.zOrder[i] !== b.zOrder[i]) return false
  const aNodes = Object.keys(a.nodes),
    bNodes = Object.keys(b.nodes)
  if (aNodes.length !== bNodes.length) return false
  for (const id of aNodes) {
    const pa = a.nodes[id],
      pb = b.nodes[id]
    if (
      !pb ||
      pa.x !== pb.x ||
      pa.y !== pb.y ||
      pa.width !== pb.width ||
      pa.height !== pb.height ||
      pa.locked !== pb.locked
    )
      return false
  }
  if (Object.keys(a.routes).length !== Object.keys(b.routes).length) return false
  for (const [id, route] of Object.entries(a.routes)) {
    const other = b.routes[id]
    if (!other || JSON.stringify(route) !== JSON.stringify(other)) return false
  }
  if (a.groups.length !== b.groups.length) return false
  for (let i = 0; i < a.groups.length; i++) {
    if (JSON.stringify(a.groups[i]) !== JSON.stringify(b.groups[i])) return false
  }
  return true
}
const sceneBytesCache = new WeakMap<DiagramDocument['scene'], number>()
function sceneBytes(scene: DiagramDocument['scene']): number {
  let value = sceneBytesCache.get(scene)
  if (value === undefined) {
    value = new TextEncoder().encode(JSON.stringify(scene)).length
    sceneBytesCache.set(scene, value)
  }
  return value
}

/** Per-command invalidation so consumers skip unrelated recomputation. */
function invalidationsFor(
  before: DiagramDocument,
  after: DiagramDocument,
  commands: EditorCommand[],
): ChangeSet['invalidates'] {
  const set = new Set<ChangeSet['invalidates'][number]>()
  for (const command of commands) {
    switch (command.type) {
      case 'scene.set':
      case 'nodes.move':
      case 'node.resize':
      case 'nodes.set-lock':
      case 'route.set':
      case 'group.upsert':
      case 'group.remove':
        set.add('layout')
        break
      case 'spec.replace':
        set.add('layout')
        break
      case 'presentation.set':
        set.add('style')
        set.add('layout')
        break
      case 'document.replace-content':
        set.add('layout')
        set.add('graph')
        set.add('style')
        set.add('views')
        break
    }
  }
  const topology = (() => {
    const beforeNodes = new Set(nodesOf(before.spec).map((n) => n.id)),
      afterNodes = new Set(nodesOf(after.spec).map((n) => n.id))
    if (beforeNodes.size !== afterNodes.size) return true
    for (const id of beforeNodes) if (!afterNodes.has(id)) return true
    const beforeEdges = new Map(edgesOf(before.spec).map((e) => [e.id, e])),
      afterEdges = new Map(edgesOf(after.spec).map((e) => [e.id, e]))
    if (beforeEdges.size !== afterEdges.size) return true
    for (const [id, edge] of beforeEdges) {
      const next = afterEdges.get(id)
      if (!next || next.from !== edge.from || next.to !== edge.to) return true
    }
    return false
  })()
  if (topology) set.add('graph')
  if (!commands.length) {
    set.add('graph')
    set.add('style')
    set.add('views')
    set.add('layout')
  }
  return [...set]
}

function affectedFor(
  before: DiagramDocument,
  after: DiagramDocument,
  commands: EditorCommand[],
): EntityRef[] {
  const affected: EntityRef[] = []
  for (const command of commands) {
    switch (command.type) {
      case 'nodes.move':
        for (const id of Object.keys(command.positions)) affected.push({ kind: 'node', id })
        break
      case 'node.resize':
        affected.push({ kind: 'node', id: command.id })
        break
      case 'nodes.set-lock':
        for (const id of command.ids) affected.push({ kind: 'node', id })
        break
      case 'route.set':
        affected.push({ kind: 'edge', id: command.id })
        break
      case 'group.upsert':
        affected.push({ kind: 'group', id: command.group.id })
        break
      case 'group.remove':
        affected.push({ kind: 'group', id: command.id })
        break
    }
  }
  if (affected.length) return affected
  const signature = (node: { id: string }) => `${node.id}|${JSON.stringify(node)}`
  const nodesBefore = new Map(nodesOf(before.spec).map((n) => [n.id, n])),
    nodesAfter = new Map(nodesOf(after.spec).map((n) => [n.id, n]))
  for (const [id, node] of nodesAfter) {
    const previous = nodesBefore.get(id)
    if (!previous || signature(previous) !== signature(node)) affected.push({ kind: 'node', id })
  }
  for (const id of nodesBefore.keys()) if (!nodesAfter.has(id)) affected.push({ kind: 'node', id })
  const edgeId = (edge: { id?: string; from?: string; to?: string }) =>
    edge.id ?? `${edge.from}->${edge.to}`
  const edgesBefore = new Map(edgesOf(before.spec).map((e) => [edgeId(e), e])),
    edgesAfter = new Map(edgesOf(after.spec).map((e) => [edgeId(e), e]))
  const edgeKey = (edge: { from?: string; to?: string; label?: string; variant?: string }) =>
    `${edge.from}->${edge.to}|${edge.label ?? ''}|${edge.variant ?? ''}`
  for (const [id, edge] of edgesAfter) {
    const previous = edgesBefore.get(id)
    if (!previous || edgeKey(previous) !== edgeKey(edge)) affected.push({ kind: 'edge', id })
  }
  for (const id of edgesBefore.keys()) if (!edgesAfter.has(id)) affected.push({ kind: 'edge', id })
  if (!affected.length) for (const id of nodesAfter.keys()) affected.push({ kind: 'node', id })
  return affected
}

export function createEditorStore(options: StoreOptions): EditorStore {
  const limits = limitsWith(options.limits)
  const checked = validateDocument(options.document, limits)
  if (!checked.ok) throw new TypeError(checked.diagnostics.map((d) => d.code).join(', '))
  const permissions = { ...options.permissions }
  const historyLimits = { ...(options.history ?? { maxEntries: 100, maxBytes: 8 * 1024 * 1024 }) }
  if (
    ![historyLimits.maxEntries, historyLimits.maxBytes].every(
      (n) => Number.isSafeInteger(n) && n >= 0,
    )
  )
    throw new RangeError('Invalid history limits')
  const listeners = new Set<() => void>(),
    commits = new Set<(result: Extract<CommitResult, { status: 'committed' }>) => void>()
  let past: DiagramDocument[] = [],
    future: DiagramDocument[] = [],
    pastSizes: number[] = [],
    futureSizes: number[] = []
  let saved = canonicalizeContent(checked.value),
    savedScene = structuredClone(checked.value.scene),
    currentBytes = new TextEncoder().encode(canonicalizeContent(checked.value)).length,
    nonSceneDirty = false,
    disposed = false
  let gesture: { transaction: Omit<Transaction, 'commands'>; commands: EditorCommand[] } | undefined
  let snapshot: EditorSnapshot = freezeData({
    document: structuredClone(checked.value),
    selection: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    tool: 'select',
    dirty: false,
    canUndo: false,
    canRedo: false,
    diagnostics: [],
    draft: { kind: 'none' },
  })
  const rejected = (code: string): CommitResult => ({
    status: 'rejected',
    document: snapshot.document,
    diagnostics: [issue(code)],
  })
  const noop = (): CommitResult => ({
    status: 'noop',
    document: snapshot.document,
    diagnostics: [],
  })
  function notify(patch: Partial<EditorSnapshot>) {
    if (disposed) return
    snapshot = freezeData({ ...snapshot, ...patch })
    for (const listener of [...listeners]) listener()
  }
  function trim() {
    let pastBytes = pastSizes.reduce((sum, size) => sum + size, 0),
      futureBytes = futureSizes.reduce((sum, size) => sum + size, 0)
    while (
      past.length + future.length > historyLimits.maxEntries ||
      2 * (pastBytes + futureBytes) > historyLimits.maxBytes
    ) {
      if (past.length) {
        past.shift()
        pastBytes -= pastSizes.shift()!
      } else if (future.length) {
        future.shift()
        futureBytes -= futureSizes.shift()!
      } else break
    }
  }
  function candidate(transaction: Transaction, skipValidation = false) {
    if (disposed) return failure<DiagramDocument>('store.disposed')
    if (!permissions.edit) return failure<DiagramDocument>('permission.edit')
    if (!skipValidation) {
      const unsafe = inspectData(transaction, { ...limits, maxBytes: limits.maxBytes * 2 })
      if (unsafe.length) return { ok: false as const, diagnostics: unsafe }
    }
    if (!validId(transaction.id)) return failure<DiagramDocument>('id.invalid')
    if (transaction.expectedRevision !== snapshot.document.revision)
      return failure<DiagramDocument>('revision.stale')
    const sceneOnly = isSceneOnly(transaction.commands)
    if (skipValidation || sceneOnly) {
      const deltaIssues = validateCommandDeltas(transaction.commands, limits)
      if (deltaIssues.length) return { ok: false as const, diagnostics: deltaIssues.slice(0, 100) }
    }
    let doc = sceneOnly
      ? {
          ...snapshot.document,
          scene: cloneSceneForCommands(snapshot.document.scene, transaction.commands),
        }
      : structuredClone(snapshot.document)
    for (const command of transaction.commands) {
      const result = applyCommand(doc, command)
      if (!result.ok) return result
      doc = result.value
    }
    if (sceneOnly) {
      if (transaction.commands.some((command) => SCENE_STRUCTURE.has(command.type)))
        return validateSceneOnly(doc, limits)
      return validateSceneOnly(doc, limits)
    }
    if (skipValidation) return success(doc)
    return validateDocument(doc, limits)
  }
  function publish(doc: DiagramDocument, commands: EditorCommand[]): CommitResult {
    if (snapshot.document.revision >= Number.MAX_SAFE_INTEGER) return rejected('revision.overflow')
    const before = snapshot.document
    doc = { ...doc, revision: before.revision + 1 }
    const sceneOnly = isSceneOnly(commands)
    currentBytes = sceneOnly
      ? currentBytes + sceneBytes(doc.scene) - sceneBytes(before.scene)
      : bytesOf(doc)
    const nodeIds = new Set(nodesOf(doc.spec).map((n) => n.id)),
      edgeIds = new Set(edgesOf(doc.spec).map((e) => e.id)),
      groupIds = new Set(doc.scene.groups.map((g) => g.id))
    const selection = snapshot.selection.filter((ref) =>
      (ref.kind === 'node' ? nodeIds : ref.kind === 'edge' ? edgeIds : groupIds).has(ref.id),
    )
    const changes: ChangeSet = {
      affected: affectedFor(before, doc, commands),
      invalidates: invalidationsFor(before, doc, commands),
    }
    if (!sceneOnly) nonSceneDirty = canonicalizeContent({ ...doc, scene: savedScene }) !== saved
    gesture = undefined
    trim()
    notify({
      document: doc,
      selection,
      dirty: sceneOnly
        ? nonSceneDirty || !sceneEquals(doc.scene, savedScene)
        : contentOf(doc) !== saved,
      canUndo: past.length > 0,
      canRedo: future.length > 0,
      diagnostics: [],
      draft: snapshot.draft.kind === 'text' ? snapshot.draft : { kind: 'none' },
    })
    const result: Extract<CommitResult, { status: 'committed' }> = {
      status: 'committed',
      document: snapshot.document,
      diagnostics: [],
      changes,
    }
    for (const listener of [...commits]) listener(result)
    return result
  }
  const store: EditorStore = {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      if (!disposed) listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    onCommit(listener) {
      if (!disposed) commits.add(listener)
      return () => {
        commits.delete(listener)
      }
    },
    dispatch(transaction) {
      const result = candidate(transaction)
      if (!result.ok)
        return { status: 'rejected', document: snapshot.document, diagnostics: result.diagnostics }
      const sceneOnly = isSceneOnly(transaction.commands)
      const unchanged = sceneOnly
        ? commandsMatchScene(snapshot.document.scene, transaction.commands)
        : contentOf(result.value) === contentOf(snapshot.document)
      if (unchanged) return noop()
      if (snapshot.document.revision >= Number.MAX_SAFE_INTEGER)
        return rejected('revision.overflow')
      const entryBytes = sceneOnly
        ? 2 * currentBytes + sceneBytes(result.value.scene) - sceneBytes(snapshot.document.scene)
        : bytesOf(snapshot.document) + bytesOf(result.value)
      if (entryBytes > historyLimits.maxBytes) return rejected('history.capacity')
      pastSizes.push(currentBytes)
      past.push(snapshot.document)
      future = []
      futureSizes = []
      return publish(result.value, transaction.commands)
    },
    beginGesture(transaction) {
      if (snapshot.draft.kind !== 'none') return failure('draft.active')
      const result = candidate({ ...transaction, commands: [] })
      if (!result.ok) return result
      gesture = { transaction: structuredClone(transaction), commands: [] }
      notify({
        draft: { kind: 'gesture', preview: snapshot.document, transactionId: transaction.id },
      })
      return success(undefined)
    },
    previewGesture(commands, options) {
      if (!gesture) return failure('gesture.missing')
      const result = candidate({ ...gesture.transaction, commands }, options?.skipValidation)
      if (!result.ok) return result
      gesture.commands = structuredClone(commands)
      notify({
        draft: { kind: 'gesture', preview: result.value, transactionId: gesture.transaction.id },
      })
      return success(undefined)
    },
    commitGesture() {
      if (!gesture) return rejected('gesture.missing')
      const transaction = { ...gesture.transaction, commands: gesture.commands }
      gesture = undefined
      notify({ draft: { kind: 'none' } })
      return store.dispatch(transaction)
    },
    cancelGesture() {
      gesture = undefined
      if (snapshot.draft.kind === 'gesture') notify({ draft: { kind: 'none' } })
    },
    setTextDraft(text) {
      if (disposed) return
      store.cancelGesture()
      const result = importDocument(text, {
        id: snapshot.document.id,
        locale: snapshot.document.locale,
        limits,
      })
      notify({
        draft: {
          kind: 'text',
          text,
          baseRevision:
            snapshot.draft.kind === 'text'
              ? snapshot.draft.baseRevision
              : snapshot.document.revision,
          diagnostics: result.diagnostics,
        },
      })
    },
    commitTextDraft() {
      if (snapshot.draft.kind !== 'text') return rejected('draft.missing')
      const draft = snapshot.draft
      if (draft.baseRevision !== snapshot.document.revision) return rejected('revision.stale')
      const result = importDocument(draft.text, {
        id: snapshot.document.id,
        locale: snapshot.document.locale,
        limits,
      })
      if (!result.ok)
        return { status: 'rejected', document: snapshot.document, diagnostics: result.diagnostics }
      const commit = store.dispatch({
        id: options.idFactory?.('transaction') ?? 'text-draft',
        label: 'Apply text draft',
        expectedRevision: draft.baseRevision,
        commands: [{ type: 'document.replace-content', document: result.value.document }],
      })
      if (commit.status !== 'rejected') notify({ draft: { kind: 'none' } })
      return commit
    },
    cancelTextDraft() {
      if (snapshot.draft.kind === 'text') notify({ draft: { kind: 'none' } })
    },
    undo() {
      if (disposed || !permissions.edit)
        return rejected(disposed ? 'store.disposed' : 'permission.edit')
      if (!past.length) return noop()
      if (snapshot.document.revision >= Number.MAX_SAFE_INTEGER)
        return rejected('revision.overflow')
      const doc = structuredClone(past.pop()!)
      pastSizes.pop()
      futureSizes.push(currentBytes)
      future.push(snapshot.document)
      return publish(doc, [])
    },
    redo() {
      if (disposed || !permissions.edit)
        return rejected(disposed ? 'store.disposed' : 'permission.edit')
      if (!future.length) return noop()
      if (snapshot.document.revision >= Number.MAX_SAFE_INTEGER)
        return rejected('revision.overflow')
      const doc = structuredClone(future.pop()!)
      futureSizes.pop()
      pastSizes.push(currentBytes)
      past.push(snapshot.document)
      return publish(doc, [])
    },
    setSelection(selection) {
      const nodes = new Set(nodesOf(snapshot.document.spec).map((n) => n.id)),
        edges = new Set(edgesOf(snapshot.document.spec).map((e) => e.id)),
        groups = new Set(snapshot.document.scene.groups.map((g) => g.id))
      const seen = new Set<string>()
      notify({
        selection: selection
          .filter((ref) => {
            const key = JSON.stringify(ref)
            if (
              seen.has(key) ||
              !(ref.kind === 'node' ? nodes : ref.kind === 'edge' ? edges : groups).has(ref.id)
            )
              return false
            seen.add(key)
            return true
          })
          .map((ref) => ({ ...ref })),
      })
    },
    setViewport(viewport) {
      if (
        [viewport.x, viewport.y, viewport.zoom].every(Number.isFinite) &&
        viewport.zoom >= 0.1 &&
        viewport.zoom <= 4
      )
        notify({ viewport: { ...viewport } })
    },
    setTool(tool) {
      if (['select', 'hand', 'connect'].includes(tool)) notify({ tool })
    },
    setPermissions(next) {
      Object.assign(permissions, next)
      notify({})
    },
    replaceDocument(document, replaceOptions) {
      if (disposed || !permissions.edit)
        return rejected(disposed ? 'store.disposed' : 'permission.edit')
      if (replaceOptions.expectedRevision !== snapshot.document.revision)
        return rejected('revision.stale')
      const result = validateDocument(document, limits)
      if (!result.ok)
        return { status: 'rejected', document: snapshot.document, diagnostics: result.diagnostics }
      if (snapshot.document.revision >= Number.MAX_SAFE_INTEGER)
        return rejected('revision.overflow')
      past = []
      future = []
      pastSizes = []
      futureSizes = []
      gesture = undefined
      saved = canonicalizeContent(result.value)
      savedScene = structuredClone(result.value.scene)
      notify({ draft: { kind: 'none' }, selection: [] })
      return publish(structuredClone(result.value), [])
    },
    markSaved(document) {
      if (!permissions.save || disposed) return
      const result = validateDocument(document, limits)
      if (result.ok && document.id === snapshot.document.id) {
        saved = canonicalizeContent(result.value)
        savedScene = structuredClone(result.value.scene)
        nonSceneDirty = canonicalizeContent({ ...snapshot.document, scene: savedScene }) !== saved
        notify({ dirty: canonicalizeContent(snapshot.document) !== saved })
      }
    },
    dispose() {
      disposed = true
      listeners.clear()
      commits.clear()
      past = []
      future = []
      pastSizes = []
      futureSizes = []
      gesture = undefined
    },
  }
  return store
}
