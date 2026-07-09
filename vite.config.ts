/// <reference types="vitest/config" />
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.GITHUB_PAGES ? '/scf-explorer/' : '/'

export default defineConfig({
  base,
  build: {
    rollupOptions: {
      input: {
        landing: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app/index.html'),
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'SCF Explorer',
        short_name: 'SCF Explorer',
        description:
          'Read-only viewer for the Secure Controls Framework — controls, ~250 framework mappings, maturity, risks and threats. 100% client-side.',
        // The installable app must open the app itself, never the marketing page.
        id: 'app/',
        start_url: 'app/',
        scope: 'app/',
        theme_color: '#1a2332',
        background_color: '#f7f8f6',
        display: 'standalone',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // MPA: the SPA-style fallback must resolve to the app entry, not the
        // marketing page, or offline hash-navigation would land on marketing.
        navigateFallback: base + 'app/index.html',
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
  },
})
