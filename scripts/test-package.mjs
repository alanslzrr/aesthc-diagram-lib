// Test the actual npm tarball outside the workspace, without source aliases.
// Run `pnpm test:package` to build first, or run this file after an existing build.
import { execFileSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { delimiter, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)
const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const temporary = mkdtempSync(join(tmpdir(), 'aesthc-package-'))
const consumer = join(temporary, 'consumer')
const environment = { ...process.env }
delete environment.NODE_PATH

function run(command, args, cwd, capture = false) {
  return execFileSync(command, args, {
    cwd,
    env: environment,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    timeout: 180_000,
  })
}

function installedVersion(name) {
  return require(`${name}/package.json`).version
}

function runNpm(args, cwd, capture = false) {
  if (process.platform !== 'win32') return run('npm', args, cwd, capture)

  // execFile cannot launch .cmd shims directly. Invoke npm's JS entry instead,
  // without a shell that could reinterpret spaces or metacharacters in paths.
  const pathKey = Object.keys(environment).find((key) => key.toLowerCase() === 'path')
  const directories = (environment[pathKey] ?? '').split(delimiter)
  const cli = directories
    .map((directory) => join(directory, 'node_modules/npm/bin/npm-cli.js'))
    .find((candidate) => existsSync(candidate))
  if (!cli) throw new Error('Cannot find npm-cli.js alongside npm on PATH')
  return run(process.execPath, [cli, ...args], cwd, capture)
}

try {
  const archive = process.env.PACKAGE_ARCHIVE
    ? resolve(process.env.PACKAGE_ARCHIVE)
    : join(
        temporary,
        JSON.parse(
          runNpm(
            ['pack', '--json', '--ignore-scripts', '--pack-destination', temporary],
            root,
            true,
          ),
        )[0].filename,
      )
  cpSync(new URL('../tests/fixtures/package-consumer/', import.meta.url), consumer, {
    recursive: true,
  })
  cpSync(new URL('../examples/', import.meta.url), join(consumer, 'examples'), { recursive: true })
  writeFileSync(
    join(consumer, 'package.json'),
    JSON.stringify(
      {
        name: 'diagram-lib-package-consumer',
        private: true,
        type: 'module',
        dependencies: {
          [manifest.name]: `file:${archive}`,
          react: process.env.REACT_VERSION ?? installedVersion('react'),
          'react-dom': process.env.REACT_VERSION ?? installedVersion('react-dom'),
        },
        devDependencies: {
          typescript: installedVersion('typescript'),
          '@types/react': process.env.REACT_TYPES_VERSION ?? installedVersion('@types/react'),
          '@types/react-dom':
            process.env.REACT_DOM_TYPES_VERSION ?? installedVersion('@types/react-dom'),
        },
      },
      null,
      2,
    ),
  )

  console.log(`Testing ${archive} in an isolated consumer`)
  // Do not execute lifecycle scripts from the package or its dependencies.
  // Direct peer/compiler versions match the installed, lockfile-backed workspace.
  runNpm(
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false'],
    consumer,
  )
  run(process.execPath, ['--test', 'package.test.mjs'], consumer)
  if (!process.env.REACT_VERSION?.startsWith('18.'))
    run(process.execPath, ['--conditions=react-server', 'server-imports.mjs'], consumer)

  const imports = Object.keys(manifest.exports)
    .filter((entry) => typeof manifest.exports[entry] !== 'string')
    .map((entry, index) => {
      const specifier = entry === '.' ? manifest.name : `${manifest.name}/${entry.slice(2)}`
      return `import * as Entry${index} from '${specifier}'\nvoid Entry${index}`
    })
  writeFileSync(join(consumer, 'exports.ts'), imports.join('\n') + '\n')
  const tsc = join(consumer, 'node_modules/typescript/bin/tsc')
  for (const [module, resolution] of [
    ['NodeNext', 'NodeNext'],
    ['ESNext', 'Bundler'],
  ]) {
    run(
      process.execPath,
      [
        tsc,
        '--noEmit',
        '--strict',
        '--target',
        'ES2022',
        '--module',
        module,
        '--moduleResolution',
        resolution,
        '--jsx',
        'react-jsx',
        'exports.ts',
        'consumer.tsx',
        'brand-icon.tsx',
        ...readdirSync(join(consumer, 'examples'))
          .filter((file) => file.endsWith('.tsx'))
          .map((file) => `examples/${file}`),
      ],
      consumer,
    )
    console.log(`Published declarations resolve with ${resolution}`)
  }
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
