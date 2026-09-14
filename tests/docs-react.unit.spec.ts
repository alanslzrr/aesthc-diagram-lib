import { describe, it, expect } from 'vitest'
import { safeHref } from '../site/src/docs/model'
import { validPreference } from '../site/src/components/primitives/theme'
describe('documentation URL boundaries', () => {
  it.each([
    'javascript:alert(1)',
    '  javascript:alert(1)',
    'java\tscript:alert(1)',
    'data:text/html,<script>',
    'vbscript:run',
  ])('rejects executable URL %s', (url) => expect(safeHref(url)).toBe('#'))
  it.each(['/docs/', '../guide/', '#part', 'https://example.com', 'mailto:test@example.com'])(
    'preserves link %s',
    (url) => expect(safeHref(url)).toBe(url),
  )
})
describe('theme preference migration', () => {
  it.each(['light', 'dark'] as const)('retains %s', (value) =>
    expect(validPreference(value)).toBe(value),
  )
  it.each([null, undefined, 'invalid', 'system'])('defaults %s to system', (value) =>
    expect(validPreference(value)).toBe('system'),
  )
})
