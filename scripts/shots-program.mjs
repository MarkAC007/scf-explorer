import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, extname } from 'node:path'

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' }
const server = createServer((req, res) => {
  let p = join('dist', (req.url ?? '/').split('?')[0])
  if (!existsSync(p) || p === 'dist/') p = 'dist/index.html'
  res.setHeader('content-type', MIME[extname(p)] ?? 'application/octet-stream')
  res.end(readFileSync(p))
}).listen(4198)

mkdirSync('/tmp/scf-shots', { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:4198/#/upload')
await page.setInputFiles('[data-testid="file-input"]', '/home/mark/scf-releases/2026.1.1/Secure.Controls.Framework.SCF.-.2026.1.1.xlsx')
await page.waitForURL('**/#/', { timeout: 120000 })

await page.goto('http://localhost:4198/#/program?fw=iso-27001-2022&fw=emea-eu-nis2&fw=aicpa-tsc-2017-2022-used-for-soc-2')
await page.reload()
await page.waitForSelector('[data-testid="selected-frameworks"]', { timeout: 30000 })
await page.waitForTimeout(1500)
await page.screenshot({ path: '/tmp/scf-shots/7-program.png' })
await page.evaluate(() => window.scrollTo(0, 1300))
await page.waitForTimeout(400)
await page.screenshot({ path: '/tmp/scf-shots/8-program-shape.png' })
console.log('scope size text:', await page.locator('.border-pine-300.bg-pine-50').first().textContent())
await browser.close()
server.close()
