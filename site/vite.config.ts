import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// The site consumes the library straight from `../src` so layout and canvas
// edits hot-reload without a package build step.
// Resolve the workspace package through its published export map, never src aliases.
const galleryDir = fileURLToPath(new URL('../docs/diagrams', import.meta.url))

/**
 * Dev-only endpoint: POST /__gallery/<key>.svg saves the README gallery
 * exports produced in the browser (they need computed styles) into
 * docs/diagrams/. Never part of the production build.
 */
function galleryWriter(): Plugin {
  return {
    name: 'gallery-writer',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__gallery', (req, res) => {
        const name = (req.url ?? '').replace(/^\//, '')
        if (req.method !== 'POST' || !/^[a-z0-9-]+\.(svg|png)$/.test(name)) {
          res.statusCode = 400
          res.end('expected POST /__gallery/<kebab-name>.(svg|png)')
          return
        }
        let body = ''
        let rejected = false
        req.setEncoding('utf8')
        req.on('data', (chunk: string) => {
          if (rejected) return
          if (Buffer.byteLength(body) + Buffer.byteLength(chunk) > 2 * 1024 * 1024) {
            rejected = true
            res.statusCode = 413
            res.end('Gallery payload exceeds 2 MiB')
            return
          }
          body += chunk
        })
        req.on('end', () => {
          if (rejected) return
          mkdirSync(galleryDir, { recursive: true })
          if (name.endsWith('.png')) {
            // PNGs arrive as a base64 data URL from canvas.toDataURL().
            const base64 = body.replace(/^data:image\/png;base64,/, '')
            writeFileSync(`${galleryDir}/${name}`, Buffer.from(base64, 'base64'))
          } else {
            writeFileSync(`${galleryDir}/${name}`, body)
          }
          res.end(`saved ${name} (${body.length} bytes)`)
        })
      })
    },
  }
}

export default defineConfig({
  // GitHub Pages serves the site under /<repo>/ — CI sets SITE_BASE.
  base: process.env.SITE_BASE ?? '/',
  plugins: [react(), tailwindcss(), galleryWriter()],
  build: {
    manifest: true,
    rollupOptions: {
      input: {
        playground: fileURLToPath(new URL('./index.html', import.meta.url)),
        docs: fileURLToPath(new URL('./docs.html', import.meta.url)),
      },
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
})
