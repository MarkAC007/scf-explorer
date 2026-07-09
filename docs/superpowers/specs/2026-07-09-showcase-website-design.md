# Showcase website (marketing front door) — design

**Date:** 2026-07-09 · **Status:** approved (mockup reviewed in visual companion)

## Goal

A beautiful single-page marketing site in front of the app that showcases features,
promotes the open-source project, and funnels visitors into the app — without touching
the app's functionality, licensing posture, or existing links.

## Architecture

Vite multi-page build, same repo, same CI:

- **`index.html` (root)** — the marketing page. Pure static HTML + hand-authored CSS
  (`src/landing/landing.css`), no React, no Tailwind utilities. Shares design tokens and
  @fontsource fonts (self-hosted; no font CDN).
- **`app/index.html`** — the app entry (loads `/src/main.tsx`). App URL becomes
  `…/scf-explorer/app/` (dev: `localhost:5173/app/`). Hash routes unchanged.
- **Legacy-link shim** — inline script in the marketing page `<head>`:
  redirect to `app/` + hash when (a) the URL carries an app hash (`#/…` — old share
  links and bookmarks), or (b) `display-mode: standalone` matches (installed PWA whose
  manifest still points at the root).
- **PWA** — manifest `start_url` and `scope` set to `app/`; installed app launches
  straight into the app and cannot navigate out to marketing. Marketing page is outside
  the SW scope's navigation concern; precache continues to cover both entries.

## Page structure (single scroll)

1. **Hero** — ink-900 field, faint registry-grid motif, Space Grotesk display headline
   ("The Secure Controls Framework, finally explorable."), pine **Open the app →** CTA,
   ghost **View on GitHub**, framework id-plate ticker (NIST/ISO/SOC 2/… "+240 more").
2. **How it works** — three steps: get the official SCF workbook → drop it in (parsed in
   a Web Worker, cached in IndexedDB) → explore everything.
3. **Feature vignettes** — alternating copy + hand-built mock browser frames with
   **invented placeholder data only** (licensing hard constraint: no SCF content, no
   screenshots): control detail w/ id-plate, crosswalk coverage bars, program scopes w/
   share link.
4. **Privacy pillar** — dark section, four proof cards: no backend / no accounts /
   local cache / works offline.
5. **Open source** — MIT pitch + GitHub card; attribution note: SCF content belongs to
   the SCF Council (CC BY-ND 4.0), app ships no SCF data, rendered verbatim.
6. **Closing CTA band (pine-700) + footer (ink-950)** — includes "Not affiliated with
   the SCF" note.

## Visual identity

Extends the app: ink/paper/pine tokens, rust only inside risk semantics, IBM Plex
Sans/Mono + Space Grotesk, `.id-plate`/`.eyebrow` motifs. CSS-only scroll reveals.

## Test & script impact

- e2e specs (`fixture`, `scope`, `real`) and scripts (`shots*.mjs`, `verify-ui-data.mjs`,
  `verify-live-v2.mjs`) move from `/#/…` to `/app/#/…`.
- New `e2e/landing.spec.ts`: landing renders, CTA href points at `app/`, legacy-hash
  redirect lands on the app route.
- Full gate before merge: vitest, lint, typecheck, build, fixture e2e. Parser untouched,
  so no dual-parser run needed.

## Rollout

Merge to main → CI deploys Pages. Post-deploy: confirm live landing + app URLs, and that
old share-link format still resolves.
