export interface SnapshotManifest {
  version: string
  channel?: string
  base?: string
  contentBase?: string
  sha?: string
  files: Record<string, string>
}
export function snapshotFiles(directory: string): string[]
export function sealSnapshot(directory: string, metadata: Omit<SnapshotManifest, 'files'>): void
export function verifySnapshot(directory: string): SnapshotManifest
export function copySnapshotResources(
  out: string,
  directory: string,
  base: string,
  contentBase: string,
  version: string,
): void
