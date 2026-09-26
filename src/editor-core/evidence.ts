import type { Diagnostic, DiagramDocument, Result } from './types'
import { failure, issue, success } from './data'
import { validateDocument } from './validation'

export interface DeclaredEvidence {
  id: string
  repository: string
  commit: string
  path: string
  startLine: number
  endLine: number
  blobSha?: string
}
export type EvidenceStatus = 'declared' | 'verified' | 'mismatch' | 'unavailable'
export interface EvidenceReceipt {
  id: string
  status: EvidenceStatus
  declared: DeclaredEvidence
  detail?: string
}
/** Trusted, host-provided verifier. It is the only component allowed to reach
 * the network or the filesystem; the document can never enable it. */
export interface TrustedVerifier {
  verify(reference: {
    repository: string
    commit: string
    path: string
    blobSha?: string
  }): Promise<'match' | 'mismatch' | 'unavailable'>
}
const commitPattern = /^[0-9a-f]{7,64}$/i
function referenceOf(entry: unknown): Result<DeclaredEvidence> {
  if (!entry || typeof entry !== 'object') return failure('evidence.invalid')
  const candidate = entry as Partial<DeclaredEvidence>
  if (typeof candidate.id !== 'string' || !candidate.id) return failure('evidence.invalid')
  if (typeof candidate.repository !== 'string') return failure('evidence.invalid')
  try {
    const url = new URL(candidate.repository)
    if (url.protocol !== 'https:' || url.username || url.password) throw Error()
  } catch {
    return failure('url.scheme')
  }
  if (
    typeof candidate.path !== 'string' ||
    !candidate.path ||
    candidate.path.startsWith('/') ||
    candidate.path.includes('\\') ||
    candidate.path.split('/').some((segment) => segment === '..' || segment === '.')
  )
    return failure('evidence.path')
  if (typeof candidate.commit !== 'string' || !commitPattern.test(candidate.commit))
    return failure('evidence.commit')
  if (
    !Number.isSafeInteger(candidate.startLine) ||
    !Number.isSafeInteger(candidate.endLine) ||
    (candidate.startLine ?? 0) < 1 ||
    (candidate.endLine ?? 0) < (candidate.startLine ?? 0)
  )
    return failure('evidence.range')
  if (candidate.blobSha !== undefined && !/^[0-9a-f]{40,64}$/i.test(candidate.blobSha))
    return failure('evidence.commit')
  return success({
    id: candidate.id,
    repository: candidate.repository,
    commit: candidate.commit,
    path: candidate.path,
    startLine: candidate.startLine!,
    endLine: candidate.endLine!,
    ...(candidate.blobSha ? { blobSha: candidate.blobSha } : {}),
  })
}
/** Declared evidence from a validated document. Every entry starts as
 * `declared`: an imported JSON can never declare itself verified. */
export function declaredEvidence(document: DiagramDocument): Result<DeclaredEvidence[]> {
  const checked = validateDocument(document)
  if (!checked.ok) return checked
  const entries: DeclaredEvidence[] = []
  for (const metadata of Object.values(checked.value.metadata.nodes))
    for (const evidence of metadata.evidence ?? []) {
      const parsed = referenceOf(evidence)
      if (!parsed.ok) return parsed
      entries.push(parsed.value)
    }
  for (const metadata of Object.values(checked.value.metadata.edges))
    for (const evidence of metadata.evidence ?? []) {
      const parsed = referenceOf(evidence)
      if (!parsed.ok) return parsed
      entries.push(parsed.value)
    }
  return success(entries)
}
/** Verifies declared evidence through the trusted verifier. `verified` is
 * granted only on a complete match; a mismatch, an exception or an
 * unavailable verifier never becomes a false positive. */
export async function verifyEvidence(
  document: DiagramDocument,
  verifier: TrustedVerifier,
): Promise<Result<EvidenceReceipt[]>> {
  const declared = declaredEvidence(document)
  if (!declared.ok) return declared
  const receipts: EvidenceReceipt[] = []
  for (const entry of declared.value) {
    let status: EvidenceStatus = 'unavailable'
    let detail: string | undefined
    try {
      const outcome = await verifier.verify({
        repository: entry.repository,
        commit: entry.commit,
        path: entry.path,
        ...(entry.blobSha ? { blobSha: entry.blobSha } : {}),
      })
      status =
        outcome === 'match' ? 'verified' : outcome === 'mismatch' ? 'mismatch' : 'unavailable'
      if (outcome !== 'match') detail = `verifier:${outcome}`
    } catch {
      status = 'unavailable'
      detail = 'verifier:error'
    }
    receipts.push({ id: entry.id, status, declared: entry, ...(detail ? { detail } : {}) })
  }
  return success(receipts)
}
/** Diagnostics for declared evidence without running a verifier. */
export function evidenceDiagnostics(document: DiagramDocument): Result<Diagnostic[]> {
  const declared = declaredEvidence(document)
  if (!declared.ok) return declared
  return success([])
}
export const evidenceIssue = issue
