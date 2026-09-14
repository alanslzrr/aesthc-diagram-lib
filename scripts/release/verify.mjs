import { createHash } from 'node:crypto'

export function verifyArtifact(metadata, archive, expected, version) {
  if (metadata.name !== '@aesthc/diagram-lib' || metadata.version !== version)
    throw Error('Registry identity does not match the reviewed release')
  const integrity = (bytes) => 'sha512-' + createHash('sha512').update(bytes).digest('base64')
  if (integrity(archive) !== metadata.dist?.integrity)
    throw Error('Downloaded registry archive does not match its integrity')
  if (integrity(archive) !== integrity(expected))
    throw Error('Public archive differs from the reviewed artifact')
}

export function verifyDocs(metadata, version) {
  if (metadata.version !== version || metadata.channel !== 'stable')
    throw Error('Matching stable documentation has not been deployed')
  if (!/^[a-f0-9]{40}$/.test(metadata.sha ?? ''))
    throw Error('Documentation has no verifiable deployment revision')
}
