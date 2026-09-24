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
import { validateDocument, validateEditorSpec } from './validation'

/** Validates the changed payload of a trusted preview without revalidating the whole document. */
function validateCommandDeltas(commands: EditorCommand[], limits: Limits): Diagnostic[] {
  const issues: Diagnostic[] = []
  const finite = (value: unknown, path: string) => {
    if (typeof value !== 'number' || !Number.isFinite(value))
      issues.push({ ...issue('data.finite', path) })
  }
  const finitePoint = (point: { x: number; y: number }, path: string) => {
    finite(point.x, `${path}/x`)
    finite(point.y, `${path}/y`)
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
        if (
          !Number.isFinite(command.size.width) ||
          !Number.isFinite(command.size.height) ||
          command.size.width <= 0 ||
          command.size.height <= 0
        )
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
  const topology = (doc: DiagramDocument) =>
    `${nodesOf(doc.spec)
      .map((n) => n.id)
      .join(',')}|${edgesOf(doc.spec)
      .map((e) => `${e.id}:${e.from}->${e.to}`)
      .sort()
      .join(',')}`
  if (topology(before) !== topology(after)) set.add('graph')
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
    future: DiagramDocument[] = []
  let saved = canonicalizeContent(checked.value),
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
    const bytes = (list: DiagramDocument[]) =>
      list.reduce((sum, doc) => sum + new TextEncoder().encode(JSON.stringify(doc)).length, 0)
    while (
      past.length + future.length > historyLimits.maxEntries ||
      2 * (bytes(past) + bytes(future)) > historyLimits.maxBytes
    ) {
      if (past.length) past.shift()
      else if (future.length) future.shift()
      else break
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
    if (skipValidation) {
      const deltaIssues = validateCommandDeltas(transaction.commands, limits)
      if (deltaIssues.length) return { ok: false as const, diagnostics: deltaIssues.slice(0, 100) }
    }
    let doc = structuredClone(snapshot.document)
    for (const command of transaction.commands) {
      const result = applyCommand(doc, command)
      if (!result.ok) return result
      doc = result.value
    }
    if (skipValidation) return success(doc)
    return validateDocument(doc, limits)
  }
  function publish(doc: DiagramDocument, commands: EditorCommand[]): CommitResult {
    if (snapshot.document.revision >= Number.MAX_SAFE_INTEGER) return rejected('revision.overflow')
    const before = snapshot.document
    doc = { ...doc, revision: before.revision + 1 }
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
    gesture = undefined
    trim()
    notify({
      document: doc,
      selection,
      dirty: contentOf(doc) !== saved,
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
      if (contentOf(result.value) === contentOf(snapshot.document)) return noop()
      if (snapshot.document.revision >= Number.MAX_SAFE_INTEGER)
        return rejected('revision.overflow')
      const entryBytes = bytesOf(snapshot.document) + bytesOf(result.value)
      if (entryBytes > historyLimits.maxBytes) return rejected('history.capacity')
      past.push(snapshot.document)
      future = []
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
      gesture = undefined
      saved = canonicalizeContent(result.value)
      notify({ draft: { kind: 'none' }, selection: [] })
      return publish(structuredClone(result.value), [])
    },
    markSaved(document) {
      if (!permissions.save || disposed) return
      const result = validateDocument(document, limits)
      if (result.ok && document.id === snapshot.document.id) {
        saved = canonicalizeContent(result.value)
        notify({ dirty: canonicalizeContent(snapshot.document) !== saved })
      }
    },
    dispose() {
      disposed = true
      listeners.clear()
      commits.clear()
      past = []
      future = []
      gesture = undefined
    },
  }
  return store
}
