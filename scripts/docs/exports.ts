import ts from 'typescript'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Derive public symbols from the source graph without loading interactive modules. */
export function publicExportInventory(manifest: {
  name: string
  exports: Record<string, string | { types: string }>
}) {
  const entries = Object.entries(manifest.exports).flatMap(([subpath, target]) =>
    typeof target === 'string'
      ? []
      : [
          {
            subpath,
            file: resolve(
              subpath === './icons'
                ? 'src/brand-icons/index.tsx'
                : target.types.replace('./dist/', 'src/').replace(/\.d\.ts$/, '.ts'),
            ),
          },
        ],
  )
  // Canvas and showcase barrels are .ts; icons are intentionally .tsx.
  const program = ts.createProgram(
    entries.map(({ file }) => file),
    {
      target: ts.ScriptTarget.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      allowJs: true,
    },
  )
  const checker = program.getTypeChecker()
  return entries.map(({ subpath, file }) => {
    const source = program.getSourceFile(file)
    const symbol = source && checker.getSymbolAtLocation(source)
    if (!symbol) throw new Error(`No source contract for public export ${subpath}: ${file}`)
    return {
      subpath,
      names: checker
        .getExportsOfModule(symbol)
        .map((item) => item.name)
        .sort(),
    }
  })
}

export function generatedApi(manifest: Parameters<typeof publicExportInventory>[0]) {
  const marker = '<!-- generated-export-inventory -->'
  const source = readFileSync('docs/api/index.md', 'utf8').split(marker)[0].trimEnd()
  // Every manifest subpath must have a human purpose, even runtime-empty type entries.
  for (const subpath of Object.keys(manifest.exports)) {
    const label = subpath === '.' ? manifest.name : subpath.slice(1)
    if (!source.includes(`\`${label}\``))
      throw new Error(`Missing canonical API purpose for ${subpath}`)
  }
  return `${source}\n\n${marker}\n## Complete public symbol inventory\n\nGenerated from the TypeScript export graph by \`pnpm docs:generate\`. Edit the\nsource contract and the purpose table above, not this inventory. No public\nsubpaths are excluded; the stylesheet has no JavaScript symbols.\n\n${publicExportInventory(
    manifest,
  )
    .map(
      ({ subpath, names }) =>
        `### ${subpath === '.' ? manifest.name : subpath.slice(1)}\n\n${names.map((name) => `\`${name}\``).join(', ') || 'Type-only contract; no runtime exports.'}\n`,
    )
    .join('\n')}`
}
