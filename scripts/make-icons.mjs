// Render the app icon set for the PWA manifest with headless Chromium.
// Usage: node scripts/make-icons.mjs  →  public/icons/*.png
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../public/icons')
mkdirSync(OUT, { recursive: true })

// pad: extra safe-zone around the mark (maskable icons need ~20% padding)
const html = (size, { pad = 0, radius = 0.22 } = {}) => {
  const inner = size - pad * 2
  return `<!doctype html><html><body style="margin:0">
  <div style="width:${size}px;height:${size}px;background:${pad ? '#1a2332' : 'transparent'};
              display:flex;align-items:center;justify-content:center">
    <div style="width:${inner}px;height:${inner}px;background:#1a2332;
                border-radius:${pad ? 0 : Math.round(size * radius)}px;
                display:flex;align-items:center;justify-content:center;position:relative">
      <div style="position:absolute;left:${Math.round(inner * 0.17)}px;
                  top:${Math.round(inner * 0.28)}px;bottom:${Math.round(inner * 0.28)}px;
                  width:${Math.max(3, Math.round(inner * 0.055))}px;background:#1f8377"></div>
      <span style="font-family:'DejaVu Sans Mono',monospace;font-weight:bold;
                   color:#f7f8f6;font-size:${Math.round(inner * 0.3)}px;
                   letter-spacing:${Math.round(inner * 0.01)}px;
                   margin-left:${Math.round(inner * 0.1)}px">SCF</span>
    </div>
  </div></body></html>`
}

const browser = await chromium.launch()
const shots = [
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['icon-maskable-512.png', 512, { pad: 60 }],
  ['apple-touch-icon.png', 180, { pad: 0, radius: 0 }],
]
for (const [name, size, opts] of shots) {
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  })
  await page.setContent(html(size, opts))
  await page.screenshot({ path: join(OUT, name), omitBackground: !opts.pad })
  await page.close()
  console.log(`${name} (${size}x${size})`)
}
await browser.close()
