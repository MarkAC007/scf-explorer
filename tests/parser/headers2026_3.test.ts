import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { loadFixture, hasSheet, fixtureExpectations } from '../helpers/fixture'
import { parseWorkbook } from '../../src/parser/parseWorkbook'
import { parseErl } from '../../src/parser/sheets/erl'
import { parseAssessmentObjectives } from '../../src/parser/sheets/assessmentObjectives'
import { parsePrivacyPrinciples } from '../../src/parser/sheets/privacy'

/**
 * SCF 2026.3 renamed one sheet and several column headers. These tests pin the new
 * header spellings (copied verbatim from the 2026.3 release) next to the 2026.1.1 ones
 * the fixture already covers, so a parser that matches only one release fails here.
 */

const aoa = (rows: unknown[][]): XLSX.WorkSheet => XLSX.utils.aoa_to_sheet(rows)

/** Rebuild the fixture workbook with sheets renamed / columns dropped, as an ArrayBuffer. */
const rebuildFixture = (mutate: (wb: XLSX.WorkBook) => void): ArrayBuffer => {
  const src = loadFixture()
  const wb = XLSX.utils.book_new()
  for (const name of src.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(src.Sheets[name], { header: 1, defval: null })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name)
  }
  mutate(wb)
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return out
}

const renameSheet = (wb: XLSX.WorkBook, from: RegExp, to: string): void => {
  const i = wb.SheetNames.findIndex((n) => from.test(n))
  if (i === -1) throw new Error(`no sheet matching ${from}`)
  const old = wb.SheetNames[i]
  wb.Sheets[to] = wb.Sheets[old]
  delete wb.Sheets[old]
  wb.SheetNames[i] = to
}

const dropColumn = (wb: XLSX.WorkBook, sheetPattern: RegExp, header: string): void => {
  const name = wb.SheetNames.find((n) => sheetPattern.test(n))!
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, defval: null })
  const col = rows[0].findIndex((h) => String(h ?? '').trim() === header)
  if (col === -1) throw new Error(`no column ${header}`)
  const trimmed = rows.map((r) => r.filter((_, i) => i !== col))
  wb.Sheets[name] = XLSX.utils.aoa_to_sheet(trimmed)
}

// These two rebuilds mutate a pre-2026.3 fixture into the 2026.3 shape; a fixture generated
// from 2026.3 already has that shape and is covered by the ordinary suites.
const LEGACY_SOURCES = hasSheet(/authoritative sources/i)
describe.skipIf(!LEGACY_SOURCES)('2026.3 sheet name: Focal Documents (FD)', () => {
  const buf = LEGACY_SOURCES
    ? rebuildFixture((wb) => renameSheet(wb, /authoritative sources/i, 'Focal Documents (FD)'))
    : null
  const model = buf ? parseWorkbook(buf, 'renamed.xlsx') : null!
  it('matches the renamed sources sheet with no warning', () => {
    expect(model.parseReport.warnings).not.toContain('Sheet not found: sources')
    expect(model.parseReport.sheets.find((s) => s.name === 'sources')?.matched).toBe('Focal Documents (FD)')
  })
  it('enriches frameworks from the renamed sheet', () => {
    const f = model.frameworks.find((x) => x.id === fixtureExpectations().nist)
    expect(f?.fromSources).toBe(true)
    expect(f?.sourceUrl ?? f?.name).toBeTruthy()
  })
})

const HAS_COUNT = fixtureExpectations().hasDomainControlCount
describe.skipIf(!HAS_COUNT)('2026.3 domains sheet without Control Count', () => {
  const buf = HAS_COUNT ? rebuildFixture((wb) => dropColumn(wb, /domains & principles/i, 'Control Count')) : null
  const model = buf ? parseWorkbook(buf, 'nocount.xlsx') : null!
  it('derives controlCount from the main sheet', () => {
    const gov = model.domains.find((d) => d.id === 'GOV')!
    const expected = model.controls.filter((c) => c.domainId === 'GOV').length
    expect(expected).toBeGreaterThan(0)
    expect(gov.controlCount).toBe(expected)
  })
})

describe('2026.3 ERL headers', () => {
  const ws = aoa([
    ['#', 'ERL #', 'Area of Focus', 'ERL Artifact', 'Evidence Request List (ERL) Artifact Description', 'SCF Control Mappings', 'Legacy SCF Control Mappings'],
    [1, 'E-GOV-01', 'Governance', 'Cybersecurity program charter', 'The documented program charter.', 'GOV-01\nGOV-02', 'GOV-01'],
  ])
  const erl = parseErl(ws)
  it('reads artifact and description from the renamed columns', () => {
    expect(erl).toHaveLength(1)
    expect(erl[0].artifact).toBe('Cybersecurity program charter')
    expect(erl[0].description).toBe('The documented program charter.')
    expect(erl[0].controlIds).toEqual(['GOV-01', 'GOV-02'])
  })
})

describe('2026.3 assessment objective headers', () => {
  const ws = aoa([
    ['SCF #', 'SCF AO #', 'SCF Assessment Objective (AO) In addition to relevant policies…', 'Reciprocal AOs', 'SCF Defined Parameters (SDP) [recommended minimums]', 'PPTDF Applicability', 'SCR CAP Assessment Rigor (AR)', 'SCF Assessment Objective (AO) Origin(s)', 'Notes', 'Legacy SCF #'],
    ['GOV-01', 'GOV-01_A01', 'a program exists', '', 'annual', 'Process', 3, 'SCF', '', 'GOV-01'],
  ])
  const aos = parseAssessmentObjectives(ws)
  it('reads rigor from the SCR CAP column and the current SCF #', () => {
    expect(aos).toHaveLength(1)
    expect(aos[0].rigor).toBe(3)
    expect(aos[0].controlId).toBe('GOV-01')
    expect(aos[0].sdp).toBe('annual')
  })
})

describe('2026.3 privacy principle headers', () => {
  const ws = aoa([
    ['#', 'Principle Name', 'SCF Data Privacy Management Principle (SCF-DPMP) Description', 'SCF Domain', 'SCF Control', '2026.3 SCF #', 'Secure Controls Framework (SCF) Control Description', 'ISO 27701 2025'],
    [1, 'Data Privacy by Design', 'Build privacy in.', 'GOV', 'Program', 'GOV-01', 'desc', '5.2'],
    [null, null, null, 'GOV', 'Roles', 'GOV-04', 'desc', '5.3\n5.4'],
  ])
  const pps = parsePrivacyPrinciples(ws)
  it('links controls through the versioned SCF # column', () => {
    expect(pps).toHaveLength(1)
    expect(pps[0].controlIds).toEqual(['GOV-01', 'GOV-04'])
    expect(pps[0].mappings['iso-27701-2025']).toEqual(['5.2', '5.3', '5.4'])
  })
})
