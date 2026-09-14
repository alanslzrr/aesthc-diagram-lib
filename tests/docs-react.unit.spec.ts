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

describe('portable frozen documentation payloads', () => {
  it('rebases only resource/navigation fields, preserving code and canonical origin', async () => {
    const { rebaseDocPage } = await import('../site/src/docs/model')
    const page = {
      version: '0.3.0',
      base: '/',
      contentBase: '/versions/0.3.0/',
      destination: 'versions/0.3.0/docs/api/',
      origin: 'https://example.com/',
      blocks: [{ href: '/versions/0.3.0/docs/', text: '/do-not-rewrite-code' }],
      nav: [{ pages: [{ url: '/versions/0.3.0/docs/' }] }],
    } as unknown as import('../site/src/docs/model').DocPage
    const changed = rebaseDocPage(page, '/aesthc-diagram-lib/versions/0.3.0/docs/api/')
    expect(changed.base).toBe('/aesthc-diagram-lib/')
    expect(changed.contentBase).toBe('/aesthc-diagram-lib/versions/0.3.0/')
    expect(changed.nav[0].pages[0].url).toBe('/aesthc-diagram-lib/versions/0.3.0/docs/')
    expect(changed.blocks[0].text).toBe('/do-not-rewrite-code')
    expect(changed.origin).toBe(page.origin)
    expect(rebaseDocPage(page, '/docs/api/')).toBe(page)
  })
})
