import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
const root = fileURLToPath(new URL('../', import.meta.url))
const temporary = mkdtempSync(join(tmpdir(), 'adl-frameworks-'))
const require = createRequire(import.meta.url)
const version = (name) => require(`${name}/package.json`).version
const servers = []
let browser
const run = (command, args, cwd = temporary, capture = false) =>
  execFileSync(command, args, {
    cwd,
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf8',
    timeout: 240000,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', NODE_PATH: '' },
  })
try {
  const [packed] = JSON.parse(
    run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', temporary], root, true),
  )
  writeFileSync(
    join(temporary, 'package.json'),
    JSON.stringify({
      private: true,
      type: 'module',
      dependencies: {
        '@aesthc/diagram-lib': `file:${join(temporary, packed.filename)}`,
        react: version('react'),
        'react-dom': version('react-dom'),
        next: '15.5.25',
        vite: '7.3.6',
        typescript: version('typescript'),
        '@types/react': version('@types/react'),
        '@types/react-dom': version('@types/react-dom'),
      },
    }),
  )
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false'])
  const component = "'use client'\n" + readFileSync(join(root, 'examples/flowchart.tsx'), 'utf8')
  writeFileSync(join(temporary, 'Diagram.tsx'), component)
  const theme = readFileSync(join(root, 'docs/guides/theming.md'), 'utf8').match(
    /```css\n([\s\S]*?)```/,
  )[1]
  writeFileSync(
    join(temporary, 'theme.css'),
    theme + '\nbody{margin:24px;font-family:system-ui}svg{max-width:100%;height:auto}',
  )
  writeFileSync(
    join(temporary, 'index.html'),
    '<!doctype html><html lang="en"><head><title>Vite package consumer</title></head><body><div id="root"></div><script type="module" src="/vite-main.tsx"></script></body></html>',
  )
  writeFileSync(
    join(temporary, 'vite-main.tsx'),
    "import React from 'react'; import { createRoot } from 'react-dom/client'; import { Diagram } from './Diagram'; import './theme.css'; createRoot(document.getElementById('root')!).render(<Diagram />)",
  )
  writeFileSync(
    join(temporary, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        jsx: 'react-jsx',
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        skipLibCheck: true,
      },
      include: ['*.tsx', 'app/**/*.tsx'],
    }),
  )
  mkdirSync(join(temporary, 'app'))
  writeFileSync(
    join(temporary, 'app/layout.tsx'),
    "import type { ReactNode } from 'react'; import '../theme.css'; export default function Layout({children}:{children:ReactNode}) {return <html lang='en'><body>{children}</body></html>}",
  )
  writeFileSync(
    join(temporary, 'app/page.tsx'),
    "import { Diagram } from '../Diagram'; import { EXAMPLE_DIAGRAMS } from '@aesthc/diagram-lib/examples'; import { layoutDiagram } from '@aesthc/diagram-lib/layouts'; export default function Page(){ const geometry=layoutDiagram(EXAMPLE_DIAGRAMS['example-band'].diagram.en); return <main><h1>Next package consumer</h1><p>Server layout width: {geometry.width}</p><Diagram /></main> }",
  )
  writeFileSync(join(temporary, 'next.config.mjs'), 'export default { experimental: { cpus: 2 } }')
  const vite = join(temporary, 'node_modules/vite/bin/vite.js')
  const next = join(temporary, 'node_modules/next/dist/bin/next')
  run(process.execPath, [vite, 'build', '--outDir', 'vite-dist'])
  run(process.execPath, [next, 'build'])
  browser = await chromium.launch(
    process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {},
  )
  for (const [name, command, args, port] of [
    ['vite', vite, ['preview', '--outDir', 'vite-dist', '--host', '127.0.0.1'], 4175],
    ['next', next, ['start', '--hostname', '127.0.0.1'], 4176],
  ]) {
    const server = spawn(process.execPath, [command, ...args, '--port', String(port)], {
      cwd: temporary,
      stdio: 'inherit',
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
    })
    servers.push(server)
    let ready = false
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        if ((await fetch(`http://127.0.0.1:${port}`)).ok) {
          ready = true
          break
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    if (!ready) throw new Error(`${name} did not start`)
    const page = await browser.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(`http://127.0.0.1:${port}`)
    const node = page.locator('[data-node-id][role="button"]').first()
    await node.focus()
    await page.keyboard.press('Enter')
    if ((await node.getAttribute('aria-pressed')) !== 'true')
      throw new Error(`${name}: controlled selection failed`)
    const styled = await page
      .locator('svg text')
      .first()
      .evaluate((text) => getComputedStyle(text).fill)
    if (!styled || styled === 'rgb(0, 0, 0)')
      throw new Error(`${name}: distributed CSS did not style text`)
    if (errors.length) throw new Error(`${name}: ${errors.join('\n')}`)
    mkdirSync(join(root, 'test-results/frameworks'), { recursive: true })
    await page.screenshot({ path: join(root, `test-results/frameworks/${name}.png`) })
    await page.close()
    console.log(`${name}: build, hydration, styles and keyboard selection passed`)
  }
} finally {
  await browser?.close()
  for (const server of servers) server.kill()
  await Promise.all(
    servers.map((server) =>
      server.exitCode !== null
        ? Promise.resolve()
        : new Promise((resolve) => server.once('exit', resolve)),
    ),
  )
  rmSync(temporary, { recursive: true, force: true })
}
