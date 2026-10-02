import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// The host overrides the viewer palette at `.adl-viewer` with explicit values.
// Consumers without that host must keep the package defaults, so this guard
// fails if someone deletes them from the distributed stylesheet.
describe('viewer package theme defaults', () => {
  it('keeps its own fallback palette for hosts without overrides', () => {
    const css = readFileSync('src/viewer/styles.css', 'utf8')
    expect(css).toContain('--adl-bg: #e9eef4')
    expect(css).toContain('--adl-card: #f9fbfd')
    expect(css).toContain('--adl-bg: #070707')
    expect(css).toContain('--adl-card: #101010')
  })
})
