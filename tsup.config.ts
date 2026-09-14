import { defineConfig } from 'tsup'

export default defineConfig({
  // Public subpaths share internal ESM chunks so registry state has one owner
  // per package installation. Standalone bundles would duplicate its Map.
  entry: {
    index: 'src/index.ts',
    'icons/index': 'src/brand-icons/index.tsx',
    'canvas/index': 'src/canvas/index.ts',
    'layouts/index': 'src/layouts/index.ts',
    'layouts/band': 'src/layouts/band.ts',
    registry: 'src/registry.ts',
    'validation/index': 'src/validation/index.ts',
    types: 'src/types.ts',
    theme: 'src/theme.ts',
    layout: 'src/layout.ts',
    examples: 'src/examples.ts',
    'showcase/index': 'src/showcase/index.ts',
  },
  format: ['esm'],
  dts: true,
  outDir: 'dist',
  // Remove obsolete hashed chunks; build:css regenerates styles after tsup.
  clean: true,
  splitting: true,
  sourcemap: false,
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    'react-dom/server',
    '@phosphor-icons/react',
    '@radix-ui/react-tooltip',
    'clsx',
    'tailwind-merge',
  ],
  outExtension: () => ({ js: '.js' }),
})
