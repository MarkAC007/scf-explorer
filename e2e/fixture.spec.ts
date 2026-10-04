import { test, expect } from '@playwright/test'
import { join } from 'node:path'
import { expectationsFromFile } from '../tests/helpers/expected'

const FIXTURE = join(import.meta.dirname, '../tests/fixtures/scf-fixture.xlsx')
const exp = expectationsFromFile(FIXTURE)

test('upload → browse → detail → crosswalk with the fixture workbook', async ({ page }) => {
  await page.goto('/app/#/upload')
  await expect(page.getByText('Drop the SCF workbook here')).toBeVisible()

  await page.setInputFiles('[data-testid="file-input"]', FIXTURE)
  await page.waitForURL('**/#/', { timeout: 60_000 })

  // Dashboard stats from the fixture slice
  await expect(page.getByText(exp.controlCount.toLocaleString('en-US'), { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Domains' })).toBeVisible()

  // Controls browser
  await page.getByRole('link', { name: 'Controls', exact: true }).click()
  await expect(page.getByText(new RegExp(`${exp.controlCount} controls`))).toBeVisible()
  // A control the workbook maps to NIST 800-53 R5 (GOV-01 is not, in every release)
  const id = exp.sampleMapped(exp.nist)
  await page.getByPlaceholder(/Search controls/).fill(id)
  await page.getByRole('link', { name: new RegExp(id) }).first().click()

  // Control detail: maturity default tab, then mappings
  await expect(page.getByText(/Level 5 — Continuously Improving/)).toBeVisible()
  await page.getByRole('tab', { name: /Mappings/ }).click()
  await expect(page.getByText(/refs$/).first()).toBeVisible()
  await expect(page.getByText(exp.rawMappingRefs(id, exp.nist)[0], { exact: false }).first()).toBeVisible()

  // Crosswalk overlap
  await page.goto(`/app/#/crosswalk?fw=${exp.iso}&fwB=${exp.nist}`)
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
