import { hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import DocsApp from './DocsApp'
import { rebaseDocPage, type DocPage } from './model'
import '@aesthc/diagram-lib/styles.css'
import '../fonts.css'
import '../design-system.css'
import '../generated/palette.css'
import '../../docs/docs.css'
import '../components/primitives/primitives.css'
import './typeset.css'

const raw: DocPage = JSON.parse(document.getElementById('docs-data')!.textContent!)
const initial = rebaseDocPage(raw, window.location.pathname)
if (raw.contentBase) {
  for (const link of document.querySelectorAll<HTMLLinkElement>('head link[href]')) {
    const href = link.getAttribute('href')!
    if (/^(?:https?:|mailto:)/.test(href)) continue
    const url = new URL(href, window.location.href)
    link.setAttribute('href', url.pathname + url.search + url.hash)
  }
  for (const link of document.querySelectorAll<HTMLAnchorElement>('#docs-root a[href]')) {
    const href = link.getAttribute('href')!
    if (href.startsWith('#') || /^(?:https?:|mailto:)/.test(href)) continue
    const url = new URL(href, window.location.href)
    link.setAttribute('href', url.pathname + url.search + url.hash)
  }
}
hydrateRoot(
  document.getElementById('docs-root')!,
  <BrowserRouter>
    <DocsApp initial={initial} />
  </BrowserRouter>,
)
