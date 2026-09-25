import { defineConfig } from 'vitest/config'

// Isolated performance gate: only the benchmark runs here, in a single worker,
// so measurements are not inflated by parallel test-file contention. Run with
// `pnpm test:perf`; `pnpm check` executes it after the main unit suite.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/editor-performance.unit.spec.ts'],
    fileParallelism: false,
    maxWorkers: 1,
  },
})
