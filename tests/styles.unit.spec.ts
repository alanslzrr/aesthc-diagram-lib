import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../dist/styles.css', import.meta.url), 'utf8')
const iconMarker = 'Icon dark/light switching.'

describe('compiled stylesheet cascade contract', () => {
  it('keeps utility output inside the library layer', () => {
    expect(css.startsWith('@layer diagram-lib {')).toBe(true)
    expect(css).toContain('.hidden')
  })

  it('keeps icon visibility rules outside the utility layer', () => {
    const markerIndex = css.indexOf(iconMarker)
    const layerEndIndex = css.lastIndexOf('\n}', markerIndex)

    expect(markerIndex).toBeGreaterThan(0)
    expect(layerEndIndex).toBeGreaterThan(0)
    expect(markerIndex).toBeGreaterThan(layerEndIndex)
    expect(css).toContain('.adl-icon-dark {\n  display: none !important;\n}')
    expect(css).toContain(":is([data-theme='dark'] *) .adl-icon-light {\n  display: none !important;\n}")
    expect(css).toContain(":is([data-theme='dark'] *) .adl-icon-dark {\n  display: block !important;\n}")
  })
})
