// Generate tests/fixtures/scf-fixture.xlsx: a trimmed slice of the real SCF workbook
// (all sheets; control-level sheets filtered to GOV-* and AST-* rows) so tests can run
// against real structure without committing the full framework.
//
// Usage: SCF_XLSX=/path/to/scf.xlsx node scripts/make-fixture.mjs
import * as XLSX from 'xlsx'
import * as fs from 'node:fs'
import { mkdirSync } from 'node:fs'

XLSX.set_fs(fs)
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC =
  process.env.SCF_XLSX ??
  '/home/mark/scf-releases/2026.1.1/Secure.Controls.Framework.SCF.-.2026.1.1.xlsx'
const OUT = join(dirname(fileURLToPath(import.meta.url)), '../tests/fixtures/scf-fixture.xlsx')

const KEEP = /^(GOV|AST)-/

const wb = XLSX.readFile(SRC)
const out = XLSX.utils.book_new()

/** Column header (row 1 or given header row) whose normalized text matches pattern. */
const norm = (v) => String(v ?? '').replace(/\s+/g, ' ').trim()

const filterSheet = (ws, idHeaderPattern, { headerRow = 1, multiValue = false } = {}) => {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  const header = rows[headerRow - 1] ?? []
  const idCol = header.findIndex((h) => idHeaderPattern.test(norm(h)))
  if (idCol === -1) return rows // pattern not found: keep whole sheet
  const kept = rows.filter((row, i) => {
    if (i < headerRow) return true
    const v = String(row[idCol] ?? '')
    if (multiValue) return v.split('\n').some((x) => KEEP.test(x.trim()))
    return KEEP.test(v.trim())
  })
  return kept
}

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name]
  let rows
  if (/^scf 20/i.test(name)) rows = filterSheet(ws, /^scf #$/i)
  else if (/^compensating controls/i.test(name)) rows = filterSheet(ws, /^scf control #$/i)
  else if (/^assessment objectives/i.test(name)) rows = filterSheet(ws, /^scf #$/i)
  else if (/^evidence request list/i.test(name))
    rows = filterSheet(ws, /^scf control mappings$/i, { multiValue: true })
  else if (/data privacy mgmt principles/i.test(name)) rows = filterSheet(ws, /^scf #$/i)
  else rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  XLSX.utils.book_append_sheet(out, XLSX.utils.aoa_to_sheet(rows), name)
}

mkdirSync(dirname(OUT), { recursive: true })
XLSX.writeFile(out, OUT, { compression: true })

const check = XLSX.readFile(OUT)
console.log('sheets:', check.SheetNames.join(' | '))
for (const n of check.SheetNames) {
  const r = XLSX.utils.decode_range(check.Sheets[n]['!ref']).e.r + 1
  console.log(`  ${n}: ${r} rows`)
}
