import { chromium } from '@playwright/test'

const URL = 'https://scfcontrolsexplorer.app/app/'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

await page.goto(URL + '#/upload')
console.log('attribution line:', await page.getByText(/CC BY-ND 4.0/).isVisible())
await page.setInputFiles('[data-testid="file-input"]', '/home/mark/scf-releases/2026.1.1/Secure.Controls.Framework.SCF.-.2026.1.1.xlsx')
await page.waitForURL('**/#/', { timeout: 180000 })

// footer
console.log('footer:', await page.getByText('Developed by Mark Almeida-Cardy').isVisible())

// build + activate a scope on the live site
await page.getByRole('link', { name: 'Program', exact: true }).click()
await page.locator('label[data-fw="iso-27001-2022"] input').check()
await page.locator('label[data-fw="emea-eu-nis2"] input').check()
console.log('scope box:', (await page.locator('.border-pine-300.bg-pine-50').first().textContent())?.trim())
await page.getByPlaceholder('Scope name…').fill('ISO+NIS2')
await page.getByRole('button', { name: 'Activate' }).click()
await page.waitForTimeout(500)
console.log('chip:', (await page.getByTestId('scope-chip').textContent())?.replace(/\s+/g, ' ').trim())

// scoped dashboard + evidence rollup
await page.getByRole('link', { name: 'Dashboard' }).click()
console.log('scoped dashboard:', await page.getByText(/Viewing through scope/).isVisible())
await page.goto(URL + '#/program')
await page.waitForTimeout(800)
console.log('evidence rollup:', (await page.getByText(/distinct evidence artifacts/).textContent())?.trim())

// PWA manifest linked
const manifest = await page.evaluate(() => document.querySelector('link[rel="manifest"]')?.getAttribute('href'))
console.log('manifest link:', manifest)
const swReady = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker?.getRegistration()
  return !!reg
})
console.log('service worker registered:', swReady)

await page.screenshot({ path: '/tmp/scf-shots/live-program.png' })
await browser.close()
