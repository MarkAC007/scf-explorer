import { test, expect } from '@playwright/test'

test('landing page renders with CTA into the app', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/SCF Explorer/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Secure Controls Framework',
  )
  const cta = page.locator('.hero .btn-primary')
  await expect(cta).toHaveAttribute('href', 'app/')
  await expect(page.getByText('CC BY-ND 4.0')).toBeVisible()

  await cta.click()
  await page.waitForURL('**/app/**')
})

test('legacy share links on the root redirect into the app', async ({ page }) => {
  await page.goto('/#/upload')
  await page.waitForURL('**/app/#/upload')
  await expect(page.getByTestId('file-input')).toBeAttached()
})
