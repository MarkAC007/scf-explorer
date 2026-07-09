# SCF Explorer

Open-source, read-only, 100% client-side viewer for the Secure Controls Framework (SCF).
User uploads the official SCF xlsx; the app parses it in a Web Worker, caches the model in
IndexedDB, and renders controls, ~250 framework mappings, maturity levels, risks/threats,
assessment objectives, evidence references, and named "program scopes".

- **Repo:** github.com/MarkAC007/scf-explorer (public, MIT) · owner Mark Almeida-Cardy
- **Live:** https://markac007.github.io/scf-explorer/ (GitHub Pages, deployed by CI on main)
- **Design docs:** `docs/superpowers/specs/` (v1 design, program-scopes v2), plans in `docs/superpowers/plans/`

## Hard constraints — never violate

1. **CC BY-ND 4.0 licensing:** the SCF content is the Council's. NEVER commit SCF data to
   the repo — not even trimmed slices, fixtures, or JSON exports of it. Render content
   verbatim only; no modified/derived SCF material may be distributed. The test fixture is
   gitignored and generated on demand (see below). Git history was rewritten once to purge
   an early fixture; keep it clean.
2. **Read-only viewer:** no evidence collection/tracking, no accounts, no telemetry, no
   backend. Workbook data never leaves the browser. Scopes/share-links carry framework IDs
   only, never data.
3. **SheetJS is pinned to the vendor CDN tarball** (`https://cdn.sheetjs.com/xlsx-0.20.3/...`)
   because the npm `xlsx` package ships old code with unfixed advisories. Don't "upgrade"
   it back to the npm registry version.

## Commands

```bash
npm run dev / build / preview     # Vite; build runs tsc -b first
npm test                          # vitest (jsdom); integrity suite auto-skips without env
npm run lint                      # oxlint (NOT eslint)
npm run typecheck                 # tsc -b --noEmit
npx playwright test e2e/fixture.spec.ts e2e/scope.spec.ts        # fixture e2e (CI runs these)
SCF_XLSX=~/scf-releases/2026.1.1/Secure.Controls.Framework.SCF.-.2026.1.1.xlsx \
  npx playwright test e2e/real.spec.ts                           # full-workbook e2e (local only)
node scripts/make-fixture.mjs     # regen tests/fixtures/scf-fixture.xlsx (GOV+AST slice)
```

Test fixture: `tests/fixtures/scf-fixture.xlsx` is **gitignored**. Locally it's generated
from `~/scf-releases/<version>/` (override with `SCF_XLSX`). CI downloads the official
release (sha256-pinned in `.github/workflows/ci.yml`) and derives it at test time.

## Data-integrity verification (the "dual-parser" workflow)

An independent Python parser cross-checks the app's SheetJS pipeline against the source
workbook — counts, per-framework tallies, and per-record content hashes for every control
and supporting sheet. Use it after any parser change or when a new SCF version lands:

```bash
/home/mark/.venvs/scfexplore/bin/python3 scripts/ground-truth.py > /tmp/scf-ground-truth.json
# (venv has openpyxl; script defaults to the 2026.1.1 path, override with SCF_XLSX)
SCF_XLSX=<workbook> GROUND_TRUTH=/tmp/scf-ground-truth.json npx vitest run tests/integrity
npm run build && node scripts/verify-ui-data.mjs   # UI layer vs ground truth (headless Chromium)
```

Other scripts: `shots.mjs` / `shots-program.mjs` (screenshots vs local build),
`verify-live-v2.mjs` (drives the live Pages site with the real workbook), `make-icons.mjs`
(PWA icon set).

## Architecture map

```
src/parser/       parseWorkbook.ts (sheet discovery + orchestration), worker.ts,
                  headerMatch.ts (normalize/slugify/findColumn), sheets/*.ts per-sheet parsers
src/model/        types.ts (ScfModel etc.), indexes.ts (reverse indexes + stats)
src/store/        db.ts (Dexie: models v1, scopes v2), modelStore.ts (zustand, worker glue)
src/scope/        scopeMath.ts (pure fns, unit-tested), scopeStore.ts (scopes CRUD + active)
src/views/        one file per route; controlsFilter.ts / crosswalk.ts / controlDetail.helpers.ts
                  hold testable logic extracted from views
src/components/   Badge, WeightBar, Tabs, StatCard, CatalogList, ParseReportPanel, ...
src/search/       MiniSearch config
e2e/              fixture.spec (CI), scope.spec (CI), real.spec (SCF_XLSX-gated)
tests/            vitest suites mirroring src/; tests/integrity/ = dual-parser cross-check
```

Routing is hash-based (`createHashRouter`) for static hosting. Layout is an app-frame:
root `h-dvh`, `<main>` is the scroll container (footers stay pinned; route changes reset
`main` scroll explicitly).

## Parser invariants (each one was a real bug — don't regress)

- Sheets and columns are found by **fuzzy header match**, never fixed indices. Unknown
  columns go to the ParseReport, never silently dropped.
- `slugify` maps `+` → `-plus` so "GovRAMP Low+" doesn't collide with "GovRAMP Low".
- Weighting **0 is a legitimate value** (TDA-11.2); don't use `Number(x) || null`.
- Privacy principle numbers are **hierarchical strings** ("1.10" ≠ 1.1); never coerce to Number.
- Evidence (ERL) links are indexed as the **union of both directions** (control→ERL cell and
  ERL sheet→control mappings) because the source workbook disagrees on ~22 controls — see
  `docs/scf-errata-erl-crossrefs.md` (verified against 2026.1.1 AND 2026.2).
- modelStore boots in `'loading'` (not `'empty'`) so deep links / share URLs aren't
  redirected to /upload before the IndexedDB cache check completes.

## Design identity

Ink sidebar rail (`ink-900`) + paper field + single pine accent; rust reserved for risk
semantics. IBM Plex Sans/Mono + Space Grotesk (display). Custom utilities in
`src/index.css`: `.id-plate` (control-ID registry plate), `.eyebrow`. Tailwind v4 via
`@tailwindcss/vite` — tokens live in `@theme` in index.css, no tailwind.config.

## Known open items

- **2026.2 compat:** SCF renamed the sources sheet "Authoritative Sources" → "Focal
  Documents"; `parseWorkbook.ts` pattern `/authoritative sources/i` won't match it, so that
  sheet degrades to a parse-report warning (frameworks fall back to unmapped-column
  metadata). Fix the pattern + re-run the dual-parser verification against
  `~/scf-releases/2026.2/secure-controls-framework-scf-2026-2.xlsx` before claiming support.
- Errata note `docs/scf-errata-erl-crossrefs.md` is ready to send to SCF support (Mark's call).
- SourcesView render test has a 15s timeout (250 rows under parallel vitest load) — timing,
  not data; don't "fix" by weakening assertions.

## Conventions

- Conventional-prefix commits (`feat:`/`fix:`/`test:`/`docs:`/`chore:`) with the Claude
  co-author trailer; repo-local git identity is already set.
- TDD: failing test first for parser/logic changes; render tests for views; e2e for flows.
- Before claiming done: `npm test && npm run lint && npm run typecheck && npm run build`,
  fixture e2e, and for parser changes the dual-parser integrity suite.
- Any push to main auto-deploys to Pages after CI (lint → typecheck → vitest → build →
  fixture e2e). The service worker caches aggressively — verify live changes with a refresh
  or `verify-live-v2.mjs`.
