import { defineConfig, devices } from '@playwright/test'
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173)
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('Invalid PLAYWRIGHT_PORT')
const baseURL = `http://127.0.0.1:${port}`
export default defineConfig({
  updateSnapshots: process.env.CI ? 'none' : 'missing',
  testDir: './tests/e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 45_000,
  snapshotPathTemplate: `{testDir}/visual/${process.platform}/{projectName}/{arg}{ext}`,
  expect: { timeout: 8000 },
  fullyParallel: false,
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    reducedMotion: 'reduce',
  },
  webServer: {
    command: `pnpm --dir site exec vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
  },
  projects: [
    {
      name: 'mobile-chromium',
      testIgnore: '**/editor-performance.e2e.ts',
      use: {
        ...devices['Pixel 7'],
        ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
      },
    },
    {
      name: 'chromium',
      testIgnore: '**/editor-performance.e2e.ts',
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
      },
    },
    {
      name: 'firefox',
      testIgnore: '**/editor-performance.e2e.ts',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testIgnore: '**/editor-performance.e2e.ts',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile',
      testIgnore: '**/editor-performance.e2e.ts',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'webkit' },
    },
    {
      name: 'performance',
      testMatch: '**/editor-performance.e2e.ts',
      // Run the unchanged frame budget only after functional workers release the CPU.
      dependencies: ['mobile-chromium', 'chromium', 'firefox', 'webkit', 'mobile'],
      workers: 1,
      use: {
        ...devices['Desktop Chrome'],
        // Continuous trace screenshots distort animation timing; failure screenshots remain enabled.
        trace: 'off',
        ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
      },
    },
  ],
})
