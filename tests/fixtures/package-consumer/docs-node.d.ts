// Ambient declarations for the Node builtins used by the documented export
// examples. The consumer installs only the compiler and React types, so the
// tarball verification supplies the minimal signatures it needs.
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string
  export function readFileSync(path: string): Uint8Array
}
declare module 'node:module' {
  export function createRequire(path: string): { resolve(id: string): string }
}
declare module 'node:path' {
  export function dirname(path: string): string
  export function join(...parts: string[]): string
}
