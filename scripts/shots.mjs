import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, extname } from 'node:path'

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' }
const server = createServer((req, res) => {
  let p = join('dist', (req.url ?? '/').split('?')[0])
  if (!existsSync(p) || p === 'dist/') p = 'dist/index.html'
  res.setHeader('content-type', MIME[extname(p)] ?? 'application/octet-stream')
  res.end(readFileSync(p))
}).listen(4199)

mkdirSync('/tmp/scf-shots', { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:4199/#/upload')
await page.screenshot({ path: '/tmp/scf-shots/1-upload.png' })

await page.setInputFiles('[data-testid="file-input"]', '/home/mark/scf-releases/2026.1.1/Secure.Controls.Framework.SCF.-.2026.1.1.xlsx')
await page.waitForURL('**/#/', { timeout: 120000 })
await page.waitForTimeout(1000)
await page.screenshot({ path: '/tmp/scf-shots/2-dashboard.png', fullPage: false })

await page.goto('http://localhost:4199/#/controls')
await page.waitForTimeout(800)
await page.screenshot({ path: '/tmp/scf-shots/3-controls.png' })

await page.goto('http://localhost:4199/#/controls/GOV-01')
await page.waitForTimeout(600)
await page.screenshot({ path: '/tmp/scf-shots/4-detail.png' })

await page.goto('http://localhost:4199/#/crosswalk?fw=iso-27002-2022&fwB=emea-eu-nis2')
await page.waitForTimeout(800)
await page.screenshot({ path: '/tmp/scf-shots/5-crosswalk.png' })

await page.goto('http://localhost:4199/#/risks')
await page.waitForTimeout(500)
await page.screenshot({ path: '/tmp/scf-shots/6-risks.png' })

console.log('stats text:', await page.evaluate(() => document.title))
await browser.close()
server.close()
