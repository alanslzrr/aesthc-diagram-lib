import { test, expect } from '@playwright/test'

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
      edges: [{ id: 'ab', from: 'a', to: 'b', label: 'Write' }],
    },
    scene: {
      mode: 'manual',
      nodes: {
        a: { x: 0, y: 100, width: 160, height: 64, locked: false },
        b: { x: 260, y: 100, width: 160, height: 64, locked: false },
        d: { x: 520, y: 100, width: 160, height: 64, locked: false },
      },
      routes: {},
      groups: [],
      zOrder: ['a', 'b', 'd'],
    },
    presentation: {
      theme: {
        mode: 'light',
        light: {
          background: '#e9eef4',
          foreground: '#202b38',
          card: '#f9fbfd',
          border: '#aebdcd',
          mutedForeground: '#536273',
          cobalt: '#087cbd',
          branch: '#a66b21',
        },
        dark: {
          background: '#070707',
          foreground: '#f2f2ee',
          card: '#101010',
          border: '#242424',
          mutedForeground: '#a8a8a1',
          cobalt: '#14a8ff',
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
      nodes: {
        a: { roles: [], tags: ['region:eu'], owner: 'team-a' },
        b: { roles: [], tags: ['region:us'], visibility: 'public' },
        d: { roles: [], tags: ['region:eu', 'region:us'], owner: 'team-d' },
      },
      edges: {},
      visuals: {},
    },
    views: [],
    story: [],
    extensions: {},
  })
}

test('T51.2 an invalid deployment profile is not auto-disabled and its diagnostics navigate', async ({
  page,
}) => {
  await page.goto('/viewer.html')
  await page.setInputFiles('input[type="file"]', {
    name: 'profile.json',
    mimeType: 'application/json',
    buffer: Buffer.from(profileFixture()),
  })
  await expect(page.getByRole('heading', { name: 'Profile fixture' })).toBeVisible()
  const toggle = page.getByLabel('Deployment profile')
  await toggle.check()
  const evidence = page.locator('.adl-viewer-evidence')
  await expect(evidence).toContainText('3 nodes · 2 regions · 1 cross-region edges')
  const diagnostics = evidence.locator('.adl-viewer-profile-diagnostics button')
  await expect(diagnostics.filter({ hasText: 'profile.owner-missing' })).toHaveCount(1)
  await expect(diagnostics.filter({ hasText: 'profile.public-entity' })).toHaveCount(1)
  await expect(diagnostics.filter({ hasText: 'profile.region-conflict' })).toHaveCount(1)
  await expect(diagnostics.filter({ hasText: 'profile.crossing-missing' })).toHaveCount(1)
  // The diagnostic navigates to the exact edge subject.
  await diagnostics.filter({ hasText: 'profile.crossing-missing' }).click()
  await expect(page.locator('.adl-viewer-inspector')).toContainText('ab')
  // Publish stays blocked; the profile is never auto-disabled.
  const downloads: string[] = []
  page.on('download', (download) => downloads.push(download.suggestedFilename()))
  await page.getByRole('button', { name: 'Publish export' }).click()
  const alert = page.getByRole('alert').filter({ hasText: 'profile.' })
  await expect(alert).toContainText('profile.owner-missing')
  await expect(toggle).toBeChecked()
  expect(downloads).toEqual([])
  // Disabled (opt-out): the same document publishes without profile rules.
  await toggle.uncheck()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Publish export' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('diagram.svg')
})
