import { test, expect, type Page } from '@playwright/test'

// Chromium exposes native IME injection. Other engines exercise the same DOM
// composition contract; this is not certification of a platform IME driver.
async function compositionSession(page: Page, browserName: string) {
  if (browserName === 'chromium') return page.context().newCDPSession(page)
  test.info().annotations.push({
    type: 'coverage',
    description: 'DOM composition events; native IME injection unavailable outside Chromium',
  })
  let composing = false
  return {
    async send(
      method: string,
      params: { text: string; selectionStart?: number; selectionEnd?: number },
    ) {
      const continuing = composing
      composing = method === 'Input.imeSetComposition'
      await page.evaluate(
        ({ text, continuing, composing }) => {
          const input = document.activeElement
          if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement))
            throw Error('No focused input')
          if (composing && !continuing)
            input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
          if (composing)
            input.dispatchEvent(
              new CompositionEvent('compositionupdate', { bubbles: true, data: text }),
            )
          const prototype =
            input instanceof HTMLTextAreaElement
              ? HTMLTextAreaElement.prototype
              : HTMLInputElement.prototype
          Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(input, text)
          input.dispatchEvent(
            new InputEvent('input', {
              bubbles: true,
              data: text,
              inputType: composing ? 'insertCompositionText' : 'insertText',
              isComposing: composing,
            }),
          )
          if (continuing && !composing)
            input.dispatchEvent(
              new CompositionEvent('compositionend', { bubbles: true, data: text }),
            )
        },
        { text: params.text, continuing, composing },
      )
    },
    async detach() {},
  }
}

test('T16.1 IME composition never commits intermediate text and applies once on confirm', async ({
  page,
  browserName,
}) => {
  await page.goto('/studio.html')
  const node = page.getByRole('button', { name: 'Order API', exact: true })
  await node.click()
  const label = page.getByLabel('Label', { exact: true })
  await label.focus()
  await label.fill('')
  const undo = page.getByRole('button', { name: 'Undo', exact: true })
  await expect(undo).toBeDisabled()
  const cdp = await compositionSession(page, browserName)
  await cdp.send('Input.imeSetComposition', { text: 'α', selectionStart: 1, selectionEnd: 1 })
  await cdp.send('Input.imeSetComposition', { text: 'αβ', selectionStart: 2, selectionEnd: 2 })
  await expect(undo).toBeDisabled()
  await expect(node).toHaveAttribute('aria-pressed', 'true')
  await cdp.send('Input.insertText', { text: 'αβ' })
  await cdp.detach()
  await page.getByRole('button', { name: 'Apply label', exact: true }).click()
  await expect(page.getByRole('button', { name: 'αβ', exact: true })).toBeVisible()
  await expect(undo).toBeEnabled()
  await undo.click()
  await expect(page.getByRole('button', { name: 'Order API', exact: true })).toBeVisible()
  await expect(undo).toBeDisabled()
})

test('T16.1 composition left unconfirmed persists nothing', async ({ page, browserName }) => {
  await page.goto('/studio.html')
  const node = page.getByRole('button', { name: 'Order API', exact: true })
  await node.click()
  const label = page.getByLabel('Label', { exact: true })
  await label.focus()
  await label.fill('')
  const cdp = await compositionSession(page, browserName)
  await cdp.send('Input.imeSetComposition', { text: 'γδ', selectionStart: 2, selectionEnd: 2 })
  await cdp.send('Input.insertText', { text: 'γδ' })
  await cdp.detach()
  await page.getByRole('button', { name: 'Pan', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Order API', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
  await expect(page.getByText('No pending changes', { exact: true })).toBeVisible()
})

test('T16.1 labels stay literal text without executing markup', async ({ page, browserName }) => {
  await page.goto('/studio.html')
  const node = page.getByRole('button', { name: 'Order API', exact: true })
  await node.click()
  const label = page.getByLabel('Label', { exact: true })
  await label.focus()
  await label.fill('')
  const cdp = await compositionSession(page, browserName)
  await cdp.send('Input.insertText', { text: '<b onclick="alert(1)">X</b>' })
  await cdp.detach()
  await page.getByRole('button', { name: 'Apply label', exact: true }).click()
  const literal = page.getByRole('button', { name: '<b onclick="alert(1)">X</b>', exact: true })
  await expect(literal).toBeVisible()
  expect(await page.locator('svg b').count()).toBe(0)
  expect(await page.locator('[onclick]').count()).toBe(0)
  const dialogs: string[] = []
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.message())
    await dialog.dismiss()
  })
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Order API', exact: true })).toBeVisible()
  expect(dialogs).toEqual([])
})

test('T16.1 the JSON draft stays uncommitted while text is composed', async ({
  page,
  browserName,
}) => {
  await page.goto('/studio.html')
  await page.getByText('Document JSON', { exact: true }).click()
  const json = page.getByRole('textbox', { name: 'Document JSON' })
  await json.focus()
  const undo = page.getByRole('button', { name: 'Undo', exact: true })
  await expect(undo).toBeDisabled()
  const cdp = await compositionSession(page, browserName)
  await cdp.send('Input.imeSetComposition', { text: 'abc', selectionStart: 3, selectionEnd: 3 })
  await expect(undo).toBeDisabled()
  await cdp.send('Input.insertText', { text: 'abc' })
  await cdp.detach()
  await expect(undo).toBeDisabled()
  await page.getByRole('button', { name: 'Discard draft', exact: true }).click()
  await expect(undo).toBeDisabled()
  await expect(page.getByText('No pending changes', { exact: true })).toBeVisible()
})

test('portable composition event adapter preserves the draft until explicit apply', async ({
  page,
}) => {
  await page.goto('/studio.html')
  await page.getByRole('button', { name: 'Order API', exact: true }).click()
  const label = page.getByLabel('Label', { exact: true })
  await label.fill('')
  const composition = await compositionSession(page, 'dom-events')
  await composition.send('Input.imeSetComposition', {
    text: 'α',
    selectionStart: 1,
    selectionEnd: 1,
  })
  await composition.send('Input.imeSetComposition', {
    text: 'αβ',
    selectionStart: 2,
    selectionEnd: 2,
  })
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
  await composition.send('Input.insertText', { text: 'αβ' })
  await expect(label).toHaveValue('αβ')
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Apply label', exact: true }).click()
  await expect(page.getByRole('button', { name: 'αβ', exact: true })).toBeVisible()
})
