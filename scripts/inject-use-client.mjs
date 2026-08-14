// Next.js Client Components require the 'use client' directive in the module
// that enters the graph. tsup drops the directive from source, so we re-inject
// it into the public entries that render interactive SVG (canvas, showcase).
import { readFileSync, writeFileSync } from 'node:fs'

const targets = [
  new URL('../dist/canvas/index.js', import.meta.url),
  new URL('../dist/showcase/index.js', import.meta.url),
]

for (const file of targets) {
  let code = readFileSync(file, 'utf8')
  if (!code.startsWith("'use client'") && !code.startsWith('"use client"')) {
    writeFileSync(file, "'use client'\n" + code)
    console.log(`injected 'use client' → ${file.pathname.split('/').slice(-3).join('/')}`)
  }
}
