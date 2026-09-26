// E19 browser gates measured against the npm tarball in an isolated Vite
// consumer. The site cannot host the editor harness without exceeding its
// per-entry transfer budgets, so the harness lives here, outside the package.
//
//   - Memory gate (6.6): 50 mount/edit/export/dispose cycles; listeners, blob
//     URLs and heap must not accumulate; heap post-GC growth <= 10 MiB on the
//     reference runner.
//   - Raster gate (6.6): PNG export at a fixed 2048x2048 canvas, decoupled from
//     node count; p95 <= 3000 ms on the reference runner. 3 warmups + 12 samples.
//
// Reference runner: CI with the pinned Chromium (or PERF_REFERENCE=1). Local
// runs with PLAYWRIGHT_CHANNEL=chrome report with generous regression ceilings.
// Run `pnpm test:memory` (builds the package first).
import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = fileURLToPath(new URL('../', import.meta.url))
const referenceRunner =
  process.env.PERF_REFERENCE === '1' || (!!process.env.CI && !process.env.PLAYWRIGHT_CHANNEL)
const temporary = mkdtempSync(join(tmpdir(), 'adl-memory-'))
const require = createRequire(import.meta.url)
const version = (name) => require(`${name}/package.json`).version
const run = (command, args, cwd = temporary, capture = false) =>
  execFileSync(command, args, {
    cwd,
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf8',
    timeout: 240000,
    env: { ...process.env, NODE_PATH: '' },
  })

const harness = `import { createRoot, type Root } from 'react-dom/client'
import { createDocument, createEditorStore, resolveDocument } from '@aesthc/diagram-lib/editor-core'
import type { DiagramDocument } from '@aesthc/diagram-lib/editor-core'
import { EditorRoot, EditorSurface } from '@aesthc/diagram-lib/editor'
import { exportDocument } from '@aesthc/diagram-lib/export'
import * as React from 'react'
import '@aesthc/diagram-lib/editor.css'

declare global {
  interface Window {
    gc?: () => void
    __adlHarness: Harness
  }
  interface Performance {
    memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number; totalJSHeapSize: number }
  }
}

function seededDocument(nodeCount: number, edgeCount: number, square: boolean): DiagramDocument {
  const side = Math.ceil(Math.sqrt(nodeCount))
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: \`n\${i}\`,
    label: \`Node \${i}\`,
    description: '',
  }))
  const edges = Array.from({ length: edgeCount }, (_, i) => ({
    id: \`e\${i}\`,
    from: \`n\${i % nodeCount}\`,
    to: \`n\${(i * 13 + 3) % nodeCount}\`,
  }))
  const spacing = square ? 100 : 180
  const width = square ? 100 : 140
  const height = square ? 100 : 56
  const made = createDocument(
    {
      type: 'graph',
      caption: \`Memory seed \${nodeCount}\`,
      legend: { main: 'Main', branch: 'Branch' },
      nodes,
      edges,
    },
    { id: \`memory-\${nodeCount}\`, locale: 'en' },
  )
  if (!made.ok) throw Error(JSON.stringify(made.diagnostics))
  const doc = made.value
  doc.scene = {
    ...doc.scene,
    mode: 'manual',
    nodes: Object.fromEntries(
      nodes.map((node, index) => [
        node.id,
        {
          x: (index % side) * spacing,
          y: Math.floor(index / side) * spacing,
          width,
          height,
          locked: false,
        },
      ]),
    ),
    routes: {},
    groups: [],
    zOrder: nodes.map((node) => node.id),
  }
  return doc
}

// Largest scale that keeps the raster inside the 32 MP contract limit.
function fitScale(document: DiagramDocument) {
  const resolved = resolveDocument(document, {
    quality: 'edit',
    requestId: 'memory-scale',
    skipDiagnostics: true,
  })
  if (!resolved.ok) throw Error(JSON.stringify(resolved.diagnostics))
  const pixels = resolved.value.layout.width * resolved.value.layout.height
  return Math.min(1, Math.sqrt((32_000_000 * 0.95) / pixels))
}

interface HarnessState {
  root?: Root
  store?: ReturnType<typeof createEditorStore>
  container?: HTMLDivElement
  rasterDocument?: DiagramDocument
  rasterScale?: number
}

const state: HarnessState = {}
let disposed = true

function mount() {
  if (!disposed) throw Error('harness already mounted')
  const doc = seededDocument(1000, 2000, false)
  const store = createEditorStore({
    document: doc,
    permissions: { edit: true, save: true, export: true },
  })
  const container = document.createElement('div')
  container.id = 'adl-harness-root'
  document.body.appendChild(container)
  const root = createRoot(container)
  root.render(
    <EditorRoot store={store} locale="en">
      <EditorSurface />
    </EditorRoot>,
  )
  state.root = root
  state.store = store
  state.container = container
  disposed = false
}

function edit() {
  if (!state.store || disposed) throw Error('harness not mounted')
  const current = state.store.getSnapshot().document
  const previous = current.scene.nodes.n0?.x ?? 0
  const result = state.store.dispatch({
    id: 'memory-move',
    label: 'Move',
    expectedRevision: current.revision,
    commands: [{ type: 'nodes.move', positions: { n0: { x: (previous + 1) % 16, y: 0 } } }],
  })
  if (result.status !== 'committed') throw Error(\`commit \${result.status}\`)
}

async function exportPng(document: DiagramDocument, scale: number) {
  const start = performance.now()
  const result = await exportDocument(document, {
    format: 'png',
    scope: { type: 'document' },
    theme: 'light',
    quality: 'edit',
    background: 'theme',
    scale,
    includeSource: false,
    metadata: 'minimal',
    fontPolicy: 'fallback',
  })
  const ms = performance.now() - start
  if (!result.ok)
    throw Error(result.diagnostics.map((d) => d.code).join(', '))
  if (!result.value.bytes.byteLength) throw Error('empty raster artifact')
  return { ms, width: result.value.receipt.width, height: result.value.receipt.height }
}

function dispose() {
  if (disposed) return
  state.root?.unmount()
  state.store?.dispose()
  state.container?.remove()
  state.root = undefined
  state.store = undefined
  state.container = undefined
  disposed = true
}

function gcAndHeap(): number | null {
  window.gc?.()
  return performance.memory?.usedJSHeapSize ?? null
}

function blobCount() {
  return performance
    .getEntriesByType('resource')
    .filter((entry) => entry.name.startsWith('blob:')).length
}

function rasterSeed() {
  if (state.rasterDocument) return
  // 30x30 square grid of 100x100 nodes at 100 spacing: layout 3080x3080.
  // Within the contract limits (1000 nodes / 2000 edges).
  const document = seededDocument(900, 1800, true)
  state.rasterDocument = document
  state.rasterScale = (2048 - 0.001) / 3080
}

async function rasterOnce(): Promise<{ ms: number; width?: number; height?: number }> {
  rasterSeed()
  const { ms, width, height } = await exportPng(state.rasterDocument!, state.rasterScale!)
  if (width !== 2048 || height !== 2048)
    throw Error(\`raster not at fixed 2048x2048: \${width}x\${height}\`)
  return { ms, width, height }
}

function p95(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]
}

interface Harness {
  environment(): Record<string, unknown>
  rasterTimings(warmups: number, samples: number): Promise<{ p95: number; times: number[] }>
  memoryCycles(cycles: number): Promise<{
    baseline: number | null
    perCycle: Array<number | null>
    growth: number | null
    blobsBefore: number
    blobsAfter: number
  }>
}

const api: Harness = {
  environment: () => ({
    platform: navigator.platform,
    userAgent: navigator.userAgent,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: (navigator as { deviceMemory?: number }).deviceMemory ?? 'unreported',
    memoryApi: !!performance.memory,
    reactVersion: React.version,
    reactCreateElement: typeof React.createElement,
  }),
  rasterTimings: async (warmups, samples) => {
    const times: number[] = []
    for (let i = 0; i < warmups; i++) await rasterOnce()
    for (let i = 0; i < samples; i++) times.push((await rasterOnce()).ms)
    return { p95: p95(times), times }
  },
  memoryCycles: async (cycles) => {
    try {
      const blobsBefore = blobCount()
      const memoryScale = fitScale(seededDocument(1000, 2000, false))
      mount()
      await exportPng(state.store!.getSnapshot().document, memoryScale)
      dispose()
      const baseline = gcAndHeap()
      const perCycle: Array<number | null> = []
      for (let i = 0; i < cycles; i++) {
        mount()
        edit()
        await exportPng(state.store!.getSnapshot().document, memoryScale)
        dispose()
        perCycle.push(gcAndHeap())
      }
      const final = gcAndHeap()
      return {
        baseline,
        perCycle,
        growth: baseline !== null && final !== null ? final - baseline : null,
        blobsBefore,
        blobsAfter: blobCount(),
      }
    } catch (error) {
      throw Error(error instanceof Error ? error.stack ?? error.message : String(error))
    }
  },
}

window.__adlHarness = api
`

let server
let browser
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
        vite: '7.3.6',
        typescript: version('typescript'),
        '@types/node': version('@types/node'),
        '@types/react': version('@types/react'),
        '@types/react-dom': version('@types/react-dom'),
      },
    }),
  )
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false'])
  writeFileSync(
    join(temporary, 'index.html'),
    '<!doctype html><html lang="en"><head><title>Memory harness</title></head><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>',
  )
  writeFileSync(join(temporary, 'main.tsx'), harness)
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
      include: ['*.tsx'],
    }),
  )
  const vite = join(temporary, 'node_modules/vite/bin/vite.js')
  run(process.execPath, [vite, 'build', '--outDir', 'memory-dist'])
  const port = 4177
  server = spawn(
    process.execPath,
    [
      vite,
      'preview',
      '--outDir',
      'memory-dist',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--strictPort',
    ],
    {
      cwd: temporary,
      stdio: 'inherit',
    },
  )
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
  if (!ready) throw Error('memory harness did not start')
  browser = await chromium.launch({
    args: ['--js-flags=--expose-gc', '--enable-precise-memory-info'],
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
  })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${port}`)
  await page.waitForFunction(() => !!window.__adlHarness)

  const environment = await page.evaluate(() => window.__adlHarness.environment())
  console.log('harness environment', JSON.stringify(environment))
  const raster = await page.evaluate(() => window.__adlHarness.rasterTimings(3, 12))
  const cycles = Number(process.env.MEMORY_CYCLES ?? 50)
  const memory = await page.evaluate((count) => window.__adlHarness.memoryCycles(count), cycles)
  if (errors.length) throw Error(errors.join('\n'))

  const evidence = join(root, 'test-results/e19')
  mkdirSync(evidence, { recursive: true })
  writeFileSync(
    join(evidence, 'metrics.json'),
    JSON.stringify(
      {
        runner: { reference: referenceRunner, node: process.version, platform: process.platform },
        environment,
        raster: { ...raster, budgetMs: 3000, warmups: 3, samples: 12 },
        memory: {
          ...memory,
          cycles: 50,
          budgetBytes: 10 * 1024 * 1024,
          heapUnit: 'bytes',
        },
      },
      null,
      2,
    ),
  )
  const rasterP95 = Number(raster.p95.toFixed(1))
  const memoryGrowth =
    memory.growth === null ? null : Number((memory.growth / (1024 * 1024)).toFixed(1))
  console.log(
    `raster 2048x2048 p95 ${rasterP95}ms (reference ${referenceRunner ? '≤3000' : 'report'}; ` +
      `${raster.times.length} samples)`,
  )
  console.log(
    `memory 50 cycles: growth ${memoryGrowth === null ? 'unreported (no performance.memory)' : `${memoryGrowth} MiB (reference ≤10 MiB)`}; ` +
      `blob resources ${memory.blobsBefore} -> ${memory.blobsAfter}`,
  )
  console.log(`environment ${JSON.stringify(environment)}`)
  const ceiling = referenceRunner ? 3000 : 8000
  if (rasterP95 > ceiling) throw Error(`raster p95 ${rasterP95}ms exceeds ceiling ${ceiling}ms`)
  if (memory.blobsAfter - memory.blobsBefore > 2)
    throw Error('blob URLs accumulate across export cycles')
  if (memory.growth !== null) {
    const referenceCeiling = referenceRunner ? 10 * 1024 * 1024 : 64 * 1024 * 1024
    if (memory.growth > referenceCeiling)
      throw Error(`heap growth ${memory.growth} exceeds ${referenceCeiling} bytes`)
  } else if (referenceRunner) {
    throw Error('performance.memory unavailable on the reference runner')
  }
  console.log(
    referenceRunner
      ? 'E19 memory and raster gates: PASS (reference runner)'
      : 'E19 memory and raster gates: reported locally, assertions are reference-runner-only',
  )
} finally {
  await browser?.close()
  server?.kill()
  if (server)
    await new Promise((resolve) =>
      server.exitCode !== null ? resolve() : server.once('exit', resolve),
    )
  rmSync(temporary, { recursive: true, force: true })
}
