import { describe, expect, it, vi } from 'vitest'
import {
  createDocument,
  declaredEvidence,
  validateDeploymentProfile,
  verifyEvidence,
} from '../src/editor-core'
import type { DiagramDocument, TrustedVerifier } from '../src/editor-core'
import { validateDocument } from '../src/editor-core'

function evidenceDocument(evidence: Record<string, unknown>): DiagramDocument {
  const made = createDocument(
    {
      type: 'graph',
      caption: 'Evidence seed',
      legend: { main: 'Main', branch: 'Branch' },
      nodes: [{ id: 'a', label: 'A', description: '' }],
      edges: [],
    },
    { id: 'evidence-seed', locale: 'en' },
  )
  if (!made.ok) throw Error(JSON.stringify(made.diagnostics))
  made.value.metadata.nodes = {
    a: {
      roles: [],
      tags: [],
      evidence: [evidence as never],
    },
  }
  return made.value
}
const validEvidence = {
  id: 'ev-1',
  repository: 'https://github.com/example/repo',
  commit: '0123456789abcdef0123456789abcdef01234567',
  path: 'src/service.ts',
  startLine: 10,
  endLine: 20,
}
function profileDocument(): DiagramDocument {
  const made = createDocument(
    {
      type: 'graph',
      caption: 'Profile seed',
      legend: { main: 'Main', branch: 'Branch' },
      nodes: [
        { id: 'a', label: 'A', description: '' },
        { id: 'b', label: 'B', description: '' },
        { id: 'c', label: 'C', description: '' },
        { id: 'd', label: 'D', description: '' },
      ],
      edges: [
        { id: 'ab', from: 'a', to: 'b' },
        { id: 'bc', from: 'b', to: 'c' },
        { id: 'cd', from: 'c', to: 'd' },
      ],
    },
    { id: 'profile-seed', locale: 'en' },
  )
  if (!made.ok) throw Error(JSON.stringify(made.diagnostics))
  const document = made.value
  document.metadata.nodes = {
    a: { roles: [], tags: ['region:eu'], owner: 'team-a' },
    b: { roles: [], tags: ['region:us'], visibility: 'public' },
    c: { roles: [], tags: ['region:us'], owner: 'team-c' },
    d: { roles: [], tags: ['region:eu', 'region:us'], owner: 'team-d' },
  }
  document.metadata.edges = {
    bc: { roles: [], tags: [] },
    cd: { roles: [], tags: [], crossing: 'vpn' },
  }
  return document
}

describe('E23 declared evidence versus verification', () => {
  it('T50.1 rejects self-declared verification, traversal, bad commits and ranges without network access', async () => {
    // A payload cannot declare itself verified: strict validation rejects it.
    const forged = evidenceDocument({ ...validEvidence, verified: true })
    const forgedCheck = validateDocument(forged)
    expect(forgedCheck.ok).toBe(false)
    const missing = evidenceDocument({ ...validEvidence, path: '../../etc/passwd' })
    const traversal = declaredEvidence(missing)
    expect(traversal.ok).toBe(false)
    expect(traversal.diagnostics.some((d) => d.code === 'evidence.path')).toBe(true)
    const badCommit = declaredEvidence(evidenceDocument({ ...validEvidence, commit: 'not-a-sha' }))
    expect(badCommit.ok).toBe(false)
    expect(badCommit.diagnostics.some((d) => d.code === 'evidence.commit')).toBe(true)
    const badRange = declaredEvidence(
      evidenceDocument({ ...validEvidence, startLine: 30, endLine: 20 }),
    )
    expect(badRange.ok).toBe(false)
    expect(badRange.diagnostics.some((d) => d.code === 'evidence.range')).toBe(true)
    const http = declaredEvidence(
      evidenceDocument({ ...validEvidence, repository: 'http://github.com/example/repo' }),
    )
    expect(http.ok).toBe(false)
    expect(http.diagnostics.some((d) => d.code === 'url.scheme')).toBe(true)
    // The module itself never fetches; only the injected verifier may.
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const verifier: TrustedVerifier = { verify: async () => 'match' }
    const receipts = await verifyEvidence(evidenceDocument(validEvidence), verifier)
    if (!receipts.ok) throw Error(JSON.stringify(receipts.diagnostics))
    expect(receipts.value[0].status).toBe('verified')
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('T50.2 verification requires a complete match: mismatch, errors and unavailable never verify', async () => {
    const document = evidenceDocument(validEvidence)
    const cases: Array<[TrustedVerifier, string]> = [
      [{ verify: async () => 'match' }, 'verified'],
      [{ verify: async () => 'mismatch' }, 'mismatch'],
      [{ verify: async () => 'unavailable' }, 'unavailable'],
      [
        {
          verify: async () => {
            throw new Error('boom')
          },
        },
        'unavailable',
      ],
    ]
    for (const [verifier, expected] of cases) {
      const receipts = await verifyEvidence(document, verifier)
      if (!receipts.ok) throw Error(JSON.stringify(receipts.diagnostics))
      expect(receipts.value[0].status).toBe(expected)
    }
    const declaredOnly = await verifyEvidence(document, {
      verify: async () => 'unavailable',
    })
    if (!declaredOnly.ok) throw Error('declared')
    // Never verified from the document itself.
    expect(declaredOnly.value.some((receipt) => receipt.status === 'verified')).toBe(false)
  })
})

describe('E23 deployment profile is opt-in and fails by exact facts', () => {
  it('T51.1 enabled reports owner, region, public and crossing facts precisely', () => {
    const document = profileDocument()
    const report = validateDeploymentProfile(document, { enabled: true })
    if (!report.ok) throw Error(JSON.stringify(report.diagnostics))
    expect(report.value.enabled).toBe(true)
    expect(report.value.facts).toEqual({ nodes: 4, regions: 2, crossRegionEdges: 2 })
    const codes = report.value.diagnostics.map((diagnostic) => diagnostic.code)
    expect(codes.filter((code) => code === 'profile.owner-missing')).toHaveLength(1)
    expect(codes).toContain('profile.region-conflict')
    expect(codes).toContain('profile.public-entity')
    // bc crosses regions and declares the crossing: only ab is missing it.
    const crossings = report.value.diagnostics.filter(
      (diagnostic) => diagnostic.code === 'profile.crossing-missing',
    )
    expect(crossings).toHaveLength(1)
    expect(crossings[0].subject).toEqual({ kind: 'edge', id: 'ab' })
    const owners = report.value.diagnostics.filter(
      (diagnostic) => diagnostic.code === 'profile.owner-missing',
    )
    expect(owners.map((diagnostic) => diagnostic.subject?.id)).toEqual(['b'])
  })

  it('T51.1 disabled imposes no rule and discovers no infrastructure', () => {
    const report = validateDeploymentProfile(profileDocument())
    if (!report.ok) throw Error(JSON.stringify(report.diagnostics))
    expect(report.value.enabled).toBe(false)
    expect(report.value.diagnostics).toEqual([])
    expect(report.value.facts).toEqual({ nodes: 0, regions: 0, crossRegionEdges: 0 })
  })
})
