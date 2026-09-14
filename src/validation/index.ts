import structural from './structural.js'
import type { DiagramSpec } from '../types'

export interface ValidationIssue {
  path: string
  code: string
  message: string
}
export type ValidationResult<T> =
  { success: true; data: T } | { success: false; issues: ValidationIssue[] }
const unsafe = new Set(['__proto__', 'prototype', 'constructor'])

/** JSON safety preflight also bounds recursive validation of untrusted objects. */
function inspect(
  value: unknown,
  path = '',
  ancestors = new Set<object>(),
  depth = 0,
): ValidationIssue[] {
  if (depth > 64) return [{ path, code: 'depth', message: 'Maximum data depth is 64' }]
  if (typeof value === 'number' && !Number.isFinite(value))
    return [{ path, code: 'finite', message: 'Expected a finite number' }]
  if (typeof value === 'string') {
    try {
      encodeURIComponent(value)
    } catch {
      return [{ path, code: 'unicode', message: 'Unpaired Unicode surrogate is not supported' }]
    }
  }
  if (value === null || typeof value !== 'object') return []
  if (ancestors.has(value))
    return [{ path, code: 'cycle', message: 'Cyclic objects are not diagram data' }]
  ancestors.add(value)
  const issues: ValidationIssue[] = []
  for (const [key, child] of Object.entries(value)) {
    if (unsafe.has(key))
      issues.push({ path: `${path}/${key}`, code: 'unsafe-key', message: 'Reserved object key' })
    issues.push(...inspect(child, `${path}/${key}`, ancestors, depth + 1))
    if (issues.length > 100) break
  }
  ancestors.delete(value)
  return issues
}

export function diagramNodeIds(spec: DiagramSpec): string[] {
  switch (spec.type) {
    case 'sequence':
      return spec.participants.map((node) => node.id)
    case 'state-machine':
      return spec.states.map((node) => node.id)
    case 'er':
      return spec.entities.map((node) => node.id)
    case 'timeline':
      return spec.events.map((node) => node.id)
    default:
      return spec.nodes.map((node) => node.id)
  }
}

function relations(spec: DiagramSpec): Array<{ id?: string; from: string; to: string }> {
  switch (spec.type) {
    case 'sequence':
      return spec.messages
    case 'state-machine':
      return spec.transitions
    case 'er':
      return spec.relations
    case 'timeline':
      return []
    default:
      return spec.edges
  }
}

/** Validate the TypeScript-derived structure, then reference/identity invariants. */
export function validateDiagramSpec(input: unknown): ValidationResult<DiagramSpec> {
  const issues = inspect(input)
  if (issues.length) return { success: false, issues }
  if (!structural(input))
    return {
      success: false,
      issues: (structural.errors ?? []).slice(0, 100).map((error) => ({
        path: error.instancePath || '/',
        code: error.keyword,
        message: `${error.message ?? 'Invalid value'}${error.params.missingProperty ? `: ${error.params.missingProperty}` : ''}`,
      })),
    }
  const spec = input as DiagramSpec
  const add = (path: string, code: string, message: string) => issues.push({ path, code, message })
  const unique = (ids: string[], path: string) => {
    const seen = new Set<string>()
    ids.forEach((id, index) => {
      if (!id.trim() || unsafe.has(id))
        add(`${path}/${index}/id`, 'id', 'Expected a non-empty, non-reserved ID')
      if (seen.has(id)) add(`${path}/${index}/id`, 'duplicate-id', `Duplicate ID: ${id}`)
      seen.add(id)
    })
  }
  const ids = diagramNodeIds(spec)
  unique(ids, '/nodes')
  const nodes = new Set(ids)
  const edges = relations(spec)
  unique(
    edges.flatMap((edge) => (edge.id === undefined ? [] : [edge.id])),
    '/relations',
  )
  edges.forEach((edge, index) => {
    for (const endpoint of ['from', 'to'] as const) {
      if (!nodes.has(edge[endpoint]))
        add(`/relations/${index}/${endpoint}`, 'reference', `Unknown node: ${edge[endpoint]}`)
    }
  })
  if (spec.type === 'band') {
    spec.nodes.forEach((node, index) => {
      if (!Number.isInteger(node.band) || node.band < 0 || node.band >= spec.bands.length)
        add(`/nodes/${index}/band`, 'range', 'Band must reference an existing column')
    })
    unique(
      (spec.continuations ?? []).map((item) => item.id),
      '/continuations',
    )
    unique(
      (spec.decisions ?? []).map((item) => item.id),
      '/decisions',
    )
    for (const [index, item] of (spec.continuations ?? []).entries())
      if (!nodes.has(item.from))
        add(`/continuations/${index}/from`, 'reference', 'Unknown continuation source')
    for (const [index, item] of (spec.decisions ?? []).entries())
      if (!nodes.has(item.source))
        add(`/decisions/${index}/source`, 'reference', 'Unknown decision source')
  }
  if (spec.type === 'swimlane') {
    unique(
      spec.lanes.map((lane) => lane.id),
      '/lanes',
    )
    const lanes = new Set(spec.lanes.map((lane) => lane.id))
    spec.nodes.forEach((node, index) => {
      if (!lanes.has(node.lane)) add(`/nodes/${index}/lane`, 'reference', 'Unknown lane')
    })
  }
  if (
    spec.type === 'flowchart' &&
    spec.level !== undefined &&
    (!Number.isInteger(spec.level) || spec.level < 0)
  )
    add('/level', 'range', 'Level must be a non-negative integer')
  return issues.length ? { success: false, issues } : { success: true, data: spec }
}

export function assertDiagramSpec(input: unknown): asserts input is DiagramSpec {
  const result = validateDiagramSpec(input)
  if (!result.success)
    throw new Error(result.issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n'))
}

/** Locale validation does not mutate either input spec. */
export function validateLocalizedDiagram(
  input: unknown,
): ValidationResult<{ en: DiagramSpec; es: DiagramSpec }> {
  if (!input || typeof input !== 'object')
    return {
      success: false,
      issues: [{ path: '/', code: 'object', message: 'Expected en and es specs' }],
    }
  const record = input as Record<string, unknown>
  const en = validateDiagramSpec(record.en)
  const es = validateDiagramSpec(record.es)
  if (!en.success || !es.success)
    return {
      success: false,
      issues: [
        ...(!en.success ? en.issues.map((issue) => ({ ...issue, path: `/en${issue.path}` })) : []),
        ...(!es.success ? es.issues.map((issue) => ({ ...issue, path: `/es${issue.path}` })) : []),
      ],
    }
  const topology = (spec: DiagramSpec) =>
    JSON.stringify({
      type: spec.type,
      ids: diagramNodeIds(spec),
      edges: relations(spec).map(({ id, from, to }) => [id, from, to]),
    })
  if (topology(en.data) !== topology(es.data))
    return {
      success: false,
      issues: [
        {
          path: '/',
          code: 'topology',
          message: 'Locales must preserve type, ordered IDs and relations',
        },
      ],
    }
  return { success: true, data: { en: en.data, es: es.data } }
}
