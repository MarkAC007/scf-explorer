import { test, expect } from '@playwright/test'

const REAL = process.env.SCF_XLSX

test.skip(!REAL, 'SCF_XLSX not set — skipping real-workbook e2e')

test('full SCF 2026.1.1 workbook end-to-end', async ({ page }) => {
  await page.goto('/#/upload')
  await page.setInputFiles('[data-testid="file-input"]', REAL!)
  await page.waitForURL('**/#/', { timeout: 180_000 })

  // Full-count assertions
  await expect(page.getByText('1,468')).toBeVisible()
  await expect(page.getByText('5,776')).toBeVisible()

  // Detail across domains
  await page.goto('/#/controls/IAC-01')
  await expect(page.getByText(/Identity & Access Management/).first()).toBeVisible()
  await page.getByRole('tab', { name: /Mappings/ }).click()
  await expect(page.getByText(/refs$/).first()).toBeVisible()

  // Crosswalk ISO 27002 vs NIS2
  await page.goto('/#/crosswalk?fw=iso-27002-2022&fwB=emea-eu-nis2')
  await expect(page.getByText('shared SCF controls')).toBeVisible()
})
