import type { ModelIndexes } from '../model/indexes'
import type { Control, Domain, ErlItem, ScfModel } from '../model/types'

export interface ScopeDef {
  id: string
  name: string
  frameworkIds: string[]
  createdAt: string
  scfVersion: string
}

/** Union of the selected frameworks' mapped controls. Unknown ids are ignored. */
export const scopeControlIds = (
  frameworkIds: string[],
  ix: ModelIndexes,
): Set<string> => {
  const set = new Set<string>()
  for (const fw of frameworkIds) {
    for (const c of ix.controlsByFramework.get(fw) ?? []) set.add(c.id)
  }
  return set
}

/** Per selected framework: controls no other selected framework covers. */
export const marginalAdds = (
  frameworkIds: string[],
  ix: ModelIndexes,
): Map<string, number> => {
  const out = new Map<string, number>()
  for (const fw of frameworkIds) {
    const others = scopeControlIds(
      frameworkIds.filter((f) => f !== fw),
      ix,
    )
    const own = ix.controlsByFramework.get(fw) ?? []
    out.set(fw, own.filter((c) => !others.has(c.id)).length)
  }
  return out
}

/** spine = required by ALL selected frameworks; edges = required by exactly one. */
export const spineEdge = (
  frameworkIds: string[],
  ix: ModelIndexes,
): { spine: Control[]; edges: Control[] } => {
  const spine: Control[] = []
  const edges: Control[] = []
  if (frameworkIds.length === 0) return { spine, edges }
  for (const id of scopeControlIds(frameworkIds, ix)) {
    const c = ix.controlById.get(id)!
    const hits = frameworkIds.filter((fw) => fw in c.mappings).length
    if (hits === frameworkIds.length) spine.push(c)
    else if (hits === 1) edges.push(c)
  }
  return { spine, edges }
}

export const domainCoverage = (
  set: Set<string>,
  ix: ModelIndexes,
  model: ScfModel,
): { domain: Domain; scoped: number; total: number }[] =>
  model.domains
    .map((domain) => {
      const all = ix.controlsByDomain.get(domain.id) ?? []
      return {
        domain,
        scoped: all.filter((c) => set.has(c.id)).length,
        total: all.length,
      }
    })
    .filter((d) => d.total > 0)

/** Histogram over weighting values 1–10 (controls without a weighting are skipped). */
export const weightingProfile = (
  set: Set<string>,
  ix: ModelIndexes,
): { weight: number; count: number }[] => {
  const counts = new Map<number, number>()
  for (const id of set) {
    const w = ix.controlById.get(id)?.weighting
    if (w != null) counts.set(w, (counts.get(w) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([weight, count]) => ({ weight, count }))
    .sort((a, b) => a.weight - b.weight)
}

export const pptdfSplit = (
  set: Set<string>,
  ix: ModelIndexes,
): { label: string; count: number }[] => {
  const counts = new Map<string, number>()
  for (const id of set) {
    for (const p of ix.controlById.get(id)?.pptdf ?? []) {
      counts.set(p, (counts.get(p) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
}

export interface EvidenceGroup {
  areaOfFocus: string
  items: { erl: ErlItem; drivingControls: Control[] }[]
}

/** Deduped ERL artifacts linked from in-scope controls, grouped by area of focus. */
export const evidenceRollup = (set: Set<string>, ix: ModelIndexes): EvidenceGroup[] => {
  const byErl = new Map<string, Control[]>()
  for (const id of set) {
    const c = ix.controlById.get(id)!
    for (const e of ix.erlByControl.get(c.id) ?? []) {
      const arr = byErl.get(e.id)
      if (arr) arr.push(c)
      else byErl.set(e.id, [c])
    }
  }
  const groups = new Map<string, EvidenceGroup['items']>()
  for (const [erlId, drivingControls] of byErl) {
    const erl = ix.erlById.get(erlId)!
    const item = {
      erl,
      drivingControls: drivingControls.sort((a, b) => a.id.localeCompare(b.id)),
    }
    const g = groups.get(erl.areaOfFocus)
    if (g) g.push(item)
    else groups.set(erl.areaOfFocus, [item])
  }
  return [...groups.entries()]
    .map(([areaOfFocus, items]) => ({
      areaOfFocus,
      items: items.sort((a, b) => a.erl.id.localeCompare(b.erl.id)),
    }))
    .sort((a, b) => a.areaOfFocus.localeCompare(b.areaOfFocus))
}

export interface SolutionGroup {
  domain: Domain
  entries: { control: Control; text: string }[]
}

/** Solution guidance for in-scope controls at the chosen org-size band, by domain. */
export const solutionsRollup = (
  set: Set<string>,
  ix: ModelIndexes,
  sizeBand: string,
): SolutionGroup[] => {
  const byDomain = new Map<string, SolutionGroup['entries']>()
  for (const id of set) {
    const c = ix.controlById.get(id)!
    const sol = c.solutions.find((s) => s.sizeBand === sizeBand)
    if (!sol) continue
    const g = byDomain.get(c.domainId)
    const entry = { control: c, text: sol.text }
    if (g) g.push(entry)
    else byDomain.set(c.domainId, [entry])
  }
  return [...byDomain.entries()]
    .map(([domainId, entries]) => ({
      domain: ix.domainById.get(domainId) ?? {
        id: domainId,
        name: domainId,
        principle: '',
        intent: '',
        controlCount: 0,
      },
      entries: entries.sort((a, b) => a.control.id.localeCompare(b.control.id)),
    }))
    .sort((a, b) => a.domain.id.localeCompare(b.domain.id))
}
