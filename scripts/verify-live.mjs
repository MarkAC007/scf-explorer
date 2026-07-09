import { chromium } from '@playwright/test'

const URL = 'https://scfcontrolsexplorer.app/app/'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

await page.goto(URL + '#/upload')
await page.setInputFiles('[data-testid="file-input"]', '/home/mark/scf-releases/2026.1.1/Secure.Controls.Framework.SCF.-.2026.1.1.xlsx')
await page.waitForURL('**/#/', { timeout: 180000 })
const stats = await page.locator('.tabular-nums').allTextContents()
console.log('dashboard stats:', stats.slice(0, 6).join(' | '))

await page.goto(URL + '#/controls/GOV-01')
await page.waitForTimeout(800)
console.log('GOV-01 visible:', await page.getByText('Security, Compliance & Resilience Program').first().isVisible())

await page.goto(URL + '#/crosswalk?fw=iso-27002-2022&fwB=emea-eu-nis2')
await page.waitForTimeout(1000)
console.log('crosswalk shared visible:', await page.getByText('shared SCF controls').isVisible())
await page.screenshot({ path: '/tmp/scf-shots/live-crosswalk.png' })

// reload: IndexedDB cache should restore without re-upload
await page.goto(URL)
await page.waitForTimeout(1500)
console.log('cache restore, dashboard heading:', await page.getByRole('heading', { name: /Secure Controls Framework/ }).isVisible())

await browser.close()
