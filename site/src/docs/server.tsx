import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import DocsApp from './DocsApp'
import type { DocPage } from './model'
export function renderDocs(data: DocPage) {
  return renderToString(
    <StaticRouter location={data.base + data.destination}>
      <DocsApp initial={data} />
    </StaticRouter>,
  )
}
