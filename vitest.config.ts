import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    // The performance benchmark runs as its own isolated gate (pnpm test:perf)
    // so contention with parallel workers does not inflate its measurements.
    exclude: ['tests/editor-performance.unit.spec.ts'],
  },
})
