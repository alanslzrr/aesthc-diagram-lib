export type DocToken = {
  type: string
  text?: string
  tokens?: DocToken[]
  id?: string
  depth?: number
  lang?: string
  highlighted?: string
  href?: string
  title?: string | null
  ordered?: boolean
  start?: number
  checked?: boolean
  task?: boolean
  items?: DocToken[]
  header?: { text: string; tokens: DocToken[] }[]
  rows?: { text: string; tokens: DocToken[] }[][]
  align?: ('left' | 'center' | 'right' | null)[]
}
export type NavPage = { file: string; label: string; url: string }
export type DocPage = {
  file: string
  title: string
  label: string
  destination: string
  base: string
  origin: string
  version: string
  stable: boolean
  group: string
  nav: { name: string; pages: NavPage[] }[]
  previous: NavPage | null
  next: NavPage | null
  headings: { id: string; text: string; depth: number }[]
  blocks: DocToken[]
  preview: { type: string; html: string; code: string; highlighted: string } | null
}
export function safeHref(href = '') {
  const normalized = href.trim()
  const protocol = normalized.replace(/[\u0000-\u0020\u007f]/g, '')
  return /^(?:https?:|mailto:)/i.test(protocol) || !/^[\w+.-]+:/.test(protocol) ? normalized : '#'
}
