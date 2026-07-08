# scf-explorer — Design

**Date:** 2026-07-08 · **Status:** Approved by Mark · **Repo:** MarkAC007/scf-explorer (public, MIT)

## Purpose

An open-source, read-only, feature-rich viewer for the Secure Controls Framework (SCF).
The user uploads the official SCF Excel workbook; the app turns it into a beautiful,
browsable web interface that showcases the full depth of SCF — controls, ~250 framework
mappings, per-control maturity criteria, risk and threat linkage, assessment objectives —
and promotes the adoption of meta-frameworks within organisations.

Explicitly out of scope: scoping, evidence collection/tracking, assessments, tenancy,
accounts, or any write capability. The Evidence Request List *sheet* is displayed as
read-only reference data; that is not an "evidence feature".

## Architecture

- **100% client-side static SPA.** No backend, no telemetry; workbook data never leaves
  the browser. Deployed to GitHub Pages via Actions; README documents a one-line
  static-server `docker run` for internal self-hosting.
- **Stack:** React 18 + Vite + TypeScript, Tailwind CSS, SheetJS (xlsx parse in a Web
  Worker), Dexie (IndexedDB cache), MiniSearch (client full-text search), TanStack
  Virtual (row/column virtualization), hash-based routing (React Router,
  `createHashRouter`) so every view is a shareable URL on static hosting.
- **Data flow:** drag-drop xlsx → Web Worker parses all sheets → normalized JSON model →
  IndexedDB cache (instant reload, "Replace workbook" action to swap versions) →
  in-memory stores + MiniSearch index feed the views.
- **App ships with zero SCF data bundled.** Users bring the workbook (guidance links to
  the SCF GitHub releases page). Not affiliated with the SCF Council; SCF content is the
  Council's, attributed per their licensing.

## Source data (SCF 2026.1.1 reference shape)

| Sheet | Shape | Content |
|---|---|---|
| SCF Domains & Principles | 33 × 7 | Domain, 3-letter ID, SCR principle, intent, control count |
| Authoritative Sources | ~254 × 8 | Geography, framework header, FDI, source org, name, URL, STRM link |
| SCF 2026.1 (main) | 1,468 × 369 | Per control: domain, name, SCF #, description, question, validation cadence, ERL refs, solutions × 5 org sizes, weighting (1–10), PPTDF, NIST CSF function, SCRM tiers 1–3, CMM levels 0–5 (full text each), SCF CORE baseline membership (SCRMS, AI ×2, ESP 1–3, Fundamentals, MA&D, Community), ~250 framework mapping columns, risk matrix (R-* cols), threat matrix (NT-*/MT-* cols), errata |
| Compensating Controls | 1,468 × 13 | Eligibility/risk note + up to 2 compensating controls with justification |
| Evidence Request List | ~303 × 7 | ERL #, area of focus, artifact name + description, control mappings |
| Assessment Objectives | ~5,783 × 22 | Per-control AOs: AO #, text, PPTDF, origin, rigor (AR), SDP/ODP, mapped assessment docs |
| Data Privacy Mgmt Principles | ~258 × 38 | DPMP principles → SCF controls with privacy-framework mappings |
| Threat Catalog | ~43 rows (headers at row 6) | Grouping, threat #, name, description, materiality considerations |
| Risk Catalog | ~40 rows (headers at row 6) | Grouping, risk #, name, description, NIST CSF function, materiality |

### Parser requirements (version tolerance)

- Locate sheets by fuzzy name match (`SCF 20*`, `*Threat Catalog*`, …) and columns by
  fuzzy header match (normalize whitespace/newlines, case-insensitive, prefix/keyword
  rules) — never fixed indices.
- Detect SCF version from the main sheet name; store in the model.
- Framework mapping columns are discovered dynamically: any column between the known
  core columns that matches an Authoritative Sources header becomes a framework; the
  rest are classified by pattern (Risk\*, Threat\*, errata, …). Unmapped columns are
  retained in a parse report, not dropped silently.
- Threat/Risk catalogs: skip preamble rows; header row detected by content.
- Cell conventions: multi-value cells split on newline; `x` marks in matrix columns;
  formula cells read as cached values.
- Output: `ScfModel` (versioned TypeScript types) + `ParseReport` (sheets found, columns
  mapped/unmapped, row counts, warnings). Parse failures degrade per-sheet, never
  all-or-nothing.

## Views

1. **Welcome/upload** — drag-drop or file picker; link to SCF releases for the file;
   parse progress; parse report summary; loads straight to Dashboard when a cached model
   exists.
2. **Dashboard** — headline stats (controls, frameworks, domains, risks, threats, AOs);
   domain grid (33 cards: ID, name, SCR principle, control count) linking into filtered
   browsing; SCF version + errata summary; the meta-framework pitch in one screen.
3. **Controls browser** — virtualized list/table; facets: domain, PPTDF, weighting
   range, NIST CSF function, CORE baseline, SCRM tier, "mapped to framework X";
   MiniSearch full-text across ID/name/description/question; sort by ID or weighting;
   CSV export of the filtered set.
4. **Control detail** — the centerpiece. Header: ID, name, domain, description,
   question, cadence, weighting, PPTDF badges, CSF function, baseline membership.
   Tabs: **Maturity** (CMM 0–5 ladder with per-control criteria), **Mappings**
   (frameworks grouped by geography/family, searchable, with per-framework reference
   lists), **Risks & Threats** (linked catalog entries rendered inline), **Assessment
   Objectives** (AO text + rigor), **Compensating Controls**, **Evidence** (linked ERL
   artifacts, read-only), **Solutions** (by org size band), errata note. Prev/next
   control navigation.
5. **Framework crosswalk** — pick one framework → coverage: mapped SCF controls, domain
   coverage %, reference-level detail, CSV export. Pick two → overlap analysis via SCF
   as Rosetta stone: shared controls, A-only, B-only, with counts and CSV export.
6. **Risk & Threat catalogs** — browsable lists with grouping, description, materiality;
   each entry lists its linked controls (reverse index from the main-sheet matrices).
7. **Baselines & sources** — CORE baseline and SCRM tier pre-filtered views with counts;
   Authoritative Sources directory (geography-grouped, external + STRM links).
8. **Privacy principles** — DPMP list: principle, description, linked controls.

## Non-functional

- **Performance:** parse ≤ ~15 s for the 3.6 MB workbook (worker, progress shown);
  post-cache cold load < 2 s; browsing interactions < 100 ms (virtualization +
  precomputed reverse indexes).
- **Maintainability:** parser isolated from UI behind `ScfModel`; each view a focused
  module; boring dependencies only.
- **Accessibility & polish:** keyboard-navigable lists/tabs, semantic HTML, responsive
  layout; distinctive, intentional visual design (frontend-design skill at build time) —
  not template-grade Tailwind defaults.
- **Error handling:** non-xlsx / wrong workbook → friendly rejection with guidance;
  partial sheet failures → gaps listed in parse report, rest of app functional;
  IndexedDB unavailable → in-memory fallback with notice.

## Testing

- **Vitest:** parser/normalizer against a fixture workbook (trimmed real slice committed
  to the repo, generated by a script from the real file — script committed, full
  workbook not); crosswalk/overlap logic; reverse-index builders; search config.
- **Playwright:** end-to-end smoke — upload real workbook (path via env var, skipped in
  CI if absent), assert dashboard stats, open a control, check maturity + mappings tabs,
  run a two-framework crosswalk. Fixture-workbook variant runs in CI.
- **CI (GitHub Actions):** lint, typecheck, unit tests, build, fixture e2e on push/PR;
  deploy to Pages on main.
- **Final gate:** headless-Chromium visual verify with the real 2026.1.1 workbook before
  declaring done.

## Milestones

1. Scaffold (Vite/React/TS/Tailwind/CI) + parser worker + model + fixture + unit tests.
2. Shell: routing, upload flow, IndexedDB cache, dashboard.
3. Controls browser + control detail (all tabs).
4. Crosswalk views + catalogs (risk/threat) + baselines/sources/privacy views.
5. Search, exports, polish (frontend-design pass), a11y, README/screenshots/licence,
   Pages deploy, real-workbook verify.
