import * as XLSX from 'xlsx'
import type { Framework } from '../../model/types'
import { findColumn, normalizeHeader, slugify } from '../headerMatch'

export const parseSources = (ws: XLSX.WorkSheet): Framework[] => {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null })
  const headers = (rows[0] ?? []).map(normalizeHeader)
  const cGeo = findColumn(headers, /^geography$/i)
  const cHeader = findColumn(headers, /^scf column header$/i)
  const cSource = findColumn(headers, /^source$/i)
  const cName = findColumn(headers, /^focal document name/i)
  const cUrl = findColumn(headers, /^focal document source/i)
  const cStrm = findColumn(headers, /set theory relationship mapping/i)

  const seen = new Set<string>()
  const out: Framework[] = []
  for (const r of rows.slice(1)) {
    const header = normalizeHeader(r[cHeader])
    if (!header) continue
    const id = slugify(header)
    if (seen.has(id)) continue
    seen.add(id)
    out.push({
      id,
      header,
      name: String(r[cName] ?? header).trim(),
      geography: String(r[cGeo] ?? '').trim() || 'General',
      source: String(r[cSource] ?? '').trim(),
      url: String(r[cUrl] ?? '').trim(),
      strmUrl: String(r[cStrm] ?? '').trim(),
      fromSources: true,
    })
  }
  return out
}
