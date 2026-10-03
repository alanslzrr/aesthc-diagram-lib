import {
  createDocument,
  createRendererRegistry,
} from '/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/dist/editor-core/index.js'
import { exportDocument } from '/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib/dist/export/index.js'
const d = createDocument(
  {
    type: 'graph',
    caption: 'Probe',
    legend: { main: 'Main', branch: 'Branch' },
    nodes: [{ id: 'a', label: 'A', description: '' }],
    edges: [],
  },
  { id: 'probe', locale: 'en' },
).value
d.spec.nodes[0].renderer = { typeKey: 'test', data: {} }
for (const [phase, value] of [
  ['validate', null],
  ['measure', null],
  ['renderSvg', ''],
  ['renderSvg', {}],
]) {
  const registry = createRendererRegistry()
  registry.register({
    typeKey: 'test',
    validate: () => ({ ok: true, value: {}, diagnostics: [] }),
    measure: () => ({ width: 100, height: 40 }),
    renderSvg: () => '<g/>',
    [phase]: () => value,
  })
  try {
    const r = await exportDocument(d, {
      format: 'svg',
      scope: { type: 'document' },
      theme: 'dark',
      quality: 'edit',
      background: 'theme',
      scale: 1,
      includeSource: false,
      metadata: 'minimal',
      fontPolicy: 'fallback',
      renderers: registry,
    })
    console.log(
      phase,
      JSON.stringify(value),
      'ok',
      r.ok,
      'diagnostics',
      r.diagnostics,
      r.ok ? new TextDecoder().decode(r.value.bytes).includes('[object Object]') : '',
    )
  } catch (e) {
    console.log(phase, JSON.stringify(value), 'THREW', e.message)
  }
}
