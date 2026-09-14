import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
// @ts-expect-error Build/release orchestration is native ESM, not a public declaration.
import { verifyArtifact, verifyDocs } from '../scripts/release/verify.mjs'

describe('public release evidence', () => {
  const archive = Buffer.from('reviewed tarball')
  const metadata = {
    name: '@aesthc/diagram-lib',
    version: '0.3.0',
    dist: { integrity: 'sha512-' + createHash('sha512').update(archive).digest('base64') },
  }
  it('requires registry identity, registry integrity and reviewed archive equality', () => {
    expect(() => verifyArtifact(metadata, archive, archive, '0.3.0')).not.toThrow()
    expect(() => verifyArtifact(metadata, archive, archive, '0.4.0')).toThrow(/identity/)
    expect(() => verifyArtifact(metadata, Buffer.from('corrupt'), archive, '0.3.0')).toThrow(
      /integrity/,
    )
    expect(() => verifyArtifact(metadata, archive, Buffer.from('other'), '0.3.0')).toThrow(
      /reviewed/,
    )
  })
  it('does not accept a candidate, other version or untraceable docs build as release evidence', () => {
    const docs = { version: '0.3.0', channel: 'stable', sha: 'a'.repeat(40) }
    expect(() => verifyDocs(docs, '0.3.0')).not.toThrow()
    expect(() => verifyDocs({ ...docs, channel: 'candidate' }, '0.3.0')).toThrow(/stable/)
    expect(() => verifyDocs(docs, '0.4.0')).toThrow(/stable/)
    expect(() => verifyDocs({ ...docs, sha: 'local-build' }, '0.3.0')).toThrow(/revision/)
  })
})
