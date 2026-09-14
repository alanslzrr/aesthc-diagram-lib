import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { sealSnapshot, verifySnapshot } from '../scripts/docs/snapshots.mjs'

describe('immutable snapshot inventory', () => {
  it('detects changed, missing and added resources', () => {
    const directory = mkdtempSync(join(tmpdir(), 'adl-snapshot-unit-'))
    try {
      writeFileSync(join(directory, 'index.html'), '<h1>A</h1>')
      sealSnapshot(directory, { version: '0.3.0' })
      expect(verifySnapshot(directory).version).toBe('0.3.0')
      writeFileSync(join(directory, 'index.html'), '<h1>B</h1>')
      expect(() => verifySnapshot(directory)).toThrow('checksum mismatch')
      writeFileSync(join(directory, 'index.html'), '<h1>A</h1>')
      writeFileSync(join(directory, 'new.css'), '')
      expect(() => verifySnapshot(directory)).toThrow('inventory changed')
      rmSync(join(directory, 'new.css'))
      rmSync(join(directory, 'index.html'))
      expect(() => verifySnapshot(directory)).toThrow()
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
