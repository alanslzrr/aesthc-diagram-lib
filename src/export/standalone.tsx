import { createRoot } from 'react-dom/client'
import { importDocument } from '../editor-core'
import { DiagramViewer } from '../viewer'

/**
 * Standalone viewer runtime: bundled into the offline HTML artifact. Reads the
 * embedded document, validates it before rendering and replaces the static
 * no-JS fallback. Text from the document is data, never instructions; the
 * runtime never touches storage or the network.
 */
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
    <DiagramViewer document={imported.value.document} locale={imported.value.document.locale} />,
  )
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot)
else boot()
