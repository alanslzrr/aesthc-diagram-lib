import fs from 'node:fs'
const root = '/Users/alansalazar/development-projects/personal-proyects/aesthc-diagram-lib'
const core = await import(root + '/dist/editor-core/index.js')
const ex = await import(root + '/dist/export/index.js')
function seed() {
  const r = core.createDocument(
    {
      type: 'graph',
      caption: 'Audit fixture',
      legend: { main: 'Main', branch: 'Branch' },
      nodes: [{ id: 'a', label: 'A', description: '' }],
      edges: [],
    },
    { id: 'audit', locale: 'en' },
  )
  if (!r.ok) throw Error(JSON.stringify(r))
  return r.value
}
const doc = seed()
doc.metadata.engineeringProfile = 'deployment-ownership'
doc.metadata.nodes.a = { roles: [], tags: [], owner: 'Team' }
doc.scene.groups = [
  { id: 'region', label: 'Region', kind: 'region', locked: false, nodeIds: [] },
  {
    id: 'sg',
    label: 'Security',
    kind: 'security-group',
    locked: false,
    visibility: 'private',
    parentGroup: 'region',
    nodeIds: [],
  },
  {
    id: 'sub',
    label: 'Subsystem',
    kind: 'system',
    locked: false,
    parentGroup: 'sg',
    nodeIds: ['a'],
  },
]
console.log('nested document valid', core.validateDocument(doc).ok)
console.log('nested security group', JSON.stringify(core.validateDeploymentProfile(doc)))
const custom = seed()
custom.spec.nodes[0].renderer = { typeKey: 'audit-badge', data: {} }
const registry = core.createRendererRegistry()
registry.register({
  typeKey: 'audit-badge',
  validate: () => ({ ok: true, value: {}, diagnostics: [] }),
  measure: () => ({ width: 220, height: 90 }),
  renderSvg: (_data, c) =>
    `<g data-audit-custom="yes"><rect x="${c.x}" y="${c.y}" width="220" height="90" fill="#00aa66"/><text x="${c.x + 10}" y="${c.y + 35}" fill="#ffffff">CUSTOM AUDIT BADGE</text></g>`,
})
const r = ex.exportDocumentHtml(custom, {
  registry,
  runtime: fs.readFileSync(root + '/dist/standalone/viewer.js', 'utf8'),
  css: fs.readFileSync(root + '/dist/viewer.css', 'utf8'),
  fonts: {
    sans: new Uint8Array(fs.readFileSync(root + '/dist/fonts/geist-sans.woff2')),
    mono: new Uint8Array(fs.readFileSync(root + '/dist/fonts/geist-mono.woff2')),
  },
})
console.log('custom HTML', r.ok, r.ok ? r.value.receipt : r.diagnostics)
if (r.ok) fs.writeFileSync('/tmp/aesthc-reaudit-20261003/custom.html', r.value.html)
for (const phase of ['validate', 'measure', 'renderSvg']) {
  const reg = core.createRendererRegistry()
  reg.register({
    typeKey: 'audit-badge',
    validate: () => ({ ok: true, value: {}, diagnostics: [] }),
    measure: () => ({ width: 220, height: 90 }),
    renderSvg: () => '<g></g>',
    [phase]: () => {
      throw Error('trusted renderer failed')
    },
  })
  try {
    console.log(
      'renderer throw ' + phase,
      await ex.exportDocument(custom, {
        format: 'svg',
        scope: { type: 'document' },
        theme: 'light',
        quality: 'edit',
        background: 'theme',
        scale: 1,
        includeSource: false,
        metadata: 'minimal',
        fontPolicy: 'fallback',
        renderers: reg,
      }),
    )
  } catch (e) {
    console.log('renderer throw ' + phase, 'THREW', e.message)
  }
}
