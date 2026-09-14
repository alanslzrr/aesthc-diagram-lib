import type { DiagramSpec } from '@aesthc/diagram-lib'
import { validateDiagramSpec } from '@aesthc/diagram-lib/validation'
export const PLAYGROUND_LIMITS = { expanded: 262144, nodes: 1000, relations: 2000 }

/** UI policy only: pure library consumers may choose different rendering limits. */
export function checkedPlaygroundSpec(input: unknown): DiagramSpec {
  if (input && typeof input === 'object') {
    const record = input as Record<string, unknown>
    for (const field of ['nodes', 'participants', 'states', 'entities', 'events', 'lanes'])
      if (Array.isArray(record[field]) && record[field].length > PLAYGROUND_LIMITS.nodes)
        throw new Error(`Too many diagram nodes: /${field} (maximum ${PLAYGROUND_LIMITS.nodes})`)
    for (const field of ['edges', 'messages', 'relations', 'transitions'])
      if (Array.isArray(record[field]) && record[field].length > PLAYGROUND_LIMITS.relations)
        throw new Error(
          `Too many diagram relations: /${field} (maximum ${PLAYGROUND_LIMITS.relations})`,
        )
  }
  const result = validateDiagramSpec(input)
  if (!result.success)
    throw new Error(result.issues.map(({ path, code }) => `${path || '/'}: ${code}`).join('\n'))
  if (new TextEncoder().encode(JSON.stringify(result.data)).length > PLAYGROUND_LIMITS.expanded)
    throw new Error('Spec exceeds 256 KiB')
  return result.data
}
