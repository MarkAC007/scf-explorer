import { test, expect } from '@playwright/test'
import { join } from 'node:path'

const FIXTURE = join(import.meta.dirname, '../tests/fixtures/scf-fixture.xlsx')

test('build a scope → activate → app reshapes → share URL round trip', async ({
  page,
}) => {
  await page.goto('/#/upload')
  await page.setInputFiles('[data-testid="file-input"]', FIXTURE)
  await page.waitForURL('**/#/', { timeout: 60_000 })

  // Build a two-framework scope
  await page.getByRole('link', { name: 'Program', exact: true }).click()
  await page.locator('label[data-fw="nist-800-53-r5"] input').check()
  await page.locator('label[data-fw="iso-27002-2022"] input').check()
  await expect(page.getByText(/% of the SCF/)).toBeVisible()
  await expect(page.getByText(/Spine — required by every framework/)).toBeVisible()
  await expect(page.getByText(/distinct evidence artifacts/)).toBeVisible()

  // Activate it
  await page.getByPlaceholder('Scope name…').fill('ISO+NIST')
  await page.getByRole('button', { name: 'Activate' }).click()
  await expect(page.getByTestId('scope-chip')).toContainText('ISO+NIST')

  // Dashboard reshapes
  await page.getByRole('link', { name: 'Dashboard' }).click()
  await expect(page.getByText(/Viewing through scope/)).toBeVisible()

  // Controls browser filters to scope with escape hatch
  await page.getByRole('link', { name: 'Controls', exact: true }).click()
  const scoped = await page.getByTestId('control-count').textContent()
  await page.getByRole('checkbox', { name: /scope: ISO\+NIST/ }).click()
  await expect(page.getByTestId('control-count')).not.toHaveText(scoped!)
  const all = await page.getByTestId('control-count').textContent()
  expect(parseInt(all!)).toBeGreaterThan(parseInt(scoped!))

  // Control detail shows membership banner
  await page.goto('/#/controls/GOV-01')
  await expect(page.getByTestId('scope-banner')).toContainText(/In scope|Not in/)

  // Share URL round trip: fresh navigation with fw params seeds the builder
  await page.goto('/#/program?fw=nist-800-53-r5')
  await page.reload()
  await expect(page.getByTestId('selected-frameworks')).toContainText(/800-53/)

  // Deactivate via chip
  await page.getByRole('button', { name: 'Deactivate scope' }).click()
  await expect(page.getByTestId('scope-chip')).toHaveCount(0)
})
