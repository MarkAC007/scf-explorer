import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { classifyColumn, parseMainSheet } from '../../src/parser/sheets/mainSheet'

/**
 * SCF 2026.3 folded the "Compensating Controls" sheet into the main sheet and added
 * "Legacy SCF #" and "Orphaned Controls" columns. None of these are framework mappings.
 */

const HEADERS = [
  'SCF Domain', 'SCF Control', 'SCF #', 'Legacy SCF #',
  'Secure Controls Framework (SCF) Control Description', 'SCF Control Question',
  'Relative Control Weighting', 'PPTDF Applicability', 'NIST CSF Function Grouping',
  'Conformity Validation Cadence', 'Evidence Request List (ERL) #',
  'Risk if Primary Control Not Implemented',
  'Possible Compensating Control #1', 'Compensating Control #1 Name',
  'Compensating Control # 1 Description', 'Compensating Control #1 Justification',
  'Possible Compensating Control #2', 'Compensating Control #2 Name',
  'Compensating Control # 2 Description', 'Compensating Control #2 Justification',
  'Orphaned Controls (no STRM mappings)',
  'NIST 800-53 R5.2',
]
const ROWS = [
  ['Governance', 'Program', 'GOV-01', 'NONE', 'desc', 'q', 10, 'Process', 'Govern', 'Annual', 'E-GOV-01',
    'Not Applicable (N/A) - Not eligible', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'None', 'PM-1'],
  ['Governance', 'Centralized Management', 'GOV-01.3', 'GOV-01\nSEA-01.1', 'desc', 'q', 8, 'Process', 'Govern', 'Annual', 'E-GOV-02',
    'Without centralized management…', 'TDA-05', 'Secure Software Development Practices (SSDP)', 'Mechanisms exist…', 'SSDP provides…',
    'CFG-04', 'Secure Baseline Configurations', 'Mechanisms exist…', 'Baselines provide…', 'None', 'PM-2'],
]
const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...ROWS])

describe('classifyColumn — 2026.3 non-framework columns', () => {
  it.each([
    'Legacy SCF #',
    'Orphaned Controls (no STRM mappings)',
    'Risk if Primary Control Not Implemented',
    'Possible Compensating Control #1',
    'Compensating Control #1 Name',
    'Compensating Control # 1 Description',
    'Compensating Control #1 Justification',
    'Possible Compensating Control #2',
  ])('%s is not a framework', (h) => {
    expect(classifyColumn(h).kind).not.toBe('framework')
  })
  it('still treats a framework header as a framework', () => {
    expect(classifyColumn('NIST 800-53 R5.2')).toEqual({ kind: 'framework', id: 'nist-800-53-r5-2' })
  })
})

describe('parseMainSheet — 2026.3 folded columns', () => {
  const result = parseMainSheet(ws, [])
  it('registers only real framework columns', () => {
    expect(result.frameworks.map((f) => f.id)).toEqual(['nist-800-53-r5-2'])
    expect(result.unmapped).toEqual([])
  })
  it('stores legacy ids per control, ignoring NONE', () => {
    const [gov01, gov013] = result.controls
    expect(gov01.legacyIds).toEqual([])
    expect(gov013.legacyIds).toEqual(['GOV-01', 'SEA-01.1'])
  })
  it('builds compensating entries from the folded column group', () => {
    expect(result.compensating).toHaveLength(2)
    const na = result.compensating.find((c) => c.controlId === 'GOV-01')!
    expect(na.riskNote).toMatch(/not applicable/i)
    expect(na.options).toEqual([])
    const c = result.compensating.find((c) => c.controlId === 'GOV-01.3')!
    expect(c.riskNote).toMatch(/^Without/)
    expect(c.options.map((o) => o.id)).toEqual(['TDA-05', 'CFG-04'])
    expect(c.options[0].name).toBe('Secure Software Development Practices (SSDP)')
    expect(c.options[0].justification).toBe('SSDP provides…')
    expect(c.options[0].description).toBe('Mechanisms exist…')
  })
  it('does not emit compensating entries when the columns are absent', () => {
    const plain = XLSX.utils.aoa_to_sheet([
      ['SCF Domain', 'SCF Control', 'SCF #', 'Secure Controls Framework (SCF) Control Description', 'NIST 800-53 R5.2'],
      ['Governance', 'Program', 'GOV-01', 'desc', 'PM-1'],
    ])
    const r = parseMainSheet(plain, [])
    expect(r.compensating).toEqual([])
    expect(r.controls[0].legacyIds).toEqual([])
  })
})
