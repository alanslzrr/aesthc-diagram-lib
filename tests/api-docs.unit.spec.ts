import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { generatedApi, publicExportInventory } from '../scripts/docs/exports'
const manifest = JSON.parse(readFileSync('package.json', 'utf8'))
describe('canonical public API documentation', () => {
  it('matches the full TypeScript export inventory', () => {
    expect(generatedApi(manifest)).toBe(readFileSync('docs/api/index.md', 'utf8'))
  })
  it('includes brand, architecture and compatibility symbols', () => {
    const inventory = publicExportInventory(manifest)
    expect(inventory.find((entry) => entry.subpath === './icons')?.names).toContain('BrandIcon')
    expect(inventory.find((entry) => entry.subpath === './examples')?.names).toEqual(
      expect.arrayContaining([
        'ARCHITECTURE_EXAMPLES',
        'CLOUD_ARCHITECTURE_SPEC',
        'CLOUD_ARCHITECTURE_VISUALS',
      ]),
    )
  })
  it('rejects a public entrypoint with no canonical purpose', () => {
    expect(() =>
      generatedApi({
        ...manifest,
        exports: { ...manifest.exports, './undocumented': './dist/styles.css' },
      }),
    ).toThrow('Missing canonical API purpose')
  })
  it('keeps candidate availability explicit across generated onboarding', () => {
    expect(['candidate', 'stable']).toContain(manifest.diagramRelease.channel)
    expect(typeof manifest.diagramRelease.npmAvailable).toBe('boolean')
    for (const file of ['README.md', 'docs/getting-started.md'])
      expect(readFileSync(file, 'utf8')).toContain(
        manifest.diagramRelease.npmAvailable
          ? `Version ${manifest.version} is available on npm.`
          : 'Release candidate—not yet available on npm',
      )
  })
})
