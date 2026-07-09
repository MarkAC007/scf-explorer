# Contributing to SCF Explorer

Thanks for your interest! Contributions are welcome — bug reports, fixes, and features that
fit the project's purpose: a **read-only, client-side viewer** for the Secure Controls
Framework.

## The one rule that is not negotiable

The SCF content is licensed **CC BY-ND 4.0** by the SCF Council. This repository must
never contain SCF data — no workbooks, no trimmed slices, no fixtures, no JSON exports of
control text. PRs that add SCF content in any form will be closed. The test fixture is
generated locally from the official workbook and is gitignored; CI downloads the official
release (sha256-pinned) and derives it at test time.

## Scope

In scope: browsing, searching, crosswalking, and visualising what the official workbook
contains, plus client-side conveniences (scopes, exports, PWA). Out of scope: evidence
collection/tracking, assessments, accounts, telemetry, or any backend — this app must keep
working as a static site where workbook data never leaves the browser.

## Getting set up

```bash
git clone https://github.com/MarkAC007/scf-explorer && cd scf-explorer
npm ci                      # note: repo .npmrc disables lifecycle scripts by design
# Download the official SCF workbook from
# https://github.com/securecontrolsframework/securecontrolsframework/releases
SCF_XLSX=/path/to/scf.xlsx node scripts/make-fixture.mjs   # generates the test fixture
npm run dev
```

## Before opening a PR

```bash
npm test && npm run lint && npm run typecheck && npm run build
npx playwright install chromium
npx playwright test e2e/fixture.spec.ts e2e/scope.spec.ts
```

If you touched the parser (`src/parser/`), also read the "Parser invariants" section of
`CLAUDE.md` and run the dual-parser integrity suite described there — several of those
invariants exist because of real data bugs.

Conventions:
- Tests first for parser/logic changes; render tests for views; e2e for user flows.
- Conventional commit prefixes: `feat:` / `fix:` / `test:` / `docs:` / `chore:`.
- Keep dependencies boring; `xlsx` is intentionally pinned to the SheetJS vendor CDN
  tarball (the npm registry package has unfixed advisories) — do not change it.

## Reporting issues

Use the issue templates. For suspected errors in the SCF *data itself* (not this app),
those belong upstream with the SCF Council — though feel free to open an issue here first
if you're unsure which side the problem is on; we maintain a verification harness that can
tell (`scripts/ground-truth.py`).
