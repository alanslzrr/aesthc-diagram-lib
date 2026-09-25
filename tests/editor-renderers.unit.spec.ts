import { describe, expect, it, vi } from 'vitest'
import { createRendererRegistry, renderCustomNode, validateCustomPayload } from '../src/editor-core'
import type { CustomNodeRenderer } from '../src/editor-core'

const renderer: CustomNodeRenderer<{ label: string }> = {
  typeKey: 'trusted-badge',
  validate(data) {
    const candidate = data as { label?: unknown }
    if (typeof candidate?.label !== 'string')
      return {
        ok: false,
        diagnostics: [
          {
            code: 'badge.invalid',
            path: '/',
            message: 'badge.invalid',
            severity: 'error',
            supportedFixes: [],
          },
        ],
      }
    return { ok: true, diagnostics: [], value: { label: candidate.label } }
  },
  measure() {
    return { width: 120, height: 40 }
  },
  renderSvg(data, context) {
    return `<g data-custom-renderer="trusted-badge"><text x="${context.x}" y="${context.y}">${data.label}</text></g>`
  },
}

describe('E18 renderer registries', () => {
  it('T43.1 unknown typeKeys never load code and stay unsupported', () => {
    const registry = createRendererRegistry()
    expect(registry.register(renderer).ok).toBe(true)
    // Duplicate registration is rejected without replacing the trusted one.
    expect(registry.register(renderer).ok).toBe(false)
    expect(registry.typeKeys()).toEqual(['trusted-badge'])
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const unsupported = validateCustomPayload(registry, { typeKey: 'remote-evil', data: {} })
    expect(unsupported.ok).toBe(false)
    expect(unsupported.diagnostics.some((d) => d.code === 'renderer.unsupported')).toBe(true)
    const rendered = renderCustomNode(
      registry,
      { typeKey: 'remote-evil', data: { url: 'https://evil.example/payload.js' } },
      {
        fontSize: 13,
        theme: 'light',
        palette: { background: '', foreground: '', card: '', border: '', muted: '' },
        x: 0,
        y: 0,
      },
    )
    expect(rendered.ok).toBe(false)
    expect(rendered.diagnostics.some((d) => d.code === 'renderer.unsupported')).toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  it('T43.1 registries are isolated per instance and payloads never serialize callbacks', () => {
    const first = createRendererRegistry()
    const second = createRendererRegistry()
    expect(first.register(renderer).ok).toBe(true)
    // The second instance remains untouched: no global registry.
    expect(second.typeKeys()).toEqual([])
    expect(second.resolve('trusted-badge')).toBeUndefined()
    const payload = { typeKey: 'trusted-badge', data: { label: 'Ready' } }
    const roundTrip = JSON.parse(JSON.stringify(payload))
    expect(roundTrip).toEqual(payload)
    const rendered = renderCustomNode(first, roundTrip, {
      fontSize: 13,
      theme: 'light',
      palette: { background: '', foreground: '', card: '', border: '', muted: '' },
      x: 10,
      y: 20,
    })
    if (!rendered.ok) throw Error(JSON.stringify(rendered.diagnostics))
    expect(rendered.value.width).toBe(120)
    expect(rendered.value.svg).toContain('data-custom-renderer="trusted-badge"')
    // A failing renderer validation is reported, never rendered.
    const invalid = renderCustomNode(
      first,
      { typeKey: 'trusted-badge', data: { label: 7 } },
      {
        fontSize: 13,
        theme: 'light',
        palette: { background: '', foreground: '', card: '', border: '', muted: '' },
        x: 0,
        y: 0,
      },
    )
    expect(invalid.ok).toBe(false)
    expect(invalid.diagnostics.some((d) => d.code === 'badge.invalid')).toBe(true)
  })
})
