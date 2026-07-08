import * as XLSX from 'xlsx'
import type { ErlItem } from '../../model/types'
import { findColumn, normalizeHeader } from '../headerMatch'

export const parseErl = (ws: XLSX.WorkSheet): ErlItem[] => {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null })
  const headers = (rows[0] ?? []).map(normalizeHeader)
  const cId = findColumn(headers, /^erl #$/i)
  const cArea = findColumn(headers, /^area of focus$/i)
  const cArtifact = findColumn(headers, /^documentation artifact$/i)
  const cDesc = findColumn(headers, /^artifact description$/i)
  const cControls = findColumn(headers, /^scf control mappings$/i)

  const out: ErlItem[] = []
  for (const r of rows.slice(1)) {
    const id = String(r[cId] ?? '').trim()
    if (!id) continue
    out.push({
      id,
      areaOfFocus: String(r[cArea] ?? '').trim(),
      artifact: String(r[cArtifact] ?? '').trim(),
      description: String(r[cDesc] ?? '').trim(),
      controlIds: String(r[cControls] ?? '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    })
  }
  return out
}
