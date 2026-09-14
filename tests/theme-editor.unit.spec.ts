import { describe, expect, it } from 'vitest'
import { isHexColor, themeCss } from '../site/src/lib/code'
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
