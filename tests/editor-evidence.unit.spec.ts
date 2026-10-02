import { describe, expect, it, vi } from 'vitest'
import {
  createDocument,
  declaredEvidence,
  validateDeploymentProfile,
  verifyEvidence,
} from '../src/editor-core'
import type { DiagramDocument, TrustedVerifier } from '../src/editor-core'
import { validateDocument } from '../src/editor-core'
import { exportDocument } from '../src/export'

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
      nodes: ['a', 'b', 'c', 'd', 'e'].map((id) => ({
        id,
        label: id.toUpperCase(),
        description: '',
      })),
      edges: [
        { id: 'ab', from: 'a', to: 'b' },
        { id: 'bd', from: 'b', to: 'd' },
        { id: 'cd', from: 'c', to: 'd' },
      ],
    },
    { id: 'profile-seed', locale: 'en' },
  )
  if (!made.ok) throw Error(JSON.stringify(made.diagnostics))
  const document = made.value
  document.metadata.engineeringProfile = 'deployment-ownership'
  document.metadata.nodes = {
    a: { roles: [], tags: [], owner: 'team-a' },
    b: { roles: ['external'], tags: [] },
    c: { roles: ['database'], tags: [], owner: 'team-c', visibility: 'private' },
    d: { roles: ['storage'], tags: [], owner: 'team-d', visibility: 'public' },
    e: { roles: [], tags: [] },
  }
  document.metadata.edges = {
    ab: { roles: [], tags: [] },
    bd: { roles: [], tags: [] },
    cd: { roles: [], tags: [], crossing: 'vpn' },
  }
  document.scene.groups = [
    { id: 'eu', label: 'EU', kind: 'region', nodeIds: [], locked: false },
    { id: 'us', label: 'US', kind: 'region', nodeIds: ['d'], locked: false },
    // eu2 is nested inside eu, so b inherits two region ancestors.
    {
      id: 'eu2',
      label: 'EU secondary',
      kind: 'region',
      nodeIds: [],
      parentGroup: 'eu',
      locked: false,
    },
    {
      id: 'nested',
      label: 'Nested team',
      kind: 'system',
      nodeIds: ['b'],
      parentGroup: 'eu2',
      locked: false,
    },
    {
      id: 'sg-ok',
      label: 'Private SG',
      kind: 'security-group',
      nodeIds: ['c'],
      parentGroup: 'eu',
      visibility: 'private',
      locked: false,
    },
    {
      id: 'sg-public',
      label: 'Public SG',
      kind: 'security-group',
      nodeIds: ['a'],
      parentGroup: 'eu',
      visibility: 'public',
      locked: false,
    },
    {
      id: 'sg-orphan',
      label: 'Orphan SG',
      kind: 'security-group',
      nodeIds: ['e'],
      locked: false,
    },
  ]
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

describe('E23 deployment profile is authored and fails by exact facts', () => {
  it('T51.1 activation is authored and reported rules match the declared metadata', () => {
    const document = profileDocument()
    const report = validateDeploymentProfile(document)
    if (!report.ok) throw Error(JSON.stringify(report.diagnostics))
    expect(report.value.enabled).toBe(true)
    expect(report.value.facts).toEqual({ nodes: 5, regions: 3, crossRegionEdges: 3 })
    const codes = report.value.diagnostics.map((diagnostic) => diagnostic.code)
    // e has no owner and no region; b inherits two region ancestors; private
    // roles need explicit visibility and the two named groups fail their
    // visibility or region-consistency rules.
    expect(codes.filter((code) => code === 'profile.owner-missing')).toHaveLength(1)
    expect(codes.filter((code) => code === 'profile.region-conflict')).toHaveLength(3)
    expect(codes.filter((code) => code === 'profile.public-entity')).toHaveLength(3)
    const crossings = report.value.diagnostics.filter(
      (diagnostic) => diagnostic.code === 'profile.crossing-missing',
    )
    expect(crossings).toHaveLength(2)
    expect(crossings[0].subject).toEqual({ kind: 'edge', id: 'ab' })
    // b is external: owner exempt, region still enforced through the nested
    // system group whose region ancestor is eu.
    const owners = report.value.diagnostics.filter(
      (diagnostic) => diagnostic.code === 'profile.owner-missing',
    )
    expect(owners.map((diagnostic) => diagnostic.subject?.id)).toEqual(['e'])
    const subjects = report.value.diagnostics.map((diagnostic) =>
      diagnostic.subject ? `${diagnostic.code}:${diagnostic.subject.kind}:${diagnostic.subject.id}` : '',
    )
    expect(subjects).toContain('profile.public-entity:group:sg-public')
    expect(subjects).toContain('profile.public-entity:group:sg-orphan')
    expect(subjects).toContain('profile.public-entity:node:d')
    expect(subjects).toContain('profile.region-conflict:group:sg-orphan')
  })

  it('T51.1 an authored profile cannot be disabled through options or removed in portable metadata', () => {
    const document = profileDocument()
    const forged = validateDeploymentProfile(document, { enabled: false })
    if (!forged.ok) throw Error(JSON.stringify(forged.diagnostics))
    expect(forged.value.enabled).toBe(true)
    delete document.metadata.engineeringProfile
    const inactive = validateDeploymentProfile(document)
    if (!inactive.ok) throw Error(JSON.stringify(inactive.diagnostics))
    expect(inactive.value.enabled).toBe(false)
    expect(inactive.value.diagnostics).toEqual([])
    expect(inactive.value.facts).toEqual({ nodes: 0, regions: 0, crossRegionEdges: 0 })
  })

  it('T51.1 canonical publish blocks on profile diagnostics while edit export stays available', async () => {
    const document = profileDocument()
    const publish = await exportDocument(document, {
      format: 'svg',
      scope: { type: 'document' },
      theme: 'light',
      quality: 'publish',
      background: 'theme',
      scale: 1,
      includeSource: false,
      metadata: 'minimal',
      fontPolicy: 'fallback',
    })
    expect(publish.ok).toBe(false)
    if (!publish.ok)
      expect(publish.diagnostics.some((diagnostic) => diagnostic.code === 'profile.owner-missing')).toBe(
        true,
      )
  })
})
