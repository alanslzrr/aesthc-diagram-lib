import { useMemo, useState } from 'react'
import {
  createDocument,
  createLayoutProviderRegistry,
  createRendererRegistry,
  renderCustomNode,
  runRegisteredLayout,
} from '@aesthc/diagram-lib/editor-core'
import type { CustomNodeRenderer, RegisteredLayoutProvider } from '@aesthc/diagram-lib/editor-core'

/** A trusted renderer registered per instance: validate, measure and render
 * canonical SVG. The payload travelling in the document is plain JSON. */
const metricCard: CustomNodeRenderer<{ title: string; value: string }> = {
  typeKey: 'metric-card',
  validate(data) {
    const candidate = data as { title?: unknown; value?: unknown }
    if (typeof candidate?.title !== 'string' || typeof candidate?.value !== 'string')
      return { ok: false, diagnostics: [{ code: 'metric.invalid', path: '/', message: 'metric.invalid', severity: 'error', supportedFixes: [] }] }
    return { ok: true, diagnostics: [], value: { title: candidate.title, value: candidate.value } }
  },
  measure(data) {
    return { width: Math.max(160, data.title.length * 8 + 32), height: 72 }
  },
  renderSvg(data, context) {
    const escape = (text: string) =>
      text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
    const width = Math.max(160, data.title.length * 8 + 32)
    return (
      `<g data-custom-renderer="metric-card">` +
      `<rect x="${context.x}" y="${context.y}" width="${width}" height="72" rx="8" fill="${context.palette.card}" stroke="${context.palette.border}"/>` +
      `<text x="${context.x + 16}" y="${context.y + 28}" font-family="Geist, sans-serif" font-size="13" fill="${context.palette.foreground}">${escape(data.title)}</text>` +
      `<text x="${context.x + 16}" y="${context.y + 52}" font-family="Geist Mono, monospace" font-size="18" fill="${context.palette.foreground}">${escape(data.value)}</text>` +
      `</g>`
    )
  },
}

/** A slow layout provider registered explicitly by the host; it can be
 * cancelled and its result only publishes when it is the latest request. */
const slowGrid: RegisteredLayoutProvider = {
  id: 'slow-grid',
  async run({ document, signal }) {
    await new Promise((resolve) => setTimeout(resolve, 10))
    if (signal.aborted) throw new Error('operation.aborted')
    const nodes = document.spec.type === 'graph' ? document.spec.nodes : []
    return {
      ...document.scene,
      mode: 'manual',
      nodes: Object.fromEntries(
        nodes.map((node, index) => [
          node.id,
          { x: (index % 4) * 240, y: Math.floor(index / 4) * 120, width: 200, height: 72, locked: false },
        ]),
      ),
      zOrder: nodes.map((node) => node.id),
    }
  },
}

export function CustomNodeExample() {
  const [message, setMessage] = useState('')
  const registries = useMemo(() => {
    const renderers = createRendererRegistry()
    const providers = createLayoutProviderRegistry()
    const registeredRenderer = renderers.register(metricCard)
    const registeredProvider = providers.register(slowGrid)
    if (!registeredRenderer.ok || !registeredProvider.ok) throw new Error('registration failed')
    return { renderers, providers }
  }, [])
  const registered = renderCustomNode(
    registries.renderers,
    { typeKey: 'metric-card', data: { title: 'Requests per second', value: '1 240' } },
    {
      fontSize: 13,
      theme: 'light',
      palette: {
        background: '#e9eef4',
        foreground: '#202b38',
        card: '#f9fbfd',
        border: '#aebdcd',
        muted: '#536273',
      },
      x: 24,
      y: 24,
    },
  )
  async function relayout() {
    const document = createDocument(
      {
        type: 'graph',
        caption: 'Custom provider',
        legend: { main: 'Main', branch: 'Branch' },
        nodes: [
          { id: 'a', label: 'A', description: '' },
          { id: 'b', label: 'B', description: '' },
        ],
        edges: [{ id: 'ab', from: 'a', to: 'b' }],
      },
      { id: 'custom-provider', locale: 'en' },
    )
    if (!document.ok) return
    let latest = 'one'
    const outcome = await runRegisteredLayout(document.value, registries.providers, 'slow-grid', {
      expectedRevision: document.value.revision,
      latestRequestId: () => latest,
      requestId: 'one',
    })
    latest = 'one'
    setMessage(
      outcome.ok && outcome.value.status === 'applied'
        ? 'Custom layout applied.'
        : 'Custom layout rejected; last-good scene kept.',
    )
  }
  return (
    <section>
      {registered.ok ? (
        <svg
          viewBox="0 0 320 120"
          width="320"
          height="120"
          dangerouslySetInnerHTML={{ __html: registered.value.svg }}
        />
      ) : (
        <p role="status">{registered.diagnostics.map((diagnostic) => diagnostic.code).join(', ')}</p>
      )}
      <button type="button" onClick={() => void relayout()}>
        Run registered layout
      </button>
      {message && <p role="status">{message}</p>}
    </section>
  )
}