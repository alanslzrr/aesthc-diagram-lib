import { hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import DocsApp from './DocsApp'
import type { DocPage } from './model'
import '@aesthc/diagram-lib/styles.css'
import '../fonts.css'
import '../design-system.css'
import '../../docs/docs.css'
import '../components/primitives/primitives.css'
import './typeset.css'

const initial: DocPage = JSON.parse(document.getElementById('docs-data')!.textContent!)
hydrateRoot(
  document.getElementById('docs-root')!,
  <BrowserRouter>
    <DocsApp initial={initial} />
  </BrowserRouter>,
)
