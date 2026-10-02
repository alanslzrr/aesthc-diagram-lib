import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

function profileFixture() {
  return JSON.stringify({
    format: 'aesthc-diagram',
    schemaVersion: 1,
    id: 'profile-viewer-fixture',
    revision: 0,
    locale: 'en',
    spec: {
      type: 'graph',
      caption: 'Profile fixture',
      legend: { main: 'Main', branch: 'Branch' },
      nodes: [
        { id: 'a', label: 'Alpha', description: '', kind: 'Service' },
        { id: 'b', label: 'Beta', description: '', kind: 'Database' },
        { id: 'd', label: 'Delta', description: '', kind: 'Service' },
      ],
      edges: [
        { id: 'ad', from: 'a', to: 'd', label: 'Write' },
        { id: 'bd', from: 'b', to: 'd', label: 'Replicate' },
      ],
    },
    scene: {
      mode: 'manual',
      nodes: {
        a: { x: 0, y: 100, width: 160, height: 64, locked: false },
        b: { x: 260, y: 100, width: 160, height: 64, locked: false },
        d: { x: 520, y: 100, width: 160, height: 64, locked: false },
      },
      routes: {},
      groups: [
        { id: 'eu', label: 'EU', kind: 'region', nodeIds: [], locked: false },
        {
          id: 'eu2',
          label: 'EU secondary',
          kind: 'region',
          nodeIds: [],
          parentGroup: 'eu',
          locked: false,
        },
        { id: 'us', label: 'US', kind: 'region', nodeIds: ['d'], locked: false },
        {
          id: 'nested',
          label: 'Nested team',
          kind: 'system',
          nodeIds: ['b'],
          parentGroup: 'eu2',
          locked: false,
        },
        {
          id: 'sg',
          label: 'Public security group',
          kind: 'security-group',
          nodeIds: ['a'],
          parentGroup: 'eu',
          visibility: 'public',
          locked: false,
        },
      ],
      zOrder: ['a', 'b', 'd'],
    },
    presentation: {
      theme: {
        mode: 'light',
        light: {
          background: '#ffffff',
          foreground: '#0a0a0a',
          card: '#fafafa',
          border: '#eaeaea',
          mutedForeground: '#666666',
          cobalt: '#0070f3',
          branch: '#a66b21',
        },
        dark: {
          background: '#000000',
          foreground: '#ededed',
          card: '#0a0a0a',
          border: '#1f1f1f',
          mutedForeground: '#a1a1a1',
          cobalt: '#3291ff',
          branch: '#d6a55e',
        },
      },
      grid: { visible: true, snap: true, size: 16 },
      padding: 32,
      legend: 'visible',
      edgeStyle: 'orthogonal',
      textScale: 1,
    },
    metadata: {
      engineeringProfile: 'deployment-ownership',
      nodes: {
        a: { roles: ['external'], tags: [] },
        b: { roles: ['database'], tags: [], owner: 'team-b', visibility: 'public' },
        d: { roles: ['storage'], tags: [], visibility: 'private' },
      },
      edges: {},
      visuals: {},
    },
    views: [],
    story: [],
    extensions: {},
  })
}

test('T51.2 an authored deployment profile blocks publish and its diagnostics navigate', async ({
  page,
}) => {
  await page.goto('/viewer.html')
  await page.setInputFiles('input[type="file"]', {
    name: 'profile.json',
    mimeType: 'application/json',
    buffer: Buffer.from(profileFixture()),
  })
  await expect(page.getByRole('heading', { name: 'Profile fixture' })).toBeVisible()
  const toggle = page.getByLabel('Show deployment profile')
  const evidence = page.locator('.adl-viewer-evidence')
  await expect(evidence).toContainText('3 nodes · 3 regions · 2 cross-region edges')
  const diagnostics = evidence.locator('.adl-viewer-profile-diagnostics button')
  await expect(diagnostics.filter({ hasText: 'profile.owner-missing' })).toHaveCount(1)
  await expect(diagnostics.filter({ hasText: 'profile.public-entity' })).toHaveCount(2)
  await expect(diagnostics.filter({ hasText: 'profile.region-conflict' })).toHaveCount(1)
  await expect(diagnostics.filter({ hasText: 'profile.crossing-missing' })).toHaveCount(2)
  // The diagnostic navigates to the exact edge subject.
  await diagnostics.filter({ hasText: 'profile.crossing-missing' }).first().click()
  await expect(page.locator('.adl-viewer-inspector')).toContainText('ad')
  // Publish stays blocked; the profile is never auto-disabled.
  const downloads: string[] = []
  page.on('download', (download) => downloads.push(download.suggestedFilename()))
  await page.getByRole('button', { name: 'Publish export' }).click()
  const alert = page.getByRole('alert').filter({ hasText: 'profile.' })
  await expect(alert).toContainText('profile.owner-missing')
  expect(downloads).toEqual([])
  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(
    accessibility.violations.filter(
      (issue) => issue.impact === 'serious' || issue.impact === 'critical',
    ),
  ).toEqual([])
  // The checkbox only controls the report panel; it cannot bypass the policy.
  await toggle.uncheck()
  await expect(evidence.locator('.adl-viewer-profile-diagnostics')).toHaveCount(0)
  await page.getByRole('button', { name: 'Publish export' }).click()
  await expect(alert).toContainText('profile.owner-missing')
  expect(downloads).toEqual([])
})
