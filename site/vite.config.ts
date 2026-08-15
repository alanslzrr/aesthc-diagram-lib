import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The site consumes the library straight from `../src` so layout and canvas
// edits hot-reload without a package build step.
const libSrc = fileURLToPath(new URL('../src', import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      { find: /^@aesthc\/diagram-lib$/, replacement: libSrc },
      { find: /^@aesthc\/diagram-lib\/(.+)$/, replacement: `${libSrc}/$1` },
    ],
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
