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
/** Granularity actually established by a verifier. `file` is a legacy,
 * file-identity-only result; `range` covers the declared coordinates. */
export type EvidenceVerificationScope = 'file' | 'range'
export interface EvidenceReceipt {
  id: string
  status: EvidenceStatus
  declared: DeclaredEvidence
  scope?: EvidenceVerificationScope
  detail?: string
}
/**
 * Range-aware verifier contract marker. A verifier declaring this contract
 * commits to checking every supplied coordinate (repository, commit, path, the
 * declared line `range`, and `blobSha` when declared) and to returning
 * `'match'` only for a complete match. This is the only input shape that can
 * produce a `verified` receipt.
 */
export const EVIDENCE_RANGE_CONTRACT = 'evidence.range.v1' as const
export interface EvidenceVerifierReference {
  repository: string
  commit: string
  path: string
  /** Declared source range. Always supplied; a range-aware verifier must
   * compare it against the resolved file content. */
  range: { startLine: number; endLine: number }
  blobSha?: string
}
/**
 * Trusted, host-provided verifier. It is the only component allowed to reach
 * the network or the filesystem; the document can never enable it.
 *
 * Legacy verifier migration: verifiers written against the original callback
 * received `{ repository, commit, path, blobSha? }` and had no way to observe
 * `startLine`/`endLine`. `verifyEvidence` keeps calling them and still passes
 * the declared `range`, but any legacy `'match'` is reported truthfully as
 * `declared` with `scope: 'file'` and detail `verifier:file-only` — never as
 * `verified`. To become eligible for `verified`, a verifier must validate the
 * full reference and declare `contract: EVIDENCE_RANGE_CONTRACT`.
 */
export interface TrustedVerifier {
  contract?: typeof EVIDENCE_RANGE_CONTRACT
  verify(reference: EvidenceVerifierReference): Promise<'match' | 'mismatch' | 'unavailable'>
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
 * `declared`: an imported JSON can never declare itself verified, and a
 * receipt object travelling inside a document is not an input here. */
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
 * granted only to a complete match under `EVIDENCE_RANGE_CONTRACT`; a mismatch,
 * an exception, an unavailable verifier or a legacy file-only match never
 * becomes a false positive. */
export async function verifyEvidence(
  document: DiagramDocument,
  verifier: TrustedVerifier,
): Promise<Result<EvidenceReceipt[]>> {
  const declared = declaredEvidence(document)
  if (!declared.ok) return declared
  const rangeAware = verifier.contract === EVIDENCE_RANGE_CONTRACT
  const receipts: EvidenceReceipt[] = []
  for (const entry of declared.value) {
    let status: EvidenceStatus = 'unavailable'
    let scope: EvidenceVerificationScope | undefined
    let detail: string | undefined
    try {
      const outcome = await verifier.verify({
        repository: entry.repository,
        commit: entry.commit,
        path: entry.path,
        range: { startLine: entry.startLine, endLine: entry.endLine },
        ...(entry.blobSha ? { blobSha: entry.blobSha } : {}),
      })
      if (outcome === 'match') {
        if (rangeAware) {
          status = 'verified'
          scope = 'range'
        } else {
          // Legacy migration: the old callback could only match file identity,
          // so `verified` would overstate what was actually checked.
          status = 'declared'
          scope = 'file'
          detail = 'verifier:file-only'
        }
      } else {
        status = outcome === 'mismatch' ? 'mismatch' : 'unavailable'
        detail = `verifier:${outcome}`
      }
    } catch {
      status = 'unavailable'
      detail = 'verifier:error'
    }
    receipts.push({
      id: entry.id,
      status,
      declared: entry,
      ...(scope ? { scope } : {}),
      ...(detail ? { detail } : {}),
    })
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
