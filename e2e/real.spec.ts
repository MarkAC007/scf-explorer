import { test, expect } from '@playwright/test'
import { expectationsFromFile } from '../tests/helpers/expected'

const REAL = process.env.SCF_XLSX

test.skip(!REAL, 'SCF_XLSX not set — skipping real-workbook e2e')

// Every expectation below is read from the workbook under test, so this spec
// runs unchanged against any SCF release (2026.1.1, 2026.3, …).
test('full SCF workbook end-to-end', async ({ page }) => {
  const exp = expectationsFromFile(REAL!)
  const fmt = (n: number): string => n.toLocaleString('en-US')

  await page.goto('/app/#/upload')
  await page.setInputFiles('[data-testid="file-input"]', REAL!)
  await page.waitForURL('**/#/', { timeout: 180_000 })

  // Full-count assertions: controls and assessment objectives on the dashboard
  await expect(page.getByText(new RegExp(`Secure Controls Framework ${exp.version.replace(/\./g, '\\.')}`))).toBeVisible()
  await expect(page.getByText(fmt(exp.controlCount), { exact: true })).toBeVisible()
  await expect(page.getByText(fmt(exp.aoCount), { exact: true })).toBeVisible()

  // Detail across domains: the first control outside GOV, named by its domain
  const id = exp.controlIds.find((c) => !c.startsWith('GOV-')) ?? exp.controlIds[0]
  const domainName = exp.domainNames.get(id.split('-')[0])
  expect(domainName, `domain name for ${id}`).toBeTruthy()
  await page.goto(`/app/#/controls/${id}`)
  await expect(page.getByText(domainName!).first()).toBeVisible()
  await page.getByRole('tab', { name: /Mappings/ }).click()
  await expect(page.getByText(/refs$/).first()).toBeVisible()

  // Crosswalk ISO 27002 vs NIS2 (falls back to NIST when the release has no NIS2 column)
  await page.goto(`/app/#/crosswalk?fw=${exp.iso}&fwB=${exp.nis2 ?? exp.nist}`)
  await expect(page.getByText('shared SCF controls')).toBeVisible()
})
