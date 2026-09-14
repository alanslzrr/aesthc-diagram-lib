// The core/layout graph must remain usable under React's server condition.
// Importing an interactive React module here would make this process fail.
import assert from 'node:assert/strict'
import { getDiagram } from '@aesthc/diagram-lib'
import { registerExampleDiagrams, EXAMPLE_DIAGRAMS } from '@aesthc/diagram-lib/examples'
import { layoutDiagram } from '@aesthc/diagram-lib/layouts'

registerExampleDiagrams()
for (const key of Object.keys(EXAMPLE_DIAGRAMS)) {
  const result = layoutDiagram(getDiagram(key, 'en'))
  assert.ok(Number.isFinite(result.width) && result.width > 0)
  assert.ok(Number.isFinite(result.height) && result.height > 0)
}
console.log('All seven layouts work under the react-server condition')
