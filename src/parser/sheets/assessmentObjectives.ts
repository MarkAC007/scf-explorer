import * as XLSX from 'xlsx'
import type { AssessmentObjective } from '../../model/types'
import { findColumn, normalizeHeader } from '../headerMatch'

const splitMulti = (v: unknown): string[] =>
  String(v ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

export const parseAssessmentObjectives = (ws: XLSX.WorkSheet): AssessmentObjective[] => {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null })
  const headers = (rows[0] ?? []).map(normalizeHeader)
  const cControl = findColumn(headers, /^scf #$/i)
  const cId = findColumn(headers, /^scf ao #$/i)
  const cText = findColumn(headers, /^scf assessment objective \(ao\)/i)
  const cPptdf = findColumn(headers, /^pptdf applicability$/i)
  const cOrigins = findColumn(headers, /^scf assessment objective \(ao\) origin/i)
  const cRigor = findColumn(headers, /^assessment rigor/i)
  const cSdp = findColumn(headers, /^scf defined parameters/i)
  const cOdp = findColumn(headers, /^organization defined parameters/i)

  const out: AssessmentObjective[] = []
  for (const r of rows.slice(1)) {
    const id = String(r[cId] ?? '').trim()
    if (!id) continue
    out.push({
      id,
      controlId: String(r[cControl] ?? '').trim(),
      text: String(r[cText] ?? '').trim(),
      pptdf: splitMulti(r[cPptdf]),
      origins: splitMulti(r[cOrigins]),
      rigor: Number(r[cRigor]) || null,
      sdp: String(r[cSdp] ?? '').trim(),
      odp: String(r[cOdp] ?? '').trim(),
    })
  }
  return out
}
