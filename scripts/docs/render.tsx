import { posix } from 'node:path'
import { readFileSync } from 'node:fs'
import { renderDocs } from '../../site/src/docs/server'
import type { DocPage } from '../../site/src/docs/model'
const escape = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
export function renderDocument(data: DocPage) {
  const built = readFileSync('site/dist/docs.html', 'utf8')
  const contentBase = data.contentBase ?? data.base
  const assets = [
    ...built.matchAll(
      /<(?:script[^>]*src="[^"]+"[^>]*><\/script|link[^>]+rel="stylesheet"[^>]*|link[^>]+rel="modulepreload"[^>]*)>/g,
    ),
  ]
    .map(([tag]) => tag)
    .join('')
    .replaceAll(`${data.base}assets/`, `${contentBase}assets/`)
  const payload = JSON.stringify(data)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(data.title)} · @aesthc/diagram-lib</title><meta name="description" content="${escape(data.title)} for @aesthc/diagram-lib ${data.version}"><link rel="canonical" href="${data.origin}${data.destination}"><link rel="icon" href="${contentBase}favicon.svg"><meta property="og:title" content="${escape(data.title)}"><meta property="og:image" content="${data.contentBase ? data.origin + `versions/${data.version}/` : data.origin}og.png"><link rel="alternate" type="text/markdown" href="${data.base}${data.destination}index.md"><link rel="describedby" href="${contentBase}llms.txt" type="text/plain"><script src="${contentBase}docs-assets/theme.js"></script>${assets}</head><body><div id="docs-root">${renderDocs(data)}</div><script id="docs-data" type="application/json">${payload}</script></body></html>`
  if (!data.contentBase) return html
  const directory = posix.dirname(`${data.destination}index.html`)
  return html.replace(/(href|src)="([^"]+)"/g, (full, attribute, url) => {
    if (!url.startsWith(data.base)) return full
    const [path, suffix = ''] = url.slice(data.base.length).split(/(?=[?#])/)
    const relative = posix.relative(directory, path || '.') || '.'
    return `${attribute}="${relative}${path.endsWith('/') ? '/' : ''}${suffix}"`
  })
}
