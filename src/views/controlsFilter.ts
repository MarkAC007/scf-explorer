import type MiniSearch from 'minisearch'
import type { Control } from '../model/types'

export interface ControlFilters {
  domain?: string
  pptdf?: string[]
  csf?: string[]
  baseline?: string
  framework?: string
  weightMin?: number
  query?: string
}

export const applyFilters = (
  controls: Control[],
  f: ControlFilters,
  search: MiniSearch,
): Control[] => {
  let pool = controls

  if (f.query && f.query.trim()) {
    const q = f.query.trim()
    const hits = search.search(q)
    const rank = new Map(hits.map((h, i) => [h.id as string, i + 1]))
    // An exact control-id query always pins that control to the top.
    const exact = controls.find((c) => c.id.toLowerCase() === q.toLowerCase())
    if (exact) rank.set(exact.id, 0)
    pool = controls
      .filter((c) => rank.has(c.id))
      .sort((a, b) => rank.get(a.id)! - rank.get(b.id)!)
  }

  return pool.filter((c) => {
    if (f.domain && c.domainId !== f.domain) return false
    if (f.pptdf?.length && !f.pptdf.some((p) => c.pptdf.includes(p))) return false
    if (f.csf?.length && !f.csf.includes(c.csfFunction)) return false
    if (f.baseline && !c.baselines.includes(f.baseline)) return false
    if (f.framework && !(f.framework in c.mappings)) return false
    if (f.weightMin != null && (c.weighting ?? 0) < f.weightMin) return false
    return true
  })
}
