// Read-only: never publish, tag, freeze docs or change availability metadata.
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { verifyArtifact, verifyDocs } from './release/verify.mjs'

const manifest = JSON.parse(readFileSync('package.json', 'utf8'))
const [archivePath, docsUrl] = process.argv.slice(2)
if (!archivePath)
  throw Error('Usage: node scripts/verify-public-release.mjs VERIFIED.tgz [DOCS_BASE_URL]')
const expected = readFileSync(resolve(archivePath))
const registry = `https://registry.npmjs.org/@aesthc%2fdiagram-lib/${manifest.version}`
async function get(url) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000), cache: 'no-store' })
    if (response.ok) return response
    if (attempt === 5 || ![404, 429, 500, 502, 503, 504].includes(response.status))
      throw Error(`Public verification failed: HTTP ${response.status} at ${url}`)
    await new Promise((done) => setTimeout(done, 10_000))
  }
}
const metadata = await (await get(registry)).json()
const tarball = new URL(metadata.dist.tarball)
if (tarball.origin !== 'https://registry.npmjs.org') throw Error('Unexpected registry archive host')
const archive = Buffer.from(await (await get(tarball)).arrayBuffer())
verifyArtifact(metadata, archive, expected, manifest.version)
const temporary = mkdtempSync(join(tmpdir(), 'adl-public-release-'))
try {
  const path = join(temporary, 'public.tgz')
  writeFileSync(path, archive)
  // Empty configuration and an isolated consumer ensure no login is needed.
  for (const name of ['user.npmrc', 'global.npmrc']) writeFileSync(join(temporary, name), '')
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !/npm_config_|npm_token|node_auth_token/i.test(key),
    ),
  )
  execFileSync(process.execPath, ['scripts/test-package.mjs'], {
    stdio: 'inherit',
    env: {
      ...env,
      PACKAGE_ARCHIVE: path,
      NPM_CONFIG_USERCONFIG: join(temporary, 'user.npmrc'),
      NPM_CONFIG_GLOBALCONFIG: join(temporary, 'global.npmrc'),
      NPM_CONFIG_REGISTRY: 'https://registry.npmjs.org',
    },
  })
  if (docsUrl) {
    const base = new URL(docsUrl.replace(/\/?$/, '/'))
    if (base.protocol !== 'https:') throw Error('Public documentation must use HTTPS')
    const snapshot = await (
      await get(new URL(`versions/${manifest.version}/snapshot.json`, base))
    ).json()
    verifyDocs(snapshot, manifest.version)
    const entries = Object.entries(snapshot.files ?? {})
    if (!entries.length || entries.length > 5000) throw Error('Invalid documentation inventory')
    for (const [path, expectedHash] of entries) {
      if (
        !/^[a-zA-Z0-9_./-]+$/.test(path) ||
        path.startsWith('/') ||
        path.split('/').includes('..')
      )
        throw Error('Unsafe documentation inventory path')
      const bytes = Buffer.from(
        await (await get(new URL(`versions/${manifest.version}/${path}`, base))).arrayBuffer(),
      )
      if (createHash('sha256').update(bytes).digest('hex') !== expectedHash)
        throw Error(`Public documentation checksum mismatch: ${path}`)
    }
    for (const path of [
      'docs/getting-started/',
      'agents/index.md',
      'llms.txt',
      `schemas/${manifest.version}/DiagramSpec.schema.json`,
    ])
      await get(new URL(`versions/${manifest.version}/${path}`, base))
    console.log(`Matching stable documentation verified: ${base}`)
  } else {
    console.log(
      'Registry artifact verified. Stable deployment verification remains a separate release checkpoint.',
    )
  }
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
