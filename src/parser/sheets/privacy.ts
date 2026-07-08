import * as XLSX from 'xlsx'
import type { PrivacyPrinciple } from '../../model/types'
import { findColumn, normalizeHeader, slugify } from '../headerMatch'

/**
 * Privacy sheet rows repeat one row per (principle, control) pair; mapping columns
 * follow the fixed descriptive columns. Rows are grouped by principle number.
 */
export const parsePrivacyPrinciples = (ws: XLSX.WorkSheet): PrivacyPrinciple[] => {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null })
  const headers = (rows[0] ?? []).map(normalizeHeader)
  const cNum = findColumn(headers, /^#$/)
  const cName = findColumn(headers, /^principle name$/i)
  const cDesc = findColumn(headers, /description$/i)
  const cControl = findColumn(headers, /^scf #$/i)

  // mapping columns = everything after the SCF control description column that isn't fixed
  const fixed = new Set([cNum, cName, cDesc, cControl, findColumn(headers, /^scf control$/i), findColumn(headers, /^secure controls framework \(scf\) control description$/i)])
  const mapCols = headers
    .map((h, i) => ({ h, i }))
    .filter(({ h, i }) => h && !fixed.has(i) && i > cControl)

  const byNum = new Map<number, PrivacyPrinciple>()
  let lastNum = 0
  for (const r of rows.slice(1)) {
    const rawNum = Number(r[cNum])
    if (rawNum > 0) lastNum = rawNum
    const num = lastNum
    if (num === 0) continue
    const controlId = String(r[cControl] ?? '').trim()

    let p = byNum.get(num)
    if (!p) {
      p = {
        num,
        name: String(r[cName] ?? '').trim(),
        description: String(r[cDesc] ?? '').trim(),
        controlIds: [],
        mappings: {},
      }
      byNum.set(num, p)
    }
    if (p.name === '') p.name = String(r[cName] ?? '').trim()
    if (controlId && !p.controlIds.includes(controlId)) p.controlIds.push(controlId)

    for (const { h, i } of mapCols) {
      const refs = String(r[i] ?? '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
      if (!refs.length) continue
      const id = slugify(h)
      const existing = p.mappings[id] ?? []
      p.mappings[id] = [...new Set([...existing, ...refs])]
    }
  }
  return [...byNum.values()].sort((a, b) => a.num - b.num)
}
