import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(new URL('../dist/styles.css', import.meta.url), 'utf8')
const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { sideEffects?: unknown }
const iconMarker = 'Icon dark/light switching.'

describe('compiled stylesheet cascade contract', () => {
  it('keeps utility output inside the library layer', () => {
    expect(css.startsWith('@layer diagram-lib {')).toBe(true)
    // Generic utility names the canvas shares with any Tailwind host must
    // live inside the layer so the host always wins on conflicts. (`.hidden`
    // left the compiled output when icon switching moved to `.adl-icon-*` —
    // the stylesheet now compiles with source(none) so only real library
    // classes ship.)
    expect(css).toContain('.block')
    expect(css).toContain('.absolute')
  })

  it('preserves the compiled stylesheet as a package side effect', () => {
    expect(packageJson.sideEffects).toEqual(['./dist/styles.css'])
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
