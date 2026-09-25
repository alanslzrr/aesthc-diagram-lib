// Builds the offline viewer runtime inlined by exportDocumentHtml. React and
// the viewer are bundled inside so the artifact needs no network and no host.
// Run from `pnpm build`; the output is tracked in dist/standalone/.
import { build } from 'tsup'

await build({
  entry: { 'standalone/viewer': 'src/export/standalone.tsx' },
  outDir: 'dist',
  bundle: true,
  minify: true,
  format: ['iife'],
  globalName: 'AesthcStandalone',
  platform: 'browser',
  target: 'es2022',
  dts: false,
  splitting: false,
  clean: false,
  sourcemap: false,
  define: { 'process.env.NODE_ENV': '"production"' },
})
console.log('standalone viewer runtime built → dist/standalone/viewer.js')
