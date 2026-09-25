import documentStructural from '../validation/document-structural.js'
import graphStructural from '../validation/graph-structural.js'
import { validateDiagramSpec } from '../validation'
import type { Diagnostic, DiagramDocument, EditorSpec, Limits, Result } from './types'
import { DEFAULT_LIMITS, inspectData, issue, limitsWith, validId, pointer, success } from './data'
import { edgesOf, freeTypes, nodesOf } from './model'

function unique(ids: string[], path: string, errors: Diagnostic[]) {
  const seen = new Set<string>()
  ids.forEach((id, index) => {
    if (!validId(id)) errors.push(issue('id.invalid', `${path}/${index}/id`))
    if (seen.has(id)) errors.push(issue('id.duplicate', `${path}/${index}/id`))
    seen.add(id)
  })
}
function finiteRange(value: number, min: number, max: number) {
  return Number.isFinite(value) && value >= min && value <= max
}
export function validateEditorSpec(
  input: unknown,
  options: Partial<Limits> = {},
): Result<EditorSpec> {
  const limits = limitsWith(options)
  const errors = inspectData(input, limits)
  if (errors.length) return { ok: false, diagnostics: errors }
  const isGraph =
    input !== null && typeof input === 'object' && 'type' in input && input.type === 'graph'
  if (isGraph) {
    if (!graphStructural(input))
      return {
        ok: false,
        diagnostics: (graphStructural.errors ?? [])
          .slice(0, 100)
          .map((e) => issue(`schema.${e.keyword}`, e.instancePath || '/')),
      }
  } else {
    const checked = validateDiagramSpec(input)
    if (!checked.success)
      return {
        ok: false,
        diagnostics: checked.issues.map((e) =>
          issue(
            (
              {
                'duplicate-id': 'id.duplicate',
                reference: 'reference.missing',
                id: 'id.invalid',
              } as Record<string, string>
            )[e.code] ?? `schema.${e.code}`,
            e.path,
            e.message,
          ),
        ),
      }
  }
  const spec = input as EditorSpec
  const nodes = nodesOf(spec),
    edges = edgesOf(spec)
  if (nodes.length > limits.maxNodes) errors.push(issue('limit.nodes', '/spec'))
  if (edges.length > limits.maxEdges) errors.push(issue('limit.edges', '/spec'))
  unique(
    nodes.map((n) => n.id),
    '/spec/nodes',
    errors,
  )
  unique(
    edges.filter((e) => e.id !== undefined).map((e) => e.id!),
    '/spec/edges',
    errors,
  )
  const ids = new Set(nodes.map((n) => n.id))
  for (const [index, edge] of edges.entries()) {
    if (!ids.has(edge.from) || !ids.has(edge.to))
      errors.push(issue('reference.missing', `/spec/edges/${index}`))
  }
  function textLengths(value: unknown, path: string) {
    if (!value || typeof value !== 'object') return
    for (const [key, child] of Object.entries(value)) {
      if (typeof child === 'string') {
        const limit =
          key === 'description' || key === 'notes'
            ? limits.maxDescriptionCharacters
            : limits.maxLabelCharacters
        if (Array.from(child).length > limit)
          errors.push(issue('limit.text', `${path}/${pointer(key)}`))
      } else textLengths(child, `${path}/${pointer(key)}`)
    }
  }
  textLengths(spec, '/spec')
  if (spec.type === 'graph') {
    const ports = new Map<string, NonNullable<(typeof spec.nodes)[number]['ports']>[number]>()
    for (const node of spec.nodes) {
      if ((node.ports?.length ?? 0) > limits.maxPorts)
        errors.push(issue('limit.ports', `/spec/nodes/${pointer(node.id)}/ports`))
      unique(
        (node.ports ?? []).map((p) => p.id),
        `/spec/nodes/${pointer(node.id)}/ports`,
        errors,
      )
      for (const port of node.ports ?? []) {
        if (
          !finiteRange(port.offset, 0, 1) ||
          (port.capacity !== undefined &&
            (!Number.isSafeInteger(port.capacity) || port.capacity < 1))
        )
          errors.push(issue('port.capacity', `/spec/nodes/${pointer(node.id)}/ports`))
        ports.set(JSON.stringify([node.id, port.id]), port)
      }
    }
    const usage = new Map<string, number>()
    for (const edge of spec.edges) {
      for (const [nodeId, portId, direction] of [
        [edge.from, edge.sourcePort, 'out'],
        [edge.to, edge.targetPort, 'in'],
      ] as const) {
        if (portId === undefined) continue
        const key = JSON.stringify([nodeId, portId]),
          port = ports.get(key)
        if (!port) errors.push(issue('port.reference', '/spec/edges'))
        else {
          if (port.direction !== direction && port.direction !== 'both')
            errors.push(issue('port.direction', '/spec/edges'))
          const count = (usage.get(key) ?? 0) + 1
          usage.set(key, count)
          if (port.capacity !== undefined && count > port.capacity)
            errors.push(issue('port.capacity', '/spec/edges'))
        }
      }
    }
  }
  return errors.length ? { ok: false, diagnostics: errors.slice(0, 100) } : success(spec)
}
/**
 * Scene-only validation: placement references and ranges, manual routes,
 * zOrder uniqueness and coverage, and group constraints. Used by the store's
 * scene-only commit fast path where the spec/metadata/views are unchanged and
 * were already validated; `validateDocument` also delegates here for the scene.
 */
export function validateScene(
  document: DiagramDocument,
  options: Partial<Limits> = {},
): Diagnostic[] {
  const limits = limitsWith(options)
  const errors: Diagnostic[] = []
  const nodes = new Set(nodesOf(document.spec).map((n) => n.id))
  const edges = edgesOf(document.spec)
  const edgeIds = new Set(edges.map((e) => e.id))
  const ref = (valid: boolean, path: string) => {
    if (!valid) errors.push(issue('reference.missing', path))
  }
  for (const [id, placement] of Object.entries(document.scene.nodes)) {
    ref(nodes.has(id), `/scene/nodes/${pointer(id)}`)
    if (!freeTypes.has(document.spec.type))
      errors.push(issue('capability.unsupported', '/scene/nodes'))
    if (
      ![placement.x, placement.y].every((n) => finiteRange(n, -100000, 100000)) ||
      !finiteRange(placement.width, 96, 4096) ||
      !finiteRange(placement.height, 48, 4096)
    )
      errors.push(issue('layout.range', `/scene/nodes/${pointer(id)}`))
  }
  const pointValid = (point: { x: number; y: number }) =>
    finiteRange(point.x, -100000, 100000) && finiteRange(point.y, -100000, 100000)
  for (const [id, route] of Object.entries(document.scene.routes)) {
    ref(edgeIds.has(id), `/scene/routes/${pointer(id)}`)
    if (!freeTypes.has(document.spec.type))
      errors.push(issue('capability.unsupported', '/scene/routes'))
    if (route.mode === 'manual') {
      if (route.points.length > limits.maxRoutePoints)
        errors.push(issue('limit.route-points', '/scene/routes'))
      if (
        !route.points.every(pointValid) ||
        (route.label && !pointValid(route.label)) ||
        !finiteRange(route.source.offset, 0, 1) ||
        !finiteRange(route.target.offset, 0, 1)
      )
        errors.push(issue('layout.range', '/scene/routes'))
    }
  }
  unique(document.scene.zOrder, '/scene/zOrder', errors)
  ref(
    document.scene.zOrder.length === nodes.size &&
      document.scene.zOrder.every((id) => nodes.has(id)),
    '/scene/zOrder',
  )
  const groups = new Map(document.scene.groups.map((g) => [g.id, g]))
  unique(
    document.scene.groups.map((g) => g.id),
    '/scene/groups',
    errors,
  )
  if (groups.size > limits.maxGroups) errors.push(issue('limit.groups', '/scene/groups'))
  if (groups.size && !freeTypes.has(document.spec.type))
    errors.push(issue('capability.unsupported', '/scene/groups'))
  const membership = new Set<string>()
  for (const group of document.scene.groups) {
    for (const id of group.nodeIds) {
      ref(nodes.has(id), '/scene/groups')
      if (membership.has(id)) errors.push(issue('group.multiple-parent', '/scene/groups'))
      membership.add(id)
    }
    const chain = new Set<string>([group.id])
    let parent = group.parentGroup
    while (parent !== undefined) {
      if (chain.has(parent)) {
        errors.push(issue('group.cycle', '/scene/groups'))
        break
      }
      chain.add(parent)
      ref(groups.has(parent), '/scene/groups')
      if (chain.size > limits.maxGroupDepth) {
        errors.push(issue('group.depth', '/scene/groups'))
        break
      }
      parent = groups.get(parent)?.parentGroup
    }
  }
  return errors
}

/**
 * Validates a document whose scene is the only part allowed to differ from a
 * previously validated baseline: scene constraints plus unchanged structural
 * identity. Used by the scene-only commit fast path.
 */
export function validateSceneOnly(
  document: DiagramDocument,
  options: Partial<Limits> = {},
): Result<DiagramDocument> {
  if (!documentStructural(document))
    return {
      ok: false,
      diagnostics: (documentStructural.errors ?? [])
        .slice(0, 100)
        .map((e) => issue(`schema.${e.keyword}`, e.instancePath || '/')),
    }
  const errors = validateScene(document, options)
  return errors.length ? { ok: false, diagnostics: errors.slice(0, 100) } : success(document)
}
export function validateDocument(
  input: unknown,
  options: Partial<Limits> = {},
): Result<DiagramDocument> {
  const limits = limitsWith(options)
  const errors = inspectData(input, limits)
  if (errors.length) return { ok: false, diagnostics: errors }
  if (input && typeof input === 'object' && 'schemaVersion' in input && input.schemaVersion !== 1)
    return { ok: false, diagnostics: [issue('version.unsupported', '/schemaVersion')] }
  if (!documentStructural(input))
    return {
      ok: false,
      diagnostics: (documentStructural.errors ?? [])
        .slice(0, 100)
        .map((e) => issue(`schema.${e.keyword}`, e.instancePath || '/')),
    }
  const doc = input as DiagramDocument
  const spec = validateEditorSpec(doc.spec, limits)
  if (!spec.ok) errors.push(...spec.diagnostics)
  if (!validId(doc.id) || !Number.isSafeInteger(doc.revision) || doc.revision < 0)
    errors.push(issue('id.invalid', '/id'))
  errors.push(...validateScene(doc, limits))
  const nodes = new Set(nodesOf(doc.spec).map((n) => n.id))
  const edges = edgesOf(doc.spec)
  const edgeIds = new Set(edges.map((e) => e.id))
  if (edges.some((e) => !e.id)) errors.push(issue('id.invalid', '/spec/edges'))
  const ref = (valid: boolean, path: string) => {
    if (!valid) errors.push(issue('reference.missing', path))
  }
  const pointValid = (point: { x: number; y: number }) =>
    finiteRange(point.x, -100000, 100000) && finiteRange(point.y, -100000, 100000)
  for (const [collection, valid] of [
    [doc.metadata.nodes, nodes],
    [doc.metadata.edges, edgeIds],
  ] as const) {
    for (const [id, meta] of Object.entries(collection)) {
      ref(valid.has(id), '/metadata')
      if ((meta.notes?.length ?? 0) > limits.maxDescriptionCharacters)
        errors.push(issue('limit.text', '/metadata'))
      for (const link of meta.links ?? []) {
        let safe = /^#[^\s]*$/.test(link.href)
        try {
          const url = new URL(link.href)
          safe = url.protocol === 'https:' && !url.username && !url.password
        } catch {
          /* A local fragment may be valid. */
        }
        if (!safe) errors.push(issue('url.scheme', '/metadata/links'))
      }
      for (const evidence of meta.evidence ?? []) {
        if (!/^(?:[a-f\d]{40}|[a-f\d]{64})$/i.test(evidence.commit))
          errors.push(issue('evidence.commit', '/metadata/evidence'))
        if (
          !evidence.path ||
          evidence.path.startsWith('/') ||
          evidence.path.includes('\\') ||
          evidence.path.split('/').some((p) => p === '..' || p === '.')
        )
          errors.push(issue('evidence.path', '/metadata/evidence'))
        if (
          !Number.isSafeInteger(evidence.startLine) ||
          !Number.isSafeInteger(evidence.endLine) ||
          evidence.startLine < 1 ||
          evidence.endLine < evidence.startLine
        )
          errors.push(issue('evidence.range', '/metadata/evidence'))
        try {
          const url = new URL(evidence.repository)
          if (url.protocol !== 'https:' || url.username || url.password) throw Error()
        } catch {
          errors.push(issue('url.scheme', '/metadata/evidence'))
        }
      }
    }
  }
  for (const id of Object.keys(doc.metadata.visuals)) ref(nodes.has(id), '/metadata/visuals')
  const presentation = doc.presentation
  for (const palette of [presentation.theme.light, presentation.theme.dark])
    for (const color of Object.values(palette))
      if (!/^#(?:[a-f\d]{3}|[a-f\d]{4}|[a-f\d]{6}|[a-f\d]{8})$/i.test(color))
        errors.push(issue('presentation.color', '/presentation/theme'))
  if (
    !finiteRange(presentation.grid.size, 4, 64) ||
    !finiteRange(presentation.textScale, 0.75, 1.5) ||
    !finiteRange(presentation.padding, 0, 256)
  )
    errors.push(issue('presentation.range', '/presentation'))
  if (doc.views.length > limits.maxViews) errors.push(issue('limit.views', '/views'))
  if (
    doc.story.length > limits.maxStorySteps ||
    doc.story.reduce((sum, s) => sum + s.durationMs, 0) > 120000
  )
    errors.push(issue('limit.story', '/story'))
  unique(
    doc.views.map((v) => v.id),
    '/views',
    errors,
  )
  unique(
    doc.story.map((s) => s.id),
    '/story',
    errors,
  )
  for (const view of doc.views) {
    ref(
      view.focus.nodeIds.every((id) => nodes.has(id)) &&
        view.focus.edgeIds.every((id) => edgeIds.has(id)),
      '/views',
    )
    if (!view.focus.nodeIds.length && !view.focus.edgeIds.length)
      errors.push(issue('view.empty', '/views'))
    if (view.camera && (!pointValid(view.camera) || !finiteRange(view.camera.zoom, 0.1, 4)))
      errors.push(issue('layout.range', '/views'))
  }
  for (const step of doc.story) {
    ref(
      doc.views.some((v) => v.id === step.viewId),
      '/story',
    )
    if (!finiteRange(step.durationMs, 500, 10000)) errors.push(issue('limit.story', '/story'))
    let previous: string | undefined
    for (const id of step.routeEdgeIds ?? []) {
      const edge = edges.find((e) => e.id === id)
      ref(!!edge, '/story')
      if (previous !== undefined && edge?.from !== previous)
        errors.push(issue('query.invalid', '/story'))
      previous = edge?.to
    }
  }
  if (new TextEncoder().encode(JSON.stringify(doc.extensions)).length > 65536)
    errors.push(issue('limit.bytes', '/extensions'))
  for (const namespace of Object.keys(doc.extensions))
    if (!/^[a-z][a-z\d-]*(?:\.[a-z][a-z\d-]*)+$/.test(namespace))
      errors.push(issue('extension.namespace', '/extensions'))
  return errors.length ? { ok: false, diagnostics: errors.slice(0, 100) } : success(doc)
}
export { DEFAULT_LIMITS }
