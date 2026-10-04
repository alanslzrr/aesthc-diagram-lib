import { createContext, useContext, type RefObject } from 'react'
import type { DocPage } from './model'

/**
 * Host state shared by the site theme components mounted inside the Heyo Docs
 * runtime: the current page payload, its mount-relative slug, and the resolver
 * that turns Heyo slugs back into real site URLs.
 */
export interface DocsRuntimeState {
  page: DocPage
  pending: boolean
  slug: string
  hrefFor: (slug: string) => string
  article: RefObject<HTMLElement | null>
}

export const DocsRuntimeContext = createContext<DocsRuntimeState | null>(null)

export function useDocsRuntime() {
  const runtime = useContext(DocsRuntimeContext)
  if (!runtime) throw Error('Documentation runtime context is missing')
  return runtime
}
