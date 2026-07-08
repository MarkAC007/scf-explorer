import type { Control, Framework } from '../model/types'

export interface MappingGroup {
  geography: string
  items: { framework: Framework; refs: string[] }[]
}

const GEO_ORDER = ['General', 'US', 'EMEA', 'APAC', 'Americas']

/** Group a control's framework mappings by geography, frameworks sorted by name. */
export const groupMappings = (
  control: Control,
  frameworkById: Map<string, Framework>,
): MappingGroup[] => {
  const byGeo = new Map<string, MappingGroup['items']>()
  for (const [fwId, refs] of Object.entries(control.mappings)) {
    if (refs.length === 0) continue
    const framework = frameworkById.get(fwId)
    if (!framework) continue
    const geo = framework.geography || 'General'
    const items = byGeo.get(geo)
    if (items) items.push({ framework, refs })
    else byGeo.set(geo, [{ framework, refs }])
  }
  return [...byGeo.entries()]
    .map(([geography, items]) => ({
      geography,
      items: items.sort((a, b) => a.framework.name.localeCompare(b.framework.name)),
    }))
    .sort((a, b) => {
      const ai = GEO_ORDER.indexOf(a.geography)
      const bi = GEO_ORDER.indexOf(b.geography)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.geography.localeCompare(b.geography)
    })
}
