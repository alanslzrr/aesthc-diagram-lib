import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  hostThemeCss,
  isHexColor,
  themeCss,
  THEME_CONTRACT,
  THEME_SNIPPET_END,
  THEME_SNIPPET_START,
} from '../site/src/lib/code'
import { DEFAULT_LIGHT, DEFAULT_DARK } from '../site/src/lib/palette'
import { MESSAGES } from '../site/src/lib/messages'

describe('validated theme colors', () => {
  it.each(['', '#', '#12', '#12345', '#gggggg', 'red', '#123456; color:red'])(
    'rejects incomplete/unsafe color %s',
    (value) => {
      expect(isHexColor(value)).toBe(false)
      expect(() => themeCss({ ...DEFAULT_LIGHT, background: value }, DEFAULT_DARK)).toThrow(
        'complete hexadecimal',
      )
    },
  )
  it.each(['#123', '#1234', '#aBcDeF', '#12345678'])('accepts complete CSS hex %s', (value) =>
    expect(isHexColor(value)).toBe(true),
  )
  it('exports the announced palette and scopes previews without a root override', () => {
    const css = themeCss(DEFAULT_LIGHT, DEFAULT_DARK)
    for (const value of [...Object.values(DEFAULT_LIGHT), ...Object.values(DEFAULT_DARK)])
      expect(css).toContain(value)
    const scoped = themeCss(DEFAULT_LIGHT, DEFAULT_DARK, '.theme-studio-preview')
    expect(scoped).not.toContain(':root')
    expect(scoped).toContain("[data-theme='dark'] .theme-studio-preview")
    expect(scoped).not.toContain('currentColor')
  })
  it('provides both locales for every interaction message', () => {
    for (const message of Object.values(MESSAGES)) {
      expect(message.en.length).toBeGreaterThan(0)
      expect(message.es.length).toBeGreaterThan(0)
    }
  })
})

describe('one theme contract', () => {
  const copied = themeCss(DEFAULT_LIGHT, DEFAULT_DARK)

  it('carries opaque surfaces, structure and ink in both modes', () => {
    for (const token of [
      '--diagram-node-border',
      '--diagram-structure',
      '--diagram-node-fill',
      '--diagram-secondary-fill',
      '--diagram-container-fill',
      '--cobalt-ink',
      '--branch-ink',
    ])
      expect(copied).toContain(`${token}:`)
    expect(copied).not.toMatch(/--diagram-secondary-fill:\s*transparent/i)
    expect(copied).toContain('color-scheme: light;')
    expect(copied).toContain('color-scheme: dark;')
    for (const [mode, contract] of Object.entries(THEME_CONTRACT)) {
      expect(contract.secondaryFill).not.toBe('transparent')
      expect(contract.nodeBorder).toContain(
        mode === 'light' ? 'var(--foreground) 42%' : 'var(--foreground) 34%',
      )
      expect(contract.structure).toBe(contract.nodeBorder)
    }
  })

  it('generates the live host stylesheet from the same contract', () => {
    expect(hostThemeCss()).toBe(readFileSync('site/src/theme-tokens.css', 'utf8'))
    for (const contract of Object.values(THEME_CONTRACT)) {
      expect(readFileSync('site/src/theme-tokens.css', 'utf8')).toContain(contract.structure)
      expect(readFileSync('site/src/theme-tokens.css', 'utf8')).toContain(contract.secondaryFill)
    }
  })

  it('keeps the documented snippet and the consumer fixture byte-identical to the copy', () => {
    const theming = readFileSync('docs/guides/theming.md', 'utf8')
    const start = theming.indexOf(THEME_SNIPPET_START)
    const end = theming.indexOf(THEME_SNIPPET_END)
    expect(start).toBeGreaterThanOrEqual(0)
    expect(end).toBeGreaterThan(start)
    const block = theming.slice(start, end)
    const fenced = /```css\n([\s\S]*?)```/.exec(block)
    expect(fenced?.[1]).toBe(copied)
    expect(readFileSync('tests/fixtures/package-consumer/theme-copy.css', 'utf8')).toBe(copied)
  })
})
