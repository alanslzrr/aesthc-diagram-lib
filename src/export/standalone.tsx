import { createRoot } from 'react-dom/client'
import { importDocument } from '../editor-core'
import type { ResolveRendererRegistry } from '../editor-core/types'
import { DiagramViewer } from '../viewer'

/**
 * Standalone viewer runtime: bundled into the offline HTML artifact. Reads the
 * embedded document, validates it before rendering and replaces the static
 * no-JS fallback. Text from the document is data, never instructions; the
 * runtime never touches storage or the network.
 *
 * Custom nodes travel as validated, frozen SVG plus measured geometry. The
 * synthetic registry below resolves that frozen data instead of executing
 * renderer code, so boot keeps the same rendering the fallback already shows.
 */
interface FrozenNode {
  svg: string
  width: number
  height: number
  typeKey: string
}

function frozenRegistry(frozen: Record<string, FrozenNode>): ResolveRendererRegistry | undefined {
  if (Object.keys(frozen).length === 0) return undefined
  return {
    resolve(typeKey: string) {
      if (!Object.values(frozen).some((entry) => entry.typeKey === typeKey)) return undefined
      return {
        validate(data: unknown) {
          const id = (data as { __adlFrozen?: unknown } | null)?.__adlFrozen
          if (typeof id === 'string' && frozen[id])
            return { ok: true as const, diagnostics: [], value: id }
          return {
            ok: false as const,
            diagnostics: [
              {
                code: 'renderer.invalid',
                path: '/',
                message: 'renderer.invalid',
                severity: 'error' as const,
                supportedFixes: [],
              },
            ],
          }
        },
        measure(data: unknown) {
          const entry = frozen[data as string]
          return entry ? { width: entry.width, height: entry.height } : { width: 0, height: 0 }
        },
        renderSvg(data: unknown) {
          return frozen[data as string]?.svg ?? ''
        },
      }
    },
  }
}

function boot() {
  const data = document.getElementById('aesthc-document')
  const target = document.getElementById('aesthc-standalone')
  const fallback = document.getElementById('aesthc-fallback')
  if (!data || !target) return
  let parsed: unknown
  try {
    parsed = JSON.parse(data.textContent ?? '')
  } catch {
    return
  }
  let frozen: Record<string, FrozenNode> = {}
  try {
    const frozenData = document.getElementById('aesthc-frozen')
    if (frozenData?.textContent) frozen = JSON.parse(frozenData.textContent) as typeof frozen
  } catch {
    frozen = {}
  }
  const imported = importDocument(parsed, { locale: 'en', id: 'standalone' })
  if (!imported.ok) {
    if (fallback)
      fallback.setAttribute(
        'data-fallback-error',
        imported.diagnostics.map((diagnostic) => diagnostic.code).join(', '),
      )
    return
  }
  if (fallback) fallback.hidden = true
  target.hidden = false
  createRoot(target).render(
    <DiagramViewer
      document={imported.value.document}
      locale={imported.value.document.locale}
      registry={frozenRegistry(frozen)}
    />,
  )
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot)
else boot()
