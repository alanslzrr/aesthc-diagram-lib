import { describe, expect, it } from 'vitest'
import { ARCHITECTURE_EXAMPLES } from '../src/examples'
import { validateDiagramSpec } from '../src/validation'
import { layoutDiagram } from '../src/layouts'

describe('service-level architecture references', () => {
  for (const [name, example] of Object.entries(ARCHITECTURE_EXAMPLES)) {
    for (const locale of ['en', 'es'] as const) {
      it(`${name}/${locale} is localized, valid and describes service responsibilities`, () => {
        const spec = example.diagram[locale]
        expect(validateDiagramSpec(spec).success).toBe(true)
        const layout = layoutDiagram(spec)
        expect(layout.nodes).toHaveLength(5)
        for (const edge of layout.edges) {
          const label = {
            left: edge.labelX - edge.labelWidth / 2,
            right: edge.labelX + edge.labelWidth / 2,
            top: edge.labelY - 12,
            bottom: edge.labelY + 12,
          }
          for (const node of layout.nodes) {
            const overlaps =
              label.left < node.x + node.w &&
              label.right > node.x &&
              label.top < node.y + node.h &&
              label.bottom > node.y
            expect(overlaps, `${edge.id} label overlaps ${node.id}`).toBe(false)
          }
        }
        expect(spec.edges.some((edge) => edge.variant === 'branch')).toBe(true)
        for (const node of spec.nodes) {
          expect(node.label.toLowerCase()).not.toBe(node.sublabel?.toLowerCase())
          expect(['Google Cloud', 'Microsoft Azure', 'GCP', 'Azure']).not.toContain(node.label)
          expect(node.description.length).toBeGreaterThan(45)
          expect(example.visuals).toHaveProperty(node.id)
        }
        expect(example.notes[locale]).toHaveLength(2)
        expect(example.sources.every((source) => source.url.startsWith('https://'))).toBe(true)
      })
    }
  }
  it('distinguishes application quarantine, broker DLQ and blocked CI', () => {
    expect(
      ARCHITECTURE_EXAMPLES.documents.diagram.en.nodes.find((node) => node.id === 'quarantine')
        ?.sublabel,
    ).toBe('Cloud Storage')
    expect(
      ARCHITECTURE_EXAMPLES.orders.diagram.en.nodes.find((node) => node.id === 'deadletter')
        ?.sublabel,
    ).toBe('Service Bus / DLQ')
    expect(
      ARCHITECTURE_EXAMPLES.delivery.diagram.en.edges.find((edge) => edge.id === 'deploy')?.label,
    ).toBe('digest')
  })
})
