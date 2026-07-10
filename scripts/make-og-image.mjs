// Render the 1200x630 Open Graph / Twitter card image with headless Chromium.
// Usage: node scripts/make-og-image.mjs  →  public/og-image.png
import { chromium } from '@playwright/test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../public/og-image.png')

const html = `<!doctype html><html><body style="margin:0">
<div style="width:1200px;height:630px;background:#1a2332;position:relative;
            font-family:'DejaVu Sans',sans-serif;color:#f7f8f6;overflow:hidden">
  <div style="position:absolute;left:80px;top:110px;bottom:110px;width:10px;background:#1f8377"></div>
  <div style="position:absolute;left:130px;top:150px;right:80px">
    <div style="font-family:'DejaVu Sans Mono',monospace;font-size:26px;letter-spacing:6px;
                color:#8fb8b2;text-transform:uppercase">Secure Controls Framework</div>
    <div style="font-size:96px;font-weight:bold;margin-top:18px;letter-spacing:-2px">
      SCF <span style="color:#2ea08f">Explorer</span>
    </div>
    <div style="font-size:32px;line-height:1.45;margin-top:28px;color:#c8cfd6;max-width:900px">
      Browse 1,400+ controls, crosswalk ~250 framework mappings, maturity criteria,
      risks and threats — 100% in your browser.
    </div>
    <div style="font-family:'DejaVu Sans Mono',monospace;font-size:24px;margin-top:44px;color:#8fb8b2">
      markac007.github.io/scf-explorer · open source · no uploads
    </div>
  </div>
</div></body></html>`

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
})
await page.setContent(html)
await page.screenshot({ path: OUT })
await page.close()
await browser.close()
console.log('og-image.png (1200x630)')
