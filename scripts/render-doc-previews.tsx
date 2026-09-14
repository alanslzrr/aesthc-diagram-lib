import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DiagramCanvas } from '@aesthc/diagram-lib/canvas'
import { layoutDiagram } from '@aesthc/diagram-lib/layouts'
import { assertDiagramSpec } from '@aesthc/diagram-lib/validation'

mkdirSync('site/dist/docs-assets/previews', { recursive: true })
for (const type of [
  'band',
  'flowchart',
  'sequence',
  'state-machine',
  'er',
  'timeline',
  'swimlane',
]) {
  const spec = JSON.parse(readFileSync(`examples/${type}.json`, 'utf8'))
  assertDiagramSpec(spec)
  const layout = layoutDiagram(spec)
  const markup = renderToStaticMarkup(
    createElement(DiagramCanvas, {
      layout,
      highlight: null,
      activeNodeId: null,
      focusedNodeId: null,
      selectedNodeId: null,
      instanceId: `docs-${type}`,
      ariaLabel: `${type} minimal diagram preview`,
      nodeVisuals: {},
      onTooltipNodeChange: () => {},
      onFocusNode: () => {},
      onSelectNode: () => {},
      onDismissNode: () => {},
    }),
  )
  // These are static illustrations; keyboard interaction lives in the linked
  // playground. Avoid presenting non-functional node buttons to readers.
  writeFileSync(
    `site/dist/docs-assets/previews/${type}.html`,
    markup
      .replace('<svg ', `<svg data-compact="${layout.width <= 550}" `)
      .replace('style="', `style="--preview-min-width:${Math.min(layout.width, 550)}px;`)
      .replaceAll('role="button"', 'role="img"')
      .replaceAll('tabindex="0"', 'tabindex="-1"')
      .replace(/ aria-pressed="[^"]*"/g, ''),
  )
}
