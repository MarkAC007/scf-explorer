import { test, expect } from '@playwright/test'
import { join } from 'node:path'

const FIXTURE = join(import.meta.dirname, '../tests/fixtures/scf-fixture.xlsx')

test('upload → browse → detail → crosswalk with the fixture workbook', async ({ page }) => {
  await page.goto('/app/#/upload')
  await expect(page.getByText('Drop the SCF workbook here')).toBeVisible()

  await page.setInputFiles('[data-testid="file-input"]', FIXTURE)
  await page.waitForURL('**/#/', { timeout: 60_000 })

  // Dashboard stats from the fixture slice
  await expect(page.getByText('101')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Domains' })).toBeVisible()

  // Controls browser
  await page.getByRole('link', { name: 'Controls', exact: true }).click()
  await expect(page.getByText(/101 controls/)).toBeVisible()
  await page.getByPlaceholder(/Search controls/).fill('GOV-01')
  await page.getByRole('link', { name: /GOV-01/ }).first().click()

  // Control detail: maturity default tab, then mappings
  await expect(page.getByText(/Level 5 — Continuously Improving/)).toBeVisible()
  await page.getByRole('tab', { name: /Mappings/ }).click()
  await expect(page.getByText(/NIST SP 800-53/i).first()).toBeVisible()

  // Crosswalk overlap
  await page.goto('/app/#/crosswalk?fw=iso-27002-2022&fwB=nist-800-53-r5')
  await expect(page.getByText('shared SCF controls')).toBeVisible()

  // CSV export produces a download
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toContain('scf-overlap')
})

test('rejects a non-SCF xlsx politely', async ({ page }) => {
  await page.goto('/app/#/upload')
  await page.setInputFiles('[data-testid="file-input"]', {
    name: 'nonsense.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.from('not really a workbook'),
  })
  await expect(page.getByText(/does not look like the SCF|Upload the official SCF/)).toBeVisible()
})
