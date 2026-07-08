import * as XLSX from 'xlsx'
import type { CompensatingEntry, CompensatingOption } from '../../model/types'
import { normalizeHeader } from '../headerMatch'

const isNa = (s: string): boolean => /^n\/?a$/i.test(s) || s === ''

/**
 * The compensating sheet repeats (name, #, justification) column groups after the
 * "Possible Compensating Control #N" marker columns.
 */
export const parseCompensating = (ws: XLSX.WorkSheet): CompensatingEntry[] => {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null })
  const headers = (rows[0] ?? []).map(normalizeHeader)

  const cControl = headers.findIndex((h) => /^scf control #$/i.test(h))
  const cRisk = headers.findIndex((h) => /^risk if primary control/i.test(h))
  // option groups: columns after each "Possible Compensating Control #N" header
  const groups: { name: number; id: number; just: number }[] = []
  headers.forEach((h, i) => {
    if (/^possible compensating control #\d/i.test(h)) {
      groups.push({ name: i + 1, id: i + 2, just: i + 3 })
    }
  })

  const out: CompensatingEntry[] = []
  for (const r of rows.slice(1)) {
    const controlId = String(r[cControl] ?? '').trim()
    if (!/^[A-Z]{2,4}-\d/.test(controlId)) continue
    const options: CompensatingOption[] = []
    for (const g of groups) {
      const id = String(r[g.id] ?? '').trim()
      if (isNa(id)) continue
      options.push({
        id,
        name: String(r[g.name] ?? '').trim(),
        justification: String(r[g.just] ?? '').trim(),
      })
    }
    out.push({
      controlId,
      riskNote: String(r[cRisk] ?? '').trim(),
      options,
    })
  }
  return out
}
