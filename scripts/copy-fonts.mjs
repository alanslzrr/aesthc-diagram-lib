import { cpSync, mkdirSync } from 'node:fs'
mkdirSync('dist/fonts', { recursive: true })
for (const font of ['geist-sans.woff2', 'geist-mono.woff2'])
  cpSync(`src/assets/fonts/${font}`, `dist/fonts/${font}`)
