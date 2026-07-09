# Possible errata: Evidence Request List cross-references — SCF 2026.1.1 & 2026.2

**To:** Secure Controls Framework support / errata
**From:** Mark Almeida-Cardy (github.com/MarkAC007)
**Workbooks checked:**
- `Secure Controls Framework (SCF) - 2026.1.1.xlsx` (release asset, sha256 `ef13a69f…c312e`)
- `secure-controls-framework-scf-2026-2.xlsx` (repo root, fetched 2026-07-09)

**Date:** 2026-07-09

## Summary

While building an open-source read-only viewer for the SCF
([github.com/MarkAC007/scf-explorer](https://github.com/MarkAC007/scf-explorer)), we
cross-checked the two directions in which evidence links are recorded in the workbook:

1. **Forward:** the `Evidence Request List (ERL) #` column on the main SCF sheet
   (control → artifact), and
2. **Reverse:** the `SCF Control Mappings` column on the Evidence Request List sheet
   (artifact → control).

These two directions disagree for **22 of 1,468 controls in 2026.1.1**, and all 22 persist
unchanged in **2026.2** (which adds 2 more, for **24 of 1,534 controls**). One reference
appears to be an outright typo (a control ID where an ERL ID belongs); several others look
like off-by-one slips between adjacent IDs. The remainder may be intentional, but we could
not tell from the workbook alone, so we list everything for your review.

## A. Confirmed typo (both versions)

| Control | Forward ERL cell contains | Problem |
|---|---|---|
| MON-03.3 | `MON-03.2` | This is a **control ID**, not an ERL ID — no such artifact exists in the ERL catalog. The ERL sheet maps MON-03.3 to `E-MON-09` (Event Logs), which is likely what the cell intended. |

## B. Likely off-by-one / adjacent-ID slips (both versions)

These pairs disagree by one adjacent ID in either the control or the artifact, suggesting
transcription slips rather than deliberate asymmetry:

| Forward (main sheet says) | Reverse (ERL sheet says) | Artifact(s) |
|---|---|---|
| RSK-02, RSK-02.1 → `E-BCM-08` | E-BCM-**09** → RSK-02, RSK-02.1 | COOP Criticality Analysis / COOP Dependency Analysis |
| BCD-11.**2** → `E-BCM-13` | E-BCM-13 → BCD-11.**1** | Backups - Recovery Activities |
| IRO-**10** → `E-IRO-13` | E-IRO-13 → IRO-**09** | Incident Response Records |
| OPS-01 → `E-HRS-01` | E-HRS-**02** → OPS-01 | Position Categorization / Assigned Roles - Application Developers |

## C. One-directional references (main sheet cites, ERL sheet does not map back)

| Control | Cites | Artifact | Versions |
|---|---|---|---|
| AST-23 | E-TPM-01 | Third-Party Contracts | both |
| CFG-01 | E-AST-01 | IT Asset Management (ITAM) | both |
| DCH-01.2 | E-DCH-09 | Assigned Responsibilities | both |
| END-04 | E-MON-02 | Malware Activity | both |
| IAC-28 | E-IAM-02 | Defined Roles & Authorizations (RBAC) | both |
| TPM-04.4 | E-AST-23 | Geolocation Inventory | both |
| QTS-01.1 | E-GOV-08 | Cybersecurity & Data Protection Policies | 2026.2 only (new domain) |
| QTS-01.2 | E-QTS-03 | Long-Lived Data Identification | 2026.2 only (new domain) |

## D. One-directional mappings (ERL sheet maps, main sheet does not cite) — both versions

| Control | Listed on | Artifact |
|---|---|---|
| CRY-01 | E-DCH-09 | Assigned Responsibilities |
| GOV-16.1 | E-RSK-10 | Material Risk Definition |
| IAO-03 | E-TDA-18 | System Security Plan (SSP) Reviews |
| PRM-07 | E-PRM-05 | System Design Document (SDD) |
| SEA-01, SEA-02 | E-SEA-02 | Security Architecture |
| TPM-01 | E-TPM-01 | Third-Party Contracts |
| VPM-01.1 | E-VPM-07, E-VPM-08 | Flaw Remediation Change Control / Test Results |

## Methodology / reproduction

Two independent parsers (Python/openpyxl and JavaScript/SheetJS, sharing no code) read the
unmodified official workbooks. For each control we compared the set of ERL IDs in the main
sheet's `Evidence Request List (ERL) #` cell against the set of controls listed in each
artifact's `SCF Control Mappings` cell on the ERL sheet. Multi-value cells were split on
newlines; whitespace normalised; no content was altered. The verification script is public:
`scripts/ground-truth.py` in the repo above.

Totals for context — 2026.1.1: 1,468 controls, 303 ERL artifacts; 2026.2: 1,534 controls,
316 ERL artifacts. Every 2026.1.1 discrepancy reproduces byte-identically in 2026.2.

No action needed on our side — our viewer displays the union of both directions so no
linkage is lost. We're reporting in case any of the above are unintended. Happy to provide
the raw diff output or re-run against a corrected draft.

Thanks for the SCF — it's a remarkable resource.
