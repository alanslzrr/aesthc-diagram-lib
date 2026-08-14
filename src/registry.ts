// Global registry of localized diagrams.
//
// Registering a diagram with `registerDiagram` is all it takes to make new
// content available to `getDiagram` / the <ArchitectureDiagram> renderer:
//
//   registerDiagram('my-project', {
//     diagram: {
//       en: { type: 'flowchart', caption: '...', nodes: [...], edges: [...] },
//       es: { type: 'flowchart', ... },
//     },
//     visuals: { nodeId: { source: 'phosphor', key: 'gauge' } },
//   })

import type {
  DiagramNodeVisual,
  DiagramRegistration,
  DiagramSpec,
  LocalizedDiagram,
} from './types'

export interface RegistryEntry<T extends DiagramSpec = DiagramSpec> {
  diagram: LocalizedDiagram<T>
  visuals: Record<string, DiagramNodeVisual>
}

const registry = new Map<string, RegistryEntry>()

export function registerDiagram<T extends DiagramSpec>(
  key: string,
  registration: DiagramRegistration<T>,
): void {
  const visuals = registration.visuals ?? {}
  registry.set(key, { diagram: registration.diagram, visuals })
}

export function getDiagramEntry(key: string): RegistryEntry | undefined {
  return registry.get(key)
}

export function hasDiagram(key: string): boolean {
  return registry.has(key)
}

export function getDiagram(key: string, locale: string): DiagramSpec {
  const entry = registry.get(key)
  if (!entry) throw new Error(`Unknown diagram key: ${key}`)
  return entry.diagram[locale.startsWith('es') ? 'es' : 'en']
}

export function getDiagramVisuals(key: string): Record<string, DiagramNodeVisual> {
  return registry.get(key)?.visuals ?? {}
}

export function getDiagramKeys(): string[] {
  return [...registry.keys()]
}

export function registerDiagrams(entries: Record<string, DiagramRegistration>): void {
  for (const [key, registration] of Object.entries(entries)) {
    registerDiagram(key, registration)
  }
}
