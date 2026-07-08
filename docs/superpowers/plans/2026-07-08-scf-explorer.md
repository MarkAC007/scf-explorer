# scf-explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build scf-explorer — a 100% client-side, read-only, feature-rich web viewer for the Secure Controls Framework workbook.

**Architecture:** React SPA (Vite, TypeScript, hash routing). A Web Worker parses the uploaded SCF xlsx with SheetJS into a normalized `ScfModel`, cached in IndexedDB via Dexie. Views read from an in-memory store (zustand) with precomputed reverse indexes and a MiniSearch full-text index. No backend; deployed to GitHub Pages.

**Tech Stack:** React 18, Vite 6, TypeScript 5, Tailwind CSS v4 (`@tailwindcss/vite`), SheetJS (`xlsx`), Dexie 4, zustand 5, MiniSearch 7, `@tanstack/react-virtual` 3, React Router 7 (`createHashRouter`), Vitest 3, Playwright.

## Global Constraints

- Read-only viewer: no scoping, no evidence collection, no accounts, no telemetry; workbook data never leaves the browser.
- Zero SCF data bundled in the repo or build output (fixture for tests is a trimmed derivative used only in tests; full workbook never committed).
- Parser locates sheets and columns by fuzzy header matching, never fixed indices; unmapped columns land in `ParseReport`, never silently dropped.
- Multi-value cells split on newline (`\n`); header normalization collapses all whitespace runs to single spaces, trims, case-insensitive compare.
- Reference workbook for local dev/tests: `/home/mark/scf-releases/2026.1.1/Secure.Controls.Framework.SCF.-.2026.1.1.xlsx` (env var `SCF_XLSX` for e2e).
- Every commit message uses conventional prefix (`feat:`, `test:`, `chore:`, `docs:`) and ends with the Claude co-author trailer.
- MIT licence; README states "not affiliated with the SCF Council".

## File Structure

```
scf-explorer/
├── index.html, package.json, vite.config.ts, tsconfig.json, eslint.config.js
├── .github/workflows/ci.yml            # lint+test+build+e2e(fixture); deploy Pages on main
├── scripts/make-fixture.mjs            # real xlsx -> tests/fixtures/scf-fixture.xlsx (trimmed)
├── src/
│   ├── main.tsx, App.tsx               # router + layout shell (sidebar nav, workbook status)
│   ├── model/types.ts                  # ScfModel + all entity types + ParseReport
│   ├── model/indexes.ts                # buildIndexes(): reverse maps + stats
│   ├── parser/headerMatch.ts           # normalizeHeader, findColumn, columnClassifier
│   ├── parser/parseWorkbook.ts         # orchestrator: sheet discovery -> per-sheet parsers
│   ├── parser/sheets/{domains,sources,mainSheet,catalogs,assessmentObjectives,erl,compensating,privacy}.ts
│   ├── parser/worker.ts                # postMessage({file}) -> progress events -> {model}
│   ├── store/db.ts                     # Dexie: table 'models', single row id='current'
│   ├── store/modelStore.ts             # zustand: model, indexes, search, load/replace/clear
│   ├── search/searchIndex.ts           # MiniSearch over controls
│   ├── lib/csv.ts                      # toCsv(rows) + download helper
│   ├── components/                     # StatCard, Badge, WeightBar, Tabs, FacetPanel,
│   │                                   # VirtualTable, MappingChips, EmptyState, ParseReportPanel
│   └── views/{UploadView,DashboardView,ControlsView,ControlDetailView,CrosswalkView,
│              RisksView,ThreatsView,BaselinesView,SourcesView,PrivacyView}.tsx
├── tests/                              # vitest specs mirror src/ paths
│   └── fixtures/scf-fixture.xlsx
└── e2e/{fixture.spec.ts,real.spec.ts}  # playwright
```

---

### Task 1: Scaffold + CI

**Files:** Create the tool config files above, `src/main.tsx`, `src/App.tsx` (placeholder heading), `.github/workflows/ci.yml`, `LICENSE` (MIT), `.gitignore`.

**Interfaces — Produces:** `npm run dev|build|test|lint` all working; CI workflow runs lint → typecheck → vitest → build.

- [ ] Step 1: `npm create vite@latest . -- --template react-ts`, then install deps: `xlsx dexie zustand minisearch @tanstack/react-virtual react-router-dom` and dev deps `tailwindcss @tailwindcss/vite vitest @vitest/coverage-v8 jsdom @testing-library/react eslint typescript-eslint playwright @playwright/test`.
- [ ] Step 2: Wire Tailwind v4 (`@import "tailwindcss"` in `src/index.css`, plugin in `vite.config.ts`), vitest config (`environment: 'jsdom'`), eslint flat config.
- [ ] Step 3: Sanity test `tests/smoke.test.ts` (`expect(1+1).toBe(2)`), run `npm test` → PASS; `npm run build` → succeeds.
- [ ] Step 4: CI workflow: on push/PR — `npm ci`, lint, `tsc --noEmit`, `vitest run`, build; `deploy` job on main using `actions/deploy-pages` with `base: '/scf-explorer/'` build. Commit `chore: scaffold vite react ts tailwind + ci`.

### Task 2: Model types + header matching

**Files:** Create `src/model/types.ts`, `src/parser/headerMatch.ts`, `tests/parser/headerMatch.test.ts`.

**Interfaces — Produces (used by every parser task):**

```ts
// types.ts (complete)
export interface Domain { id: string; name: string; principle: string; intent: string; controlCount: number }
export interface Framework { id: string; header: string; name: string; geography: string;
  source: string; url: string; strmUrl: string; fromSources: boolean }
export interface MaturityLevel { level: 0|1|2|3|4|5; title: string; text: string }
export interface Solution { sizeBand: string; text: string }
export interface Control {
  id: string; domainId: string; name: string; description: string; question: string;
  cadence: string; weighting: number | null; pptdf: string[]; csfFunction: string;
  scrmTiers: number[]; maturity: MaturityLevel[]; baselines: string[];
  solutions: Solution[]; erlIds: string[]; mappings: Record<string, string[]>;
  riskIds: string[]; threatIds: string[]; errata: string; row: number }
export interface Risk { id: string; grouping: string; name: string; description: string;
  csfFunction: string; materiality: string }
export interface Threat { id: string; grouping: string; name: string; description: string;
  materiality: string }
export interface AssessmentObjective { id: string; controlId: string; text: string;
  pptdf: string[]; origins: string[]; rigor: number | null; sdp: string; odp: string }
export interface ErlItem { id: string; areaOfFocus: string; artifact: string;
  description: string; controlIds: string[] }
export interface CompensatingOption { name: string; id: string; justification: string }
export interface CompensatingEntry { controlId: string; riskNote: string; options: CompensatingOption[] }
export interface PrivacyPrinciple { num: number; name: string; description: string;
  controlIds: string[]; mappings: Record<string, string[]> }
export interface BaselineDef { id: string; label: string }   // e.g. {id:'esp1', label:'ESP Level 1 — Foundational'}
export interface ParseReport { version: string; sheets: { name: string; matched: string; rows: number }[];
  unmappedColumns: { sheet: string; header: string }[]; warnings: string[] }
export interface ScfModel { version: string; sourceFileName: string; parsedAt: string;
  domains: Domain[]; controls: Control[]; frameworks: Framework[]; risks: Risk[]; threats: Threat[];
  assessmentObjectives: AssessmentObjective[]; erlItems: ErlItem[]; compensating: CompensatingEntry[];
  privacyPrinciples: PrivacyPrinciple[]; baselineDefs: BaselineDef[]; parseReport: ParseReport }
```

```ts
// headerMatch.ts (complete)
export const normalizeHeader = (h: unknown): string =>
  String(h ?? '').replace(/\s+/g, ' ').trim();
export const slugify = (h: string): string =>
  normalizeHeader(h).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** Find index of first header matching any of the given regexes (case-insensitive, on normalized text). */
export const findColumn = (headers: string[], ...patterns: RegExp[]): number =>
  headers.findIndex(h => patterns.some(p => p.test(normalizeHeader(h))));
```

- [ ] Step 1: Write failing tests: normalizeHeader collapses `"SCF\nControl"` → `"SCF Control"`; slugify `"NIST\n800-53\nR5"` → `"nist-800-53-r5"`; findColumn matches `/^scf #$/i` in a realistic header array and returns -1 when absent.
- [ ] Step 2: Run → FAIL. Implement. Run → PASS. Commit `feat: model types and header matching`.

### Task 3: Fixture generator

**Files:** Create `scripts/make-fixture.mjs`, `tests/fixtures/scf-fixture.xlsx` (generated).

**Interfaces — Produces:** fixture workbook with all 9 sheets; main sheet trimmed to header + all controls of domains GOV and AST (~50 rows) with ALL 369 columns; AOs/compensating/ERL/privacy filtered to those controls; catalogs/domains/sources kept whole.

- [ ] Step 1: Write `make-fixture.mjs` using `xlsx`: read `process.env.SCF_XLSX` or the reference path; for the main sheet keep rows where `SCF #` starts with `GOV-` or `AST-`; same filter on `SCF Control #`/`SCF #`/`SCF Control Mappings` for dependent sheets; write to `tests/fixtures/scf-fixture.xlsx`.
- [ ] Step 2: Run it; assert with a small node check that the fixture opens and sheet names match the original. Commit `test: add trimmed SCF fixture + generator`.

### Task 4: Simple-sheet parsers (domains, sources, catalogs)

**Files:** Create `src/parser/sheets/domains.ts`, `sources.ts`, `catalogs.ts`; tests mirroring each.

**Interfaces — Produces:**
```ts
parseDomains(ws: XLSX.WorkSheet): Domain[]
parseSources(ws: XLSX.WorkSheet): Framework[]      // id = slugify(SCF Column Header)
parseRiskCatalog(ws: XLSX.WorkSheet): Risk[]        // header row auto-detected: first row whose cell A normalizes to 'Risk Grouping'
parseThreatCatalog(ws: XLSX.WorkSheet): Threat[]
```
Catalog parsers scan rows 1–10 for the header row (cell containing `Risk Grouping`/`Threat Grouping`), read from there; grouping cells may be blank on continuation rows → carry forward last non-empty grouping.

- [ ] Step 1: Failing tests against fixture: 33 domains, `GOV` present with controlCount > 0; sources ≥ 200 with an entry whose header slug is `nist-800-53-r5`; risk catalog contains id `R-AC-1`; threat catalog contains `MT-1` and groupings carried forward onto continuation rows.
- [ ] Step 2: FAIL → implement (`XLSX.utils.sheet_to_json` with `header: 1`) → PASS → commit `feat: domain, sources, risk/threat catalog parsers`.

### Task 5: Main-sheet parser — core fields + column classification

**Files:** Create `src/parser/sheets/mainSheet.ts`, `tests/parser/mainSheet.test.ts`.

**Interfaces — Produces:**
```ts
interface MainSheetResult { controls: Control[]; discoveredFrameworkHeaders: string[];
  baselineDefs: BaselineDef[]; unmapped: string[] }
parseMainSheet(ws: XLSX.WorkSheet, knownFrameworks: Framework[]): MainSheetResult
```

Column classifier rules (applied to each normalized header, first match wins):
1. Core fields by regex: `/^scf domain$/i`, `/^scf control$/i`, `/^scf #$/i`, `/^secure controls framework \(scf\) control description$/i`, `/^conformity validation cadence$/i`, `/^evidence request list \(erl\) #$/i`, `/^scf control question$/i`, `/^relative control weighting$/i`, `/^pptdf applicability$/i`, `/^nist csf function grouping$/i`.
2. `/^possible solutions & considerations (.+?) bls firm size/i` → solution band (capture).
3. `/^scrm focus tier (\d)/i` → tier flag column.
4. `/^scr-cmm level (\d) (.+)$/i` → maturity level column (level, title).
5. `/^scf (community derived|scrms|core .+)$/i` → baseline column; `BaselineDef.id = slugify(match)`, label = normalized header without `SCF ` prefix.
6. `/^risk (r-[a-z]{2}-\d+)$/i` → risk matrix column (risk id uppercased).
7. `/^threat ((?:nt|mt)-\d+)$/i` → threat matrix column.
8. `/^errata/i` → errata.
9. `/^(minimum security requirements|identify (minimum compliance|discretionary security)|risk threat summary|control threat summary)/i` → derived/summary columns, skipped (recorded in report as intentionally skipped, not unmapped).
10. Otherwise → framework mapping column: match against `knownFrameworks` by slug; if absent, create fallback `Framework {fromSources:false, geography:'Unknown'}`; header recorded in `discoveredFrameworkHeaders`.

Cell handling: domainId = letters before `-` in `SCF #`; pptdf split on newline; scrmTiers from `x` marks; baseline membership = cell non-empty; risk/threat linkage = cell non-empty; mappings split on newline, dropping empty entries; weighting `Number()` or null; erlIds split on newline.

- [ ] Step 1: Failing tests on fixture: GOV-01 exists with domainId `GOV`, weighting 10, pptdf `['Process']`, csfFunction `Govern`, 6 maturity levels with non-empty text, `mappings['nist-800-53-r5']` contains `PM-01`, riskIds contain `R-AC-1`, scrmTiers `[1,2,3]`; controls count equals the fixture's GOV+AST row count; zero unmapped columns for 2026.1.1.
- [ ] Step 2: FAIL → implement → PASS → commit `feat: main sheet parser with dynamic column discovery`.

### Task 6: Remaining sheet parsers (AOs, ERL, compensating, privacy)

**Files:** Create `src/parser/sheets/assessmentObjectives.ts`, `erl.ts`, `compensating.ts`, `privacy.ts` + tests.

**Interfaces — Produces:**
```ts
parseAssessmentObjectives(ws): AssessmentObjective[]   // id=SCF AO #, controlId=SCF #, rigor=Number(AR)||null, origins split on newline
parseErl(ws): ErlItem[]                                // controlIds split on newline
parseCompensating(ws): CompensatingEntry[]             // options: pairs of (name,id,justification) where id !== 'N/A'
parsePrivacyPrinciples(ws): PrivacyPrinciple[]         // principle rows repeat per control: group by principle name, collect controlIds; mappings per framework column (same classifier fallback as main sheet)
```

- [ ] Step 1: Failing tests on fixture (counts > 0, GOV-01 has ≥ 1 AO with rigor ≥ 1; E-GOV-01 maps to GOV-01; compensating entry for GOV-01 has 0 options because it is `N/A`; privacy principle 1 named `Data Privacy by Design` linked to GOV-01).
- [ ] Step 2: FAIL → implement → PASS → commit `feat: AO, ERL, compensating, privacy parsers`.

### Task 7: Orchestrator + worker + indexes

**Files:** Create `src/parser/parseWorkbook.ts`, `src/parser/worker.ts`, `src/model/indexes.ts` + tests for parseWorkbook and indexes.

**Interfaces — Produces:**
```ts
parseWorkbook(data: ArrayBuffer, fileName: string): ScfModel
// sheet discovery: /^scf 20/i main; /domains & principles/i; /authoritative sources/i;
// /^compensating controls/i; /^evidence request list/i; /^assessment objectives/i;
// /data privacy mgmt principles/i; /threat catalog/i; /risk catalog/i
// version = main sheet name suffix, e.g. '2026.1'
// missing sheet -> warning in report, empty collection, continue

// worker.ts protocol:
// in:  { type:'parse', buffer: ArrayBuffer, fileName: string }
// out: { type:'progress', stage: string, pct: number } | { type:'done', model: ScfModel } | { type:'error', message: string }

// indexes.ts
export interface ModelIndexes {
  controlById: Map<string, Control>; domainById: Map<string, Domain>;
  frameworkById: Map<string, Framework>; riskById: Map<string, Risk>; threatById: Map<string, Threat>;
  controlsByDomain: Map<string, Control[]>; controlsByFramework: Map<string, Control[]>;
  controlsByRisk: Map<string, Control[]>; controlsByThreat: Map<string, Control[]>;
  controlsByBaseline: Map<string, Control[]>; aosByControl: Map<string, AssessmentObjective[]>;
  erlById: Map<string, ErlItem>; erlByControl: Map<string, ErlItem[]>;
  compensatingByControl: Map<string, CompensatingEntry>;
  stats: { controls: number; domains: number; frameworks: number; mappedFrameworks: number;
           risks: number; threats: number; aos: number; erlItems: number } }
export const buildIndexes = (m: ScfModel): ModelIndexes
```
`mappedFrameworks` counts frameworks with ≥1 control mapping (sources sheet lists some columns not present as columns).

- [ ] Step 1: Failing tests: parseWorkbook(fixture) returns version `2026.1`, all 9 sheets matched, warnings empty; buildIndexes round-trips (controlsByFramework for `nist-800-53-r5` includes GOV-01; controlsByRisk inverse of control.riskIds).
- [ ] Step 2: FAIL → implement → PASS → commit `feat: workbook orchestrator, worker, reverse indexes`.

### Task 8: Store, Dexie cache, upload flow, app shell

**Files:** Create `src/store/db.ts`, `src/store/modelStore.ts`, `src/views/UploadView.tsx`, layout in `App.tsx`, `src/components/ParseReportPanel.tsx`; tests for modelStore (jsdom + fake-indexeddb — add dev dep `fake-indexeddb`).

**Interfaces — Produces:**
```ts
// db.ts: Dexie db 'scf-explorer', table models: 'id' — row { id:'current', model: ScfModel }
// modelStore.ts (zustand):
interface ModelState {
  model: ScfModel | null; indexes: ModelIndexes | null; status: 'empty'|'loading'|'parsing'|'ready'|'error';
  progress: { stage: string; pct: number } | null; error: string | null;
  initFromCache(): Promise<void>;            // called once at boot
  parseFile(file: File): Promise<void>;      // spawns worker, saves to Dexie, builds indexes
  clearWorkbook(): Promise<void> }
```
UploadView: drag-drop zone + picker, link to https://github.com/securecontrolsframework/securecontrolsframework/releases, progress bar during parse, ParseReportPanel on completion, friendly error for non-xlsx / workbook without an `SCF 20*` sheet. App shell: left sidebar nav (Dashboard, Controls, Crosswalk, Risks, Threats, Baselines, Sources, Privacy), workbook status footer (version + Replace/Clear). Routes redirect to `#/upload` when status is `empty`.

- [ ] Step 1: Failing store tests (parseFile with fixture File → status ready, cache row present; initFromCache restores; clearWorkbook empties). Worker mocked in jsdom by calling parseWorkbook directly (inject via `parseFn` param on the store factory).
- [ ] Step 2: FAIL → implement → PASS. Manual `npm run dev` check of upload flow with the real workbook. Commit `feat: store, cache, upload flow, app shell`.

### Task 9: Dashboard

**Files:** Create `src/views/DashboardView.tsx`, `src/components/StatCard.tsx`; test `tests/views/dashboard.test.tsx` (render with fixture model, assert stats and 33 domain cards).

Content: stat row (controls, frameworks mapped, domains, risks, threats, AOs); SCF version badge; domain grid — card per domain: ID chip, name, SCR principle (2-line clamp), control count; click → `#/controls?domain=GOV`. Short "what is a meta-framework" intro paragraph.

- [ ] Steps: failing render test → implement → PASS → commit `feat: dashboard`.

### Task 10: Search + Controls browser

**Files:** Create `src/search/searchIndex.ts`, `src/views/ControlsView.tsx`, `src/components/{FacetPanel,VirtualTable,WeightBar,Badge}.tsx`, `src/lib/csv.ts`; tests for searchIndex, csv, and filter logic (extract `applyFilters(controls, filters): Control[]` into `src/views/controlsFilter.ts` for unit testing).

**Interfaces — Produces:**
```ts
// searchIndex.ts
buildSearch(controls: Control[]): MiniSearch   // fields: id, name, description, question; prefix+fuzzy(0.2)
// controlsFilter.ts
interface ControlFilters { domain?: string; pptdf?: string[]; csf?: string[]; baseline?: string;
  framework?: string; weightMin?: number; query?: string }
applyFilters(controls: Control[], f: ControlFilters, search: MiniSearch): Control[]
// csv.ts
toCsv(rows: Record<string, unknown>[]): string   // RFC4180 quoting
downloadCsv(name: string, rows: Record<string, unknown>[]): void
```
View: FacetPanel left (domain select, PPTDF checkboxes, CSF function checkboxes, baseline select, framework combobox, min-weight slider), search box top, virtualized rows (`@tanstack/react-virtual`): ID, name, domain chip, PPTDF badges, WeightBar, mapping count. Row click → `#/controls/GOV-01`. Filters serialize to query string. "Export CSV" of filtered set.

- [ ] Steps: failing tests (filters compose; search finds `GOV-01` by word from its description; csv quoting) → implement → PASS → manual check with real data → commit `feat: controls browser with facets, search, csv export`.

### Task 11: Control detail

**Files:** Create `src/views/ControlDetailView.tsx`, `src/components/{Tabs,MappingChips}.tsx`; test for the mapping-grouping helper `groupMappings(control, frameworkById): { geography: string; items: { framework: Framework; refs: string[] }[] }[]` in `src/views/controlDetail.helpers.ts`.

Layout: header (ID, name, domain link, weighting bar, PPTDF/CSF/cadence/baseline badges, description, control question callout). Tabs:
- **Maturity:** vertical ladder 0→5, level title + per-control text, colour ramp.
- **Mappings:** grouped by geography (General/US/EMEA/APAC/Americas) then framework; each shows refs as chips; count summary; text filter; framework name links to `#/crosswalk?fw=<id>`.
- **Risks & Threats:** two sections; each linked risk/threat rendered with name, description, materiality from catalog.
- **Assessment Objectives:** table of AO #, text, rigor badge, origins.
- **Compensating:** risk note + options, or eligibility note when none.
- **Evidence:** linked ErlItems (id, artifact, description) — read-only reference.
- **Solutions:** five size bands, bullet text preserved.
Prev/next control buttons (ordered by ID within full list); errata footnote when present.

- [ ] Steps: failing helper test (groups by geography, sorts, drops empty) → implement view → render test with fixture GOV-01 asserting tab content presence → PASS → commit `feat: control detail view`.

### Task 12: Crosswalk

**Files:** Create `src/views/CrosswalkView.tsx`, logic in `src/views/crosswalk.ts` + tests.

**Interfaces — Produces:**
```ts
interface Coverage { framework: Framework; controls: Control[]; domainCoverage: { domain: Domain; mapped: number; total: number }[] }
coverage(fwId: string, ix: ModelIndexes, model: ScfModel): Coverage
interface Overlap { shared: Control[]; onlyA: Control[]; onlyB: Control[] }
overlap(fwA: string, fwB: string, ix: ModelIndexes): Overlap
```
View: two framework comboboxes (grouped by geography). One selected → coverage: stats, domain coverage bars, control table with that framework's refs, CSV export (`SCF #, name, refs`). Both selected → overlap: three-column summary counts + Rosetta table (SCF #, name, refs in A, refs in B, membership), filterable to shared/only-A/only-B, CSV export. Copy explains the "SCF as Rosetta stone" meta-framework story.

- [ ] Steps: failing tests for coverage/overlap set logic on fixture → implement → PASS → manual real-data check (ISO 27001 vs NIS2) → commit `feat: framework crosswalk and overlap`.

### Task 13: Catalogs, baselines, sources, privacy views

**Files:** Create `src/views/{RisksView,ThreatsView,BaselinesView,SourcesView,PrivacyView}.tsx`; render tests for each with fixture model.

- RisksView/ThreatsView: grouped lists (grouping headers), each entry: id, name, description, materiality, linked-control count → expandable control list linking to detail.
- BaselinesView: card per `BaselineDef` + SCRM tiers with control counts → each links to pre-filtered ControlsView.
- SourcesView: table grouped by geography: framework name, source org, external link, STRM link, mapped-control count (0 for unmapped-column sources).
- PrivacyView: principle cards: name, description, linked controls, privacy-framework mapping chips.

- [ ] Steps: failing render tests → implement → PASS → commit `feat: catalog, baseline, sources, privacy views`.

### Task 14: Visual polish + a11y (frontend-design skill)

**Files:** Modify `src/index.css`, all views/components.

- [ ] Invoke frontend-design skill; establish distinctive direction (typography, palette anchored to a compliance-serious-but-modern identity, dark-mode-friendly), consistent spacing, empty states, loading skeletons, focus rings, keyboard nav through tabs/lists, `prefers-reduced-motion` respect.
- [ ] Verify in headless Chromium (screenshots of each view with real workbook). Commit `feat: visual design pass + a11y`.

### Task 15: Playwright e2e + CI wiring

**Files:** Create `playwright.config.ts`, `e2e/fixture.spec.ts`, `e2e/real.spec.ts`; modify CI.

- fixture.spec: serve build, upload `tests/fixtures/scf-fixture.xlsx` via file input, expect dashboard stats visible, open GOV-01, assert Maturity + Mappings tabs render, run crosswalk of two frameworks present in fixture, export CSV triggers download.
- real.spec: `test.skip(!process.env.SCF_XLSX)`; same flow plus full-count assertions (1,468 controls).
- CI: install browsers, run fixture spec after build.

- [ ] Steps: write specs → run locally (both) → green → commit `test: e2e fixture + real-workbook specs`.

### Task 16: README, screenshots, repo publish, Pages deploy

**Files:** Create `README.md`, `docs/screenshots/*.png`; modify CI for Pages.

- [ ] README: meta-framework pitch, features w/ screenshots, quickstart (public URL, local dev, `docker run -v $PWD/dist:/usr/share/nginx/html -p 8080:80 nginx` self-host), privacy note (data never leaves browser), SCF attribution + non-affiliation, licence.
- [ ] Create public GitHub repo `MarkAC007/scf-explorer` (`gh repo create --public`), push, confirm CI green and Pages deploy live.
- [ ] Final gate: headless-Chromium verify of the live Pages URL with the real 2026.1.1 workbook; capture screenshots into README. Commit `docs: readme + screenshots`.

## Self-review notes

- Spec coverage: every spec view has a task (dashboard T9, browser T10, detail T11, crosswalk T12, catalogs/baselines/sources/privacy T13, upload/report T8); parser tolerance in T5 rules 1–10 + T7 discovery; non-functionals in T14/T15; deploy/licensing in T16.
- Types referenced in later tasks are all defined in Task 2/7 Produces blocks.
- Playwright real-workbook run uses `SCF_XLSX` env var per global constraints.
