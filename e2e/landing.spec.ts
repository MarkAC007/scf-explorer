import { test, expect } from '@playwright/test'

test('landing page renders with CTA into the app', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/SCF Explorer/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Secure Controls Framework',
  )
  const cta = page.locator('.hero .btn-primary')
  await expect(cta).toHaveAttribute('href', 'app/')
  await expect(page.getByText('CC BY-ND 4.0')).toBeVisible()

  // Hero demo video: present, poster-first, click-to-play, never autoplay.
  const video = page.locator('.hero video.hero-video')
  await expect(video).toBeVisible()
  await expect(video).toHaveAttribute('src', '/scf-explorer-demo.mp4')
  await expect(video).toHaveAttribute('poster', '/scf-explorer-demo-poster.jpg')
  await expect(video).toHaveAttribute('controls', '')
  await expect(video).not.toHaveAttribute('autoplay', /.*/)
  await expect(video).toHaveJSProperty('paused', true)
  const poster = await page.request.get('/scf-explorer-demo-poster.jpg')
  expect(poster.ok()).toBe(true)
  const mp4 = await page.request.head('/scf-explorer-demo.mp4')
  expect(mp4.ok()).toBe(true)

  await cta.click()
  await page.waitForURL('**/app/**')
})

test('legacy share links on the root redirect into the app', async ({ page }) => {
  await page.goto('/#/upload')
  await page.waitForURL('**/app/#/upload')
  await expect(page.getByTestId('file-input')).toBeAttached()
})
