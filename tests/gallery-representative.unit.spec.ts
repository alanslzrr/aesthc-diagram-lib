import { expect, it } from 'vitest'
import { GALLERY_FIXTURES } from '../site/src/lib/gallery'
for (const locale of ['en', 'es'] as const) {
  it(`preserves representative relationships in ${locale}`, () => {
    const er = GALLERY_FIXTURES['example-er'][locale]
    const sequence = GALLERY_FIXTURES['example-sequence'][locale]
    const lanes = GALLERY_FIXTURES['example-swimlane'][locale]
    expect(er.type === 'er' && er.entities.length).toBe(2)
    expect(er.type === 'er' && er.relations.length).toBe(1)
    expect(sequence.type === 'sequence' && sequence.participants.length).toBe(2)
    expect(sequence.type === 'sequence' && sequence.messages.length).toBe(2)
    expect(lanes.type === 'swimlane' && lanes.lanes.length).toBe(2)
    expect(lanes.type === 'swimlane' && lanes.edges.length).toBe(1)
  })
}
