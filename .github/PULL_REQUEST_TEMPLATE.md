## What & why

<!-- Short description of the change and the motivation. -->

## Checklist

- [ ] **No SCF content added to the repo** (no workbooks, slices, fixtures, or exported control text — CC BY-ND 4.0)
- [ ] Stays within scope: read-only, client-side, no backend/telemetry
- [ ] `npm test && npm run lint && npm run typecheck && npm run build` pass
- [ ] Fixture e2e passes (`npx playwright test e2e/fixture.spec.ts e2e/scope.spec.ts`)
- [ ] Parser changes only: dual-parser integrity suite run (see CLAUDE.md)
