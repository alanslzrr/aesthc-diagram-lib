import type { Result } from './types'
import { failure, success } from './data'

/** Custom node payload: JSON data plus a typeKey. Code never travels in the
 * payload; the trusted per-instance registry holds the behavior. */
export interface CustomNodePayload {
  typeKey: string
  data: unknown
}
export interface CustomRenderContext {
  theme: 'light' | 'dark'
  palette: { background: string; foreground: string; card: string; border: string; muted: string }
  x: number
  y: number
}
export interface CustomNodeRenderer<T = unknown> {
  typeKey: string
  validate(data: unknown): Result<T>
  /** Deterministic box for layout and export. */
  measure(data: T, role: { fontSize: number }): { width: number; height: number }
  /** Canonical SVG fragment for the node, escaped by the renderer. */
  renderSvg(data: T, context: CustomRenderContext): string
}
export interface RendererRegistry {
  register<T>(renderer: CustomNodeRenderer<T>): Result<void>
  resolve(typeKey: string): CustomNodeRenderer | undefined
  typeKeys(): string[]
}
/** Local, trusted and per-instance: nothing is loaded from a payload, a URL or
 * a global singleton. Unknown typeKeys resolve to `undefined` and consumers
 * report `renderer.unsupported`. */
export function createRendererRegistry(): RendererRegistry {
  const renderers = new Map<string, CustomNodeRenderer>()
  return {
    register(renderer) {
      if (!renderer.typeKey || typeof renderer.validate !== 'function')
        return failure('renderer.invalid')
      if (renderers.has(renderer.typeKey)) return failure('renderer.duplicate')
      renderers.set(renderer.typeKey, renderer as CustomNodeRenderer)
      return success(undefined)
    },
    resolve(typeKey) {
      return renderers.get(typeKey)
    },
    typeKeys() {
      return [...renderers.keys()]
    },
  }
}
export function validateCustomPayload(
  registry: RendererRegistry,
  payload: unknown,
): Result<{ renderer: CustomNodeRenderer; data: unknown }> {
  if (!payload || typeof payload !== 'object') return failure('renderer.invalid')
  const candidate = payload as Partial<CustomNodePayload>
  if (typeof candidate.typeKey !== 'string' || !candidate.typeKey)
    return failure('renderer.invalid')
  const renderer = registry.resolve(candidate.typeKey)
  if (!renderer) return failure('renderer.unsupported')
  const checked = renderer.validate(candidate.data)
  if (!checked.ok) return checked
  return success({ renderer, data: checked.value })
}
/** Measures with the registered renderer and renders the canonical SVG
 * fragment. An unsupported typeKey is reported before any rendering. */
export function renderCustomNode(
  registry: RendererRegistry,
  payload: unknown,
  context: CustomRenderContext & { fontSize: number },
): Result<{ svg: string; width: number; height: number; typeKey: string }> {
  const validated = validateCustomPayload(registry, payload)
  if (!validated.ok) return validated
  const size = validated.value.renderer.measure(validated.value.data, {
    fontSize: context.fontSize,
  })
  if (
    !Number.isFinite(size.width) ||
    !Number.isFinite(size.height) ||
    size.width <= 0 ||
    size.height <= 0
  )
    return failure('renderer.measure')
  const svg = validated.value.renderer.renderSvg(validated.value.data, context)
  if (typeof svg !== 'string' || !svg.trim()) return failure('renderer.empty')
  return success({
    svg,
    width: size.width,
    height: size.height,
    typeKey: validated.value.renderer.typeKey,
  })
}
