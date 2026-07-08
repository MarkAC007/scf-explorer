import * as XLSX from 'xlsx'
import type { Domain } from '../../model/types'
import { findColumn, normalizeHeader } from '../headerMatch'

export const parseDomains = (ws: XLSX.WorkSheet): Domain[] => {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null })
  const headers = (rows[0] ?? []).map(normalizeHeader)
  const cName = findColumn(headers, /^scf domain$/i)
  const cId = findColumn(headers, /^scf identifier$/i)
  const cPrinciple = findColumn(headers, /principles$/i)
  const cIntent = findColumn(headers, /^principle intent$/i)
  const cCount = findColumn(headers, /^control count$/i)

  return rows
    .slice(1)
    .filter((r) => r[cId] != null && String(r[cId]).trim() !== '')
    .map((r) => ({
      id: String(r[cId]).trim(),
      name: String(r[cName] ?? '').trim(),
      principle: String(r[cPrinciple] ?? '').trim(),
      intent: String(r[cIntent] ?? '').trim(),
      controlCount: Number(r[cCount]) || 0,
    }))
}
