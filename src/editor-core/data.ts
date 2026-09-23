import type { Diagnostic, Limits, Result } from './types'

export const DEFAULT_LIMITS: Readonly<Limits> = Object.freeze({
  maxBytes: 1048576,
  maxDepth: 64,
  maxNodes: 1000,
  maxEdges: 2000,
  maxGroups: 100,
  maxGroupDepth: 8,
  maxPorts: 32,
  maxRoutePoints: 64,
  maxLabelCharacters: 512,
  maxDescriptionCharacters: 8192,
  maxViews: 20,
  maxStorySteps: 50,
})
export const issue = (code: string, path = '/', message = code): Diagnostic => ({
  code,
  path,
  message,
  severity: 'error',
  supportedFixes: [],
})
export const success = <T>(value: T, diagnostics: Diagnostic[] = []): Result<T> => ({
  ok: true,
  value,
  diagnostics,
})
export const failure = <T = never>(code: string, path = '/', message = code): Result<T> => ({
  ok: false,
  diagnostics: [issue(code, path, message)],
})
export const reserved = new Set(['__proto__', 'prototype', 'constructor'])
export const validId = (id: string) => !!id.trim() && !reserved.has(id)
export const pointer = (key: string) => key.replaceAll('~', '~0').replaceAll('/', '~1')
export function limitsWith(overrides: Partial<Limits> = {}): Limits {
  const limits = { ...DEFAULT_LIMITS, ...overrides }
  for (const [key, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value < 0)
      throw new RangeError(`Invalid editor limit: ${key}`)
  }
  return limits
}
/** Only plain JSON data crosses this boundary; descriptors are inspected without invoking getters. */
export function inspectData(input: unknown, limits: Limits): Diagnostic[] {
  const ancestors = new Set<object>()
  let estimatedBytes = 0
  let visits = 0
  function walk(value: unknown, path: string, depth: number): Diagnostic | undefined {
    if (++visits > limits.maxBytes + 1) return issue('limit.bytes', path)
    if (depth > limits.maxDepth) return issue('data.depth', path)
    if (value === null || typeof value === 'boolean') return
    if (typeof value === 'number')
      return Number.isFinite(value) ? undefined : issue('data.finite', path)
    if (typeof value === 'string') {
      if (value.length > limits.maxBytes) return issue('limit.bytes', path)
      try {
        encodeURIComponent(value)
      } catch {
        return issue('data.unicode', path)
      }
      estimatedBytes += new TextEncoder().encode(value).length
      if (estimatedBytes > limits.maxBytes) return issue('limit.bytes', path)
      return
    }
    if (typeof value !== 'object') return issue('data.type', path)
    if (ancestors.has(value)) return issue('data.cycle', path)
    const prototype = Object.getPrototypeOf(value)
    if (
      Array.isArray(value)
        ? prototype !== Array.prototype
        : prototype !== Object.prototype && prototype !== null
    )
      return issue('data.prototype', path)
    if (Object.getOwnPropertySymbols(value).length) return issue('data.type', path)
    if (Array.isArray(value)) {
      const keys = Object.getOwnPropertyNames(value).filter((key) => key !== 'length')
      if (keys.length !== value.length || keys.some((key, index) => key !== String(index)))
        return issue('data.array', path)
    }
    ancestors.add(value)
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
      if (Array.isArray(value) && key === 'length') continue
      const childPath = `${path}/${pointer(key)}`
      if (reserved.has(key)) return issue('data.unsafe-key', childPath)
      if (descriptor.get || descriptor.set) return issue('data.accessor', childPath)
      if (!descriptor.enumerable) return issue('data.type', childPath)
      estimatedBytes += key.length
      const invalid = walk(descriptor.value, childPath, depth + 1)
      if (invalid) return invalid
    }
    ancestors.delete(value)
    return
  }
  const invalid = walk(input, '', 0)
  if (invalid) return [invalid]
  const serialized = JSON.stringify(input)
  if (serialized === undefined) return [issue('data.type')]
  if (new TextEncoder().encode(serialized).length > limits.maxBytes) return [issue('limit.bytes')]
  return []
}
export function canonical(value: unknown): string {
  const order = (a: string, b: string) => {
    const left = Array.from(a, (s) => s.codePointAt(0)!)
    const right = Array.from(b, (s) => s.codePointAt(0)!)
    for (let index = 0; index < Math.min(left.length, right.length); index++) {
      if (left[index] !== right[index]) return left[index] - right[index]
    }
    return left.length - right.length
  }
  function sort(item: unknown): unknown {
    if (Array.isArray(item)) return item.map(sort)
    if (item && typeof item === 'object')
      return Object.fromEntries(
        Object.entries(item)
          .sort(([a], [b]) => order(a, b))
          .map(([key, value]) => [key, sort(value)]),
      )
    return item
  }
  return JSON.stringify(sort(value))
}
export function freezeData<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value)) freezeData(child)
  }
  return value
}
