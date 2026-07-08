# Program scopes (v2) — Design

**Date:** 2026-07-08 · **Status:** Approved by Mark · **Mode:** Global scope

## Purpose

Let a practitioner pick the frameworks their organisation must satisfy, save that
selection as a named *scope*, and see the shape of the compliance program it implies —
including read-only rollups of the evidence artifacts and solution guidance connected to
the in-scope controls. Everything stays derived and read-only: no evidence collection,
no status tracking.

## Model

```ts
interface ScopeDef {
  id: string            // slug/uuid
  name: string
  frameworkIds: string[] // ids from the framework registry (frameworks only, per Mark)
  createdAt: string
  scfVersion: string     // workbook version the scope was authored against
}
```

- A scope's control set = union of `controlsByFramework` over its frameworks, held as a
  `Set<string>` of control IDs. No second model copy; views intersect with the set.
- Saved scopes live in Dexie (`scopes` table, db version 2). The active scope id
  persists in `localStorage` and survives reloads.
- Share URL: `#/program?fw=<id>&fw=<id>…` — a colleague with their own workbook copy
  opens it as an "unsaved shared scope" they can activate or save. URL carries only
  framework ids, never data.
- Empty scope: savable, not activatable.
- Workbook replace: every saved scope is revalidated; framework ids missing from the
  new model are dropped with a visible notice on the scope card (never silently).

## Scope math (pure functions, unit-tested)

- `scopeControlIds(fwIds, ix)` — union set.
- `marginalAdds(fwIds, ix)` — per selected framework, # controls no other selected
  framework covers ("NIS2 adds only N controls you don't already have").
- `spineEdge(fwIds, ix)` — spine = controls demanded by ALL selected frameworks;
  edges = controls demanded by exactly one.
- `domainCoverage(set, ix, model)` — per-domain scoped/total.
- `weightingProfile(set, ix)` / `pptdfSplit(set, ix)` — aggregations for Shape.
- `evidenceRollup(set, ix)` — deduped ERL artifacts linked from in-scope controls,
  grouped by area of focus, each with its driving in-scope controls.
- `solutionsRollup(set, ix, sizeBand)` — solution guidance of in-scope controls for the
  chosen org-size band, grouped by domain.

## Views

**Program** (new nav entry) with three sections:
1. **Builder** — framework picker grouped by geography with per-framework control
   counts; running union total; marginal contribution per selected framework; save /
   rename / delete / duplicate / copy-share-link / activate; saved-scope list.
2. **Shape** — total controls & % of SCF, per-domain coverage bars (scoped vs full),
   weighting profile, PPTDF split, spine/edge counts with drill-in lists. CSV export.
3. **Rollups** — Evidence (deduped artifacts by area of focus, driving controls) and
   Solutions (org-size band selector, grouped by domain). Both CSV-exportable,
   read-only.

**Global behavior when a scope is active:**
- Sidebar chip: `◉ <name> — N controls`, click-through to Program, ✕ to deactivate.
- Dashboard: scoped stats with full counts ghosted; domain cards show scoped counts.
- Controls browser: filtered to scope with a "show all" escape hatch.
- Control detail: membership banner — "In scope via <frameworks>" or "Not in current
  scope".
- Risk/Threat catalogs: linked-control counts show scoped/total.
- Crosswalk: deliberately unscoped (comparison instrument) but gains "add to scope"
  per framework.

## Testing

- Unit: all scope-math functions on the fixture; scope store CRUD + persistence +
  revalidation (fake-indexeddb).
- Render: Program view sections; scoped dashboard ghosting; detail banner.
- e2e (fixture): build scope → activate → dashboard/controls reshape → share-URL
  round trip → evidence rollup visible → CSV export.

## Non-goals

Baselines/manual controls as scope inputs (deferred), evidence status tracking, any
write/tenancy features.
