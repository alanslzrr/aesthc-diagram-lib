import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { publicExportInventory } from '../scripts/docs/exports'

const manifest = JSON.parse(readFileSync('package.json', 'utf8'))
const guide = readFileSync('docs/guides/share-export.md', 'utf8')
const blocks = [...guide.matchAll(/```ts ([a-z0-9-]+)\n([\s\S]*?)```/g)].map((match) => ({
  id: match[1],
  source: match[2],
}))

describe('sharing and exporting documentation', () => {
  it('separates public APIs, editable hosts and the legacy showcase', () => {
    expect(guide).toContain('## Public package APIs')
    expect(guide).toContain('## Editable hosts')
    expect(guide).toContain('## Legacy showcase')
    expect(guide).toContain('Share link')
    expect(guide).toContain('Playground')
    expect(guide).toContain('Studio')
    expect(guide).not.toContain('not package-level export APIs')
    expect(guide).not.toContain('256 KiB of JSON text')
    expect(guide).not.toContain('These are playground features')
  })

  it('marks every runnable example with a unique id', () => {
    const fences = guide.match(/```ts[ \n]/g) ?? []
    expect(blocks.length).toBe(fences.length)
    expect(blocks.length).toBeGreaterThanOrEqual(14)
    expect(new Set(blocks.map(({ id }) => id)).size).toBe(blocks.length)
    for (const { source } of blocks) expect(source).toMatch(/from '@aesthc\/diagram-lib\//)
  })

  it('documents the announced export and persistence surface', () => {
    for (const name of [
      'exportDocument',
      'exportDocumentHtml',
      'exportCard',
      'exportStoryWebm',
      'createMemoryStorage',
      'createLocalStorageAdapter',
      'createAutosave',
      'encodeShareDocument',
      'decodeShareDocument',
      'SHARE_LIMITS',
    ])
      expect(guide).toContain(name)
    expect(blocks.some(({ source }) => source.includes("format: 'jpeg'"))).toBe(true)
    expect(blocks.some(({ source }) => source.includes("format: 'webp'"))).toBe(true)
    expect(blocks.some(({ source }) => source.includes('AbortController'))).toBe(true)
  })

  it('imports only symbols that exist in the public export inventory', { timeout: 30_000 }, () => {
    const inventory = new Map(
      publicExportInventory(manifest).map(({ subpath, names }) => [
        subpath === '.' ? manifest.name : `${manifest.name}/${subpath.slice(2)}`,
        new Set(names),
      ]),
    )
    for (const { id, source } of blocks)
      for (const match of source.matchAll(/import\s+\{([^}]+)\}\s+from\s+'([^']+)'/g)) {
        const specifier = match[2]
        if (!specifier.startsWith(manifest.name)) continue
        const names = match[1]
          .split(',')
          .map((entry) =>
            entry
              .trim()
              .split(/\s+as\s+/)[0]
              .trim(),
          )
          .filter(Boolean)
        const exported = inventory.get(specifier)
        expect(exported, `${id} imports an unknown subpath ${specifier}`).toBeDefined()
        for (const name of names)
          expect(exported?.has(name), `${id} imports non-public ${name} from ${specifier}`).toBe(
            true,
          )
      }
  })
})
