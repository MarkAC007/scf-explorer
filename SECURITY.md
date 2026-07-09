# Security Policy

## Reporting a vulnerability

Please report vulnerabilities privately via GitHub:
**Security → Report a vulnerability** on this repository
(https://github.com/MarkAC007/scf-explorer/security/advisories/new).

Please do not open public issues for security reports. You can expect an initial response
within a few days.

## Scope

SCF Explorer is a fully client-side static web application:

- No backend, no accounts, no telemetry. The uploaded workbook is parsed in the browser
  (Web Worker) and cached in the browser's own IndexedDB; data never leaves the machine.
- Interesting reports therefore include: XSS via crafted workbook content, dependency
  vulnerabilities that are actually reachable, service-worker/cache poisoning, and CI or
  supply-chain issues in this repository.
- Out of scope: issues in the Secure Controls Framework content itself (report those to
  the SCF Council), and vulnerabilities requiring a compromised browser or machine.

## Supply-chain posture

- Dependency lifecycle scripts are disabled (`.npmrc: ignore-scripts=true`) for local
  installs and CI.
- New dependency versions are subject to a 14-day cooldown before adoption.
- `xlsx` is pinned to the SheetJS vendor CDN tarball 0.20.3 because the npm registry
  package ships older code with known unfixed advisories.
- CI downloads the SCF workbook sha256-pinned from the official release.
