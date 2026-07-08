import type { ModelIndexes } from '../model/indexes'
import type { Control, Domain, Framework, ScfModel } from '../model/types'

export interface Coverage {
  framework: Framework
  controls: Control[]
  domainCoverage: { domain: Domain; mapped: number; total: number }[]
}

export const coverage = (fwId: string, ix: ModelIndexes, model: ScfModel): Coverage => {
  const framework = ix.frameworkById.get(fwId)
  if (!framework) throw new Error(`Unknown framework: ${fwId}`)
  const controls = ix.controlsByFramework.get(fwId) ?? []
  const mappedByDomain = new Map<string, number>()
  for (const c of controls)
    mappedByDomain.set(c.domainId, (mappedByDomain.get(c.domainId) ?? 0) + 1)

  const domainCoverage = model.domains
    .map((domain) => ({
      domain,
      mapped: mappedByDomain.get(domain.id) ?? 0,
      total: ix.controlsByDomain.get(domain.id)?.length ?? 0,
    }))
    .filter((d) => d.total > 0)

  return { framework, controls, domainCoverage }
}

export interface Overlap {
  shared: Control[]
  onlyA: Control[]
  onlyB: Control[]
}

/** Two-framework overlap using SCF controls as the Rosetta stone. */
export const overlap = (fwA: string, fwB: string, ix: ModelIndexes): Overlap => {
  const a = ix.controlsByFramework.get(fwA) ?? []
  const bIds = new Set((ix.controlsByFramework.get(fwB) ?? []).map((c) => c.id))
  const aIds = new Set(a.map((c) => c.id))
  return {
    shared: a.filter((c) => bIds.has(c.id)),
    onlyA: a.filter((c) => !bIds.has(c.id)),
    onlyB: (ix.controlsByFramework.get(fwB) ?? []).filter((c) => !aIds.has(c.id)),
  }
}
