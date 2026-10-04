import type { DiagramDocument, ResolvedScene } from '../editor-core/types'
import { renderSceneMarkup } from '../render'

export interface BaselineFrame {
  document: DiagramDocument
  scene: ResolvedScene
  instanceId: string
  theme: 'light' | 'dark'
  fontGeneration: number
}

/** Only stable-topology manual graphs permit entity patching. Any uncertain
 * invalidation falls back to a complete canonical render, never a stale scene. */
export function baselineUpdate(previous: BaselineFrame | null, next: BaselineFrame) {
  const options = { instanceId: next.instanceId, theme: next.theme, grid: 'none' as const }
  const full = () => ({ full: true, markup: renderSceneMarkup(next.document, next.scene, options) })
  if (
    !previous ||
    next.document.spec.type !== 'graph' ||
    previous.document.scene.mode !== 'manual' ||
    next.document.scene.mode !== 'manual' ||
    previous.document.spec !== next.document.spec ||
    previous.document.presentation !== next.document.presentation ||
    previous.document.metadata !== next.document.metadata ||
    previous.theme !== next.theme ||
    previous.instanceId !== next.instanceId ||
    previous.fontGeneration !== next.fontGeneration ||
    JSON.stringify(previous.document.scene.zOrder) !== JSON.stringify(next.document.scene.zOrder) ||
    JSON.stringify(previous.scene.layout.containers) !==
      JSON.stringify(next.scene.layout.containers)
  )
    return full()
  const nodes = new Set<string>(),
    edges = new Set<string>()
  const oldNodes = previous.scene.layout.nodeById
  const oldEdges = new Map(previous.scene.layout.edges.map((edge) => [edge.id, edge]))
  for (const node of next.scene.layout.nodes)
    if (JSON.stringify(oldNodes[node.id]) !== JSON.stringify(node)) nodes.add(node.id)
  for (const edge of next.scene.layout.edges)
    if (JSON.stringify(oldEdges.get(edge.id)) !== JSON.stringify(edge)) edges.add(edge.id)
  return {
    full: false,
    markup: renderSceneMarkup(next.document, next.scene, { ...options, only: { nodes, edges } }),
  }
}

/** Replace in place to retain canonical edge/node/label z-order and untouched
 * DOM identity. The fragment comes exclusively from our escaped SVG renderer. */
export function patchBaseline(root: SVGGElement, markup: string): boolean {
  if (!markup) return true
  const fragment = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  fragment.innerHTML = markup
  const key = (element: Element) => {
    for (const name of ['data-node-id', 'data-edge-id', 'data-edge-label']) {
      const value = element.getAttribute(name)
      if (value !== null) return `${name}:${value}`
    }
    return null
  }
  const current = new Map([...root.children].map((element) => [key(element), element]))
  const replacements = [...fragment.children].map((element) => ({
    element,
    old: current.get(key(element)),
  }))
  if (replacements.some(({ old }) => !old)) return false
  for (const { element, old } of replacements) old!.replaceWith(element)
  return true
}
