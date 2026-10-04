import { readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { heyoDocs } from '@heyo-sh/heyo-docs/config'
// @ts-expect-error - the canonical config is plain ESM so build scripts read it directly.
import userConfig from '../heyo-docs.config.mjs'

// Internal working papers (audits, decisions, specs) are not documentation
// pages and never appear in the published navigation.
const INTERNAL = ['audits/', 'decisions/', 'specs/']
const markdownPages = () => {
  const entries = readdirSync('docs', { recursive: true }) as string[]
  return entries
    .filter((entry) => entry.endsWith('.md'))
    .filter((entry) => !INTERNAL.some((prefix) => entry.startsWith(prefix)))
    .map((entry) => `docs/${entry}`)
    .sort()
}

describe('heyo docs content model', () => {
  it('validates with the pinned Heyo Docs builder and covers every Markdown page', () => {
    const config = heyoDocs(userConfig)
    expect(config.theme).toBe('grain')
    expect(config.content).toBe('docs')
    const pages = config.groups
      .flatMap((group) => ('sections' in group ? (group.sections ?? []) : []))
      .flatMap((section) => ('pages' in section ? (section.pages ?? []) : []))
    for (const page of pages) expect(page).toMatch(/^[a-z0-9/-]+$/)
    const mapped = pages.map((page) => `docs/${page}.md`).sort()
    expect(mapped).toEqual(markdownPages())
    expect(pages).toContain('index')
    expect(pages).toContain('guides/editor')
    expect(pages).toContain('api/index')
  })
})
