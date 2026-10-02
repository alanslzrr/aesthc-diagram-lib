import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DiagramCanvas } from '@aesthc/diagram-lib/canvas'
import { layoutDiagram } from '@aesthc/diagram-lib/layouts'
import { getDiagramVisuals } from '@aesthc/diagram-lib'
import { EXAMPLE_DIAGRAMS } from '@aesthc/diagram-lib/examples'
import { assertDiagramSpec } from '@aesthc/diagram-lib/validation'
import { previewBounds } from './docs/preview-bounds'

mkdirSync('site/dist/docs-assets/previews', { recursive: true })

function writePreview(key, spec, visuals, ariaLabel) {
  assertDiagramSpec(spec)
  const layout = layoutDiagram(spec)
  const bounds = previewBounds(layout)
  const markup = renderToStaticMarkup(
    createElement(DiagramCanvas, {
      layout,
      highlight: null,
      activeNodeId: null,
      focusedNodeId: null,
      selectedNodeId: null,
      instanceId: `docs-${key}`,
      ariaLabel,
      nodeVisuals: visuals,
      // The docs shell owns the single decorative dot backdrop; the preview
      // itself scales down to fit instead of forcing a horizontal scroll.
      showGrid: false,
      fit: 'contain',
      onTooltipNodeChange: () => {},
      onFocusNode: () => {},
      onSelectNode: () => {},
      onDismissNode: () => {},
    }),
  )
  // These are static illustrations; keyboard interaction lives in the linked
  // playground. Avoid presenting non-functional node buttons to readers.
  writeFileSync(
    `site/dist/docs-assets/previews/${key}.html`,
    markup
      .replace(
        `viewBox="0 0 ${layout.width} ${layout.height}"`,
        `viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}"`,
      )
      .replace(/max-width:[^;"]+/, `max-width:${bounds.width}px`)
      .replaceAll('role="button"', 'role="img"')
      .replaceAll('tabindex="0"', 'tabindex="-1"')
      .replace(/ aria-pressed="[^"]*"/g, ''),
  )
}

for (const type of [
  'band',
  'flowchart',
  'sequence',
  'state-machine',
  'er',
  'timeline',
  'swimlane',
]) {
  writePreview(
    type,
    JSON.parse(readFileSync(`examples/${type}.json`, 'utf8')),
    {},
    `${type} minimal diagram preview`,
  )
}

// Documentation landing: the full localized band example instead of the
// two-card minimal spec, so the intro shows the library's real output.
writePreview(
  'overview',
  EXAMPLE_DIAGRAMS['example-band'].diagram.en,
  getDiagramVisuals('example-band'),
  'Band example: intake, validation and policy-gated outcome',
)
