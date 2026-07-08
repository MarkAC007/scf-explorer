import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 180_000,
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
})
