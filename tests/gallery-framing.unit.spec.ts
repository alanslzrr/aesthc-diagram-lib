import { describe, expect, it } from 'vitest'
import { layoutDiagram } from '../src/layouts'
import { previewBounds } from '../src/canvas/bounds'
import { GALLERY_FIXTURES, GALLERY_VIEWS } from '../site/src/lib/gallery'

// The landing gallery precomputes its frames to stay inside the entry budget.
// This test recomputes them so a fixture change cannot leave stale crops.
describe('gallery framing', () => {
  for (const [key, byLocale] of Object.entries(GALLERY_FIXTURES)) {
    it(`keeps the precomputed ${key} frame equal to previewBounds`, () => {
      expect(previewBounds(layoutDiagram(byLocale.en))).toEqual(GALLERY_VIEWS[key])
    })
  }

  it('keeps the width-only label budget above 10px at phone width', () => {
    // 316px is the measured stage content width at a 390px viewport. This is a
    // width-only proxy: it ignores the stage height, the real `meet` scale and
    // per-type typography. The effective mobile floor is measured with
    // getScreenCTM in `tests/e2e/diagram-backdrop.e2e.ts`; do not read this
    // unit as proof of a rendered 10px minimum.
    const phoneContent = 316
    for (const [key, view] of Object.entries(GALLERY_VIEWS)) {
      const effective = 14.5 * Math.min(1, phoneContent / view.width)
      expect(effective, `${key} main label width budget at phone width`).toBeGreaterThanOrEqual(10)
    }
  })
})
