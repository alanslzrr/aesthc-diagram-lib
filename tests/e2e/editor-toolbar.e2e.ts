import { test, expect, type Page } from '@playwright/test'

// UI-01: toolbar controls keep intrinsic widths, never intersect each other or
// clip their text, the zoom value stays on one line, and every action remains
// reachable through the explicit actions menu at every supported width.
const WIDTHS = [390, 768, 1280, 1440, 1920] as const

interface ControlRect {
  tag: string
  text: string
  name: string
  x: number
  y: number
  width: number
  height: number
  scrollWidth: number
  clientWidth: number
}

async function readToolbar(page: Page): Promise<{ controls: ControlRect[]; toolbar: number[] }> {
  return page.evaluate(() => {
    const toolbar = document.querySelector('.adl-editor-toolbar')
    if (!toolbar) throw new Error('toolbar missing')
    const controls = [...toolbar.querySelectorAll('button, select, output')]
      .filter((element) => {
        const style = getComputedStyle(element)
        return (
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          element.getClientRects().length > 0
        )
      })
      .map((element) => {
        const rect = element.getBoundingClientRect()
        return {
          tag: element.tagName.toLowerCase(),
          text: (element.textContent ?? '').trim(),
          name:
            element.getAttribute('aria-label') ??
            element.getAttribute('id') ??
            element.tagName.toLowerCase(),
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
        }
      })
    const bounds = toolbar.getBoundingClientRect()
    return { controls, toolbar: [bounds.x, bounds.width] }
  })
}

function overlaps(a: ControlRect, b: ControlRect) {
  const pad = 1
  return (
    a.x + pad < b.x + b.width - pad &&
    b.x + pad < a.x + a.width - pad &&
    a.y + pad < b.y + b.height - pad &&
    b.y + pad < a.y + a.height - pad
  )
}

for (const width of WIDTHS) {
  for (const locale of ['en', 'es'] as const) {
    test(`toolbar never overlaps or clips at ${width}px (${locale})`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/playground.html?only=example-band')
      await expect(page.locator('.adl-editor-surface [data-hit-node]').first()).toBeVisible()
      if (locale === 'es') {
        await page.getByRole('button', { name: 'EN', exact: true }).click()
      }

      const selections = async (state: 'none' | 'one' | 'many') => {
        if (state === 'none') {
          await page.locator('.adl-editor-surface').click({ position: { x: 4, y: 4 } })
        } else {
          const nodes = page.locator('.adl-editor-surface [data-hit-node]')
          await nodes.nth(0).click()
          if (state === 'many') await nodes.nth(1).click({ modifiers: ['Shift'] })
        }
      }

      for (const state of ['none', 'one', 'many'] as const) {
        await selections(state)
        const { controls, toolbar } = await readToolbar(page)
        expect(controls.length).toBeGreaterThan(10)

        for (const control of controls) {
          expect(
            control.scrollWidth,
            `${control.tag} "${control.text}" must not clip text`,
          ).toBeLessThanOrEqual(control.clientWidth + 1)
          expect(control.x, `${control.tag} must start inside the viewport`).toBeGreaterThanOrEqual(
            -1,
          )
          expect(
            control.x + control.width,
            `${control.tag} must fit the viewport`,
          ).toBeLessThanOrEqual(width + 1)
          expect(control.x + control.width).toBeLessThanOrEqual(toolbar[0] + toolbar[1] + 1)
        }

        for (let i = 0; i < controls.length; i++)
          for (let j = i + 1; j < controls.length; j++)
            expect(
              overlaps(controls[i], controls[j]),
              `"${controls[i].text || controls[i].name}" overlaps "${controls[j].text || controls[j].name}"`,
            ).toBe(false)

        const zoom = controls.find((control) => control.name === 'Zoom')
        expect(zoom).toBeDefined()
        expect(zoom!.text).toMatch(/^\d+%$/)
        expect(zoom!.text).not.toMatch(/\s/)

        const menu = page.getByRole('button', {
          name: locale === 'es' ? 'Más acciones' : 'More actions',
        })
        await menu.click()
        const menuItems = page.getByRole('menuitem')
        const count = await menuItems.count()
        expect(count).toBeGreaterThanOrEqual(4)
        for (let index = 0; index < count; index++) {
          const item = menuItems.nth(index)
          await expect(item).toBeVisible()
          const box = (await item.boundingBox())!
          expect(box.x).toBeGreaterThanOrEqual(-1)
          expect(box.x + box.width).toBeLessThanOrEqual(width + 1)
        }
        const arrangement = page.getByLabel(
          locale === 'es' ? 'Alineación y distribución' : 'Arrangement',
        )
        await expect(arrangement).toBeVisible()
        const arrange = page.getByRole('button', {
          name: locale === 'es' ? 'Organizar selección' : 'Arrange selection',
        })
        await expect(arrange).toBeVisible()
        const arrangeBox = (await arrange.boundingBox())!
        expect(arrangeBox.x + arrangeBox.width).toBeLessThanOrEqual(width + 1)
        await page.keyboard.press('Escape')
        await expect(menuItems.first()).toBeHidden()
      }
    })
  }
}
