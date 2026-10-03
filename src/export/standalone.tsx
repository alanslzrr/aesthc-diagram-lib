import { Component, type ReactNode } from 'react'
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
 * Any parse/validation/mount failure leaves the readable fallback visible.
 */
interface FrozenNode {
  svg: string
  width: number
  height: number
  typeKey: string
}

interface FrozenIndex {
  byId: Record<string, FrozenNode>
  byType: Set<string>
}

function parseFrozen(text: string | null): FrozenIndex | null {
  if (!text) return { byId: {}, byType: new Set() }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const byId: Record<string, FrozenNode> = {}
  const byType = new Set<string>()
  for (const [id, value] of Object.entries(parsed)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const entry = value as Record<string, unknown>
    if (typeof entry.typeKey !== 'string' || !entry.typeKey) return null
    if (typeof entry.svg !== 'string' || !entry.svg.trim()) return null
    if (
      typeof entry.width !== 'number' ||
      typeof entry.height !== 'number' ||
      !Number.isFinite(entry.width) ||
      !Number.isFinite(entry.height) ||
      entry.width <= 0 ||
      entry.height <= 0
    )
      return null
    byId[id] = {
      svg: entry.svg,
      width: entry.width,
      height: entry.height,
      typeKey: entry.typeKey,
    }
    byType.add(entry.typeKey)
  }
  return { byId, byType }
}

function frozenRegistry(index: FrozenIndex): ResolveRendererRegistry | undefined {
  if (index.byType.size === 0) return undefined
  return {
    resolve(typeKey: string) {
      if (!index.byType.has(typeKey)) return undefined
      return {
        validate(data: unknown) {
          const id = (data as { __adlFrozen?: unknown } | null)?.__adlFrozen
          if (typeof id === 'string' && index.byId[id])
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
          const entry = index.byId[data as string]
          return entry ? { width: entry.width, height: entry.height } : { width: 0, height: 0 }
        },
        renderSvg(data: unknown) {
          return index.byId[data as string]?.svg ?? ''
        },
      }
    },
  }
}

class ViewerBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

function boot() {
  const data = document.getElementById('aesthc-document')
  const target = document.getElementById('aesthc-standalone')
  const fallback = document.getElementById('aesthc-fallback')
  if (!data || !target) return
  const failStartup = (code: string) => {
    if (fallback) {
      fallback.hidden = false
      fallback.setAttribute('data-fallback-error', code)
    }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(data.textContent ?? '')
  } catch {
    failStartup('document.json')
    return
  }
  const frozen = parseFrozen(document.getElementById('aesthc-frozen')?.textContent ?? null)
  if (!frozen) {
    // Never hide a readable fallback for a corrupt payload.
    failStartup('frozen.invalid')
    return
  }
  const imported = importDocument(parsed, { locale: 'en', id: 'standalone' })
  if (!imported.ok) {
    failStartup(imported.diagnostics.map((diagnostic) => diagnostic.code).join(', '))
    return
  }
  // All runtime data is validated; the handoff can proceed.
  if (fallback) fallback.hidden = true
  target.hidden = false
  createRoot(target).render(
    <ViewerBoundary
      onError={() => {
        target.hidden = true
        failStartup('standalone.mount')
      }}
    >
      <DiagramViewer
        document={imported.value.document}
        locale={imported.value.document.locale}
        registry={frozenRegistry(frozen)}
      />
    </ViewerBoundary>,
  )
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot)
else boot()
