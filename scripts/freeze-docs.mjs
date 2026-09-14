import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { verifySnapshot } from './docs/snapshots.mjs'
const version = process.argv[2] ?? JSON.parse(readFileSync('package.json', 'utf8')).version
if (!/^[0-9]+\.[0-9]+\.[0-9]+(?:-[a-zA-Z0-9.-]+)?$/.test(version))
  throw Error('Expected a semantic version, not a path')
const source = `site/dist/versions/${version}`
const destination = `site/public/versions/${version}`
if (existsSync(destination)) throw Error('Snapshot already frozen; never overwrite it')
const manifest = verifySnapshot(source)
if (manifest.version !== version) throw Error('Snapshot version mismatch')
mkdirSync('site/public/versions', { recursive: true })
cpSync(source, destination, { recursive: true })
verifySnapshot(destination)
console.log(
  `Frozen ${version} (${manifest.channel}) from ${manifest.sha}; commit the complete snapshot directory`,
)
