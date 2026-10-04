import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { loadFixture } from '../helpers/fixture'
import { parseWorkbook } from '../../src/parser/parseWorkbook'

/** Fixture rebuilt 2026.3-style: no Compensating Controls sheet, columns folded into the main sheet. */
const build = (): ArrayBuffer => {
  const src = loadFixture()
  const wb = XLSX.utils.book_new()
  for (const name of src.SheetNames) {
    if (/^compensating controls/i.test(name)) continue
    let rows = XLSX.utils.sheet_to_json<unknown[]>(src.Sheets[name], { header: 1, defval: null })
    if (/^scf 20/i.test(name)) {
      const extra = ['Legacy SCF #', 'Risk if Primary Control Not Implemented', 'Possible Compensating Control #1',
        'Compensating Control #1 Name', 'Compensating Control # 1 Description', 'Compensating Control #1 Justification',
        'Orphaned Controls (no STRM mappings)']
      rows = rows.map((r, i) =>
        i === 0 ? [...r, ...extra] : [...r, 'NONE', 'Without X…', 'TDA-05', 'SSDP', 'Mechanisms…', 'Because…', 'None'],
      )
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name)
  }
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

describe('parseWorkbook — 2026.3 folded compensating controls', () => {
  const model = parseWorkbook(build(), 'folded.xlsx')
  it('does not warn about the missing compensating sheet when the main sheet carries it', () => {
    expect(model.parseReport.warnings).not.toContain('Sheet not found: compensating')
    expect(model.parseReport.sheets.find((s) => s.name === 'compensating')?.matched).toMatch(/folded/i)
  })
  it('produces one compensating entry per control from the main sheet', () => {
    expect(model.compensating).toHaveLength(model.controls.length)
    expect(model.compensating[0].options[0].id).toBe('TDA-05')
  })
  it('does not list the folded columns as frameworks', () => {
    const ids = model.frameworks.map((f) => f.id)
    for (const bad of ['legacy-scf', 'orphaned-controls-no-strm-mappings', 'risk-if-primary-control-not-implemented', 'possible-compensating-control-1'])
      expect(ids).not.toContain(bad)
  })
})
