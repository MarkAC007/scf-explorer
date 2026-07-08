import * as XLSX from 'xlsx'
import type { Risk, Threat } from '../../model/types'
import { findColumn, normalizeHeader } from '../headerMatch'

/** Catalog sheets carry a prose preamble; the real header row starts with "<X> Grouping". */
const findHeaderRow = (rows: unknown[][], firstHeader: RegExp): number =>
  rows.findIndex((r) => firstHeader.test(normalizeHeader(r[0])))

export const parseRiskCatalog = (ws: XLSX.WorkSheet): Risk[] => {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null })
  const h = findHeaderRow(rows, /^risk grouping$/i)
  if (h === -1) return []
  const headers = rows[h].map(normalizeHeader)
  const cGroup = findColumn(headers, /^risk grouping$/i)
  const cId = findColumn(headers, /^risk #$/i)
  const cName = findColumn(headers, /^risk\*/i)
  const cDesc = findColumn(headers, /^description of possible risk/i)
  const cCsf = findColumn(headers, /^nist csf/i)
  const cMat = findColumn(headers, /^materiality considerations/i)

  let grouping = ''
  const out: Risk[] = []
  for (const r of rows.slice(h + 1)) {
    grouping = String(r[cGroup] ?? '').trim() || grouping
    const id = String(r[cId] ?? '').trim()
    if (!id) continue
    out.push({
      id,
      grouping,
      name: String(r[cName] ?? '').trim(),
      description: String(r[cDesc] ?? '').trim(),
      csfFunction: String(r[cCsf] ?? '').trim(),
      materiality: String(r[cMat] ?? '').trim(),
    })
  }
  return out
}

export const parseThreatCatalog = (ws: XLSX.WorkSheet): Threat[] => {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null })
  const h = findHeaderRow(rows, /^threat grouping$/i)
  if (h === -1) return []
  const headers = rows[h].map(normalizeHeader)
  const cGroup = findColumn(headers, /^threat grouping$/i)
  const cId = findColumn(headers, /^threat #$/i)
  const cName = findColumn(headers, /^threat\*/i)
  const cDesc = findColumn(headers, /^threat description$/i)
  const cMat = findColumn(headers, /^materiality considerations/i)

  let grouping = ''
  const out: Threat[] = []
  for (const r of rows.slice(h + 1)) {
    grouping = String(r[cGroup] ?? '').trim() || grouping
    const id = String(r[cId] ?? '').trim()
    if (!id) continue
    out.push({
      id,
      grouping,
      name: String(r[cName] ?? '').trim(),
      description: String(r[cDesc] ?? '').trim(),
      materiality: String(r[cMat] ?? '').trim(),
    })
  }
  return out
}
