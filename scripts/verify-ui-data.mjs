// UI data-integrity check: what the rendered app shows vs independent ground truth.
// Usage: node scripts/verify-ui-data.mjs   (needs dist/ built and ground-truth JSON)
import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'

const GT = JSON.parse(readFileSync(process.env.GROUND_TRUTH ?? '/tmp/scf-ground-truth.json', 'utf8'))
const XLSX = process.env.SCF_XLSX ?? '/home/mark/scf-releases/2026.1.1/Secure.Controls.Framework.SCF.-.2026.1.1.xlsx'

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' }
const server = createServer((req, res) => {
  let p = join('dist', (req.url ?? '/').split('?')[0])
  if (!existsSync(p) || p === 'dist/') p = 'dist/index.html'
  res.setHeader('content-type', MIME[extname(p)] ?? 'application/octet-stream')
  res.end(readFileSync(p))
}).listen(4196)

let pass = 0
let fail = 0
const check = (label, got, want) => {
  const ok = String(got) === String(want)
  if (ok) pass++
  else fail++
  console.log(`${ok ? '✓' : '✗'} ${label}: UI=${got} truth=${want}`)
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:4196/app/#/upload')
await page.setInputFiles('[data-testid="file-input"]', XLSX)
await page.waitForURL('**/#/', { timeout: 120000 })

// --- Dashboard stats vs ground truth ---
const stat = async (label) => {
  const card = page.locator('div.rounded-lg', { hasText: new RegExp(`^[\\d,]+${label}$`) }).first()
  return (await card.locator('div').first().textContent())?.replace(/,/g, '')
}
check('controls', await stat('Controls'), GT.mainSheet.controls)
check('mapped frameworks', await stat('Frameworks mapped'), GT.mainSheet.mappedFrameworks)
check('domains', await stat('Domains'), GT.domains.count)
check('risks', await stat('Risks'), GT.risks.count)
check('threats', await stat('Threats'), GT.threats.count)
check('assessment objectives', await stat('Assessment objectives'), GT.aos.count)

// --- Parse report is clean ---
await page.goto('http://localhost:4196/app/#/upload')
await page.waitForTimeout(400)
check('parse report clean', await page.getByText('✓ clean').isVisible(), true)

// --- Sample control details rendered vs truth ---
for (const id of ['GOV-01', 'IAC-01', 'TPM-01']) {
  const t = GT.samples[id]
  await page.goto(`http://localhost:4196/app/#/controls/${id}`)
  await page.waitForTimeout(400)
  const desc = (await page.locator('header p').first().textContent())?.trim()
  check(`${id} description exact`, desc === t.description.replace(/\s+/g, ' ').trim() || desc === t.description, true)
  const wTitle = await page.locator(`[title^="Relative control weighting"]`).first().getAttribute('title')
  check(`${id} weighting`, wTitle?.match(/(\d+)\/10/)?.[1], t.weighting)
  const mapTab = await page.getByRole('tab', { name: /Mappings/ }).textContent()
  check(`${id} mapped framework count`, mapTab?.match(/(\d+)/)?.[1], t.mappingFrameworkCount)
  const rtTab = await page.getByRole('tab', { name: /Risks & Threats/ }).textContent()
  check(`${id} risk+threat links`, rtTab?.match(/(\d+)/)?.[1], t.riskIds.length + t.threatIds.length)
  const evTab = await page.getByRole('tab', { name: /Evidence/ }).textContent()
  check(`${id} evidence links (union)`, evTab?.match(/(\d+)/)?.[1], t.erlLinked.length)
}

// --- Weighting-0 control renders (regression for TDA-11.2) ---
await page.goto('http://localhost:4196/app/#/controls/TDA-11.2')
await page.waitForTimeout(400)
const w0 = await page.locator('[title^="Relative control weighting"]').first().getAttribute('title')
check('TDA-11.2 weighting 0 shown', w0?.includes('0/10'), true)

// --- Privacy principles count ---
await page.goto('http://localhost:4196/app/#/privacy')
await page.waitForTimeout(600)
check('privacy principles rendered', await page.locator('section.rounded-lg').count(), GT.privacy.principles)

// --- Risk / threat catalogs render every entry ---
await page.goto('http://localhost:4196/app/#/risks')
await page.waitForTimeout(600)
let ids = await page.locator('span.inline-block').allTextContents()
check('risk entries rendered', ids.filter((x) => /^R-/.test(x)).length, GT.risks.count)
await page.goto('http://localhost:4196/app/#/threats')
await page.waitForTimeout(600)
ids = await page.locator('span.inline-block').allTextContents()
check('threat entries rendered', ids.filter((x) => /^(NT|MT)-/.test(x)).length, GT.threats.count)

// --- Controls browser shows full count; GovRAMP Low vs Low+ now distinct ---
await page.goto('http://localhost:4196/app/#/controls')
await page.waitForTimeout(600)
check('browser control count', (await page.getByTestId('control-count').textContent())?.replace(/[^\d]/g, ''), GT.mainSheet.controls)
const fwOptions = await page.locator('#f-framework option').allTextContents()
check('GovRAMP Low listed', fwOptions.some((o) => /GovRAMP.*Low(?!\+)/.test(o)), true)
check('GovRAMP Low+ listed separately', fwOptions.some((o) => /Low\+/.test(o)), true)
check('framework filter options', fwOptions.length - 1, GT.mainSheet.mappedFrameworks)

console.log(`\n${pass} passed, ${fail} failed`)
await browser.close()
server.close()
process.exit(fail ? 1 : 0)
