import type {
  AssessmentObjective,
  CompensatingEntry,
  Control,
  Domain,
  ErlItem,
  Framework,
  Risk,
  ScfModel,
  Threat,
} from './types'

export interface ModelIndexes {
  controlById: Map<string, Control>
  domainById: Map<string, Domain>
  frameworkById: Map<string, Framework>
  riskById: Map<string, Risk>
  threatById: Map<string, Threat>
  controlsByDomain: Map<string, Control[]>
  controlsByFramework: Map<string, Control[]>
  controlsByRisk: Map<string, Control[]>
  controlsByThreat: Map<string, Control[]>
  controlsByBaseline: Map<string, Control[]>
  aosByControl: Map<string, AssessmentObjective[]>
  erlById: Map<string, ErlItem>
  erlByControl: Map<string, ErlItem[]>
  compensatingByControl: Map<string, CompensatingEntry>
  stats: {
    controls: number
    domains: number
    frameworks: number
    mappedFrameworks: number
    risks: number
    threats: number
    aos: number
    erlItems: number
  }
}

const push = <K, V>(m: Map<K, V[]>, k: K, v: V): void => {
  const arr = m.get(k)
  if (arr) arr.push(v)
  else m.set(k, [v])
}

export const buildIndexes = (m: ScfModel): ModelIndexes => {
  const controlsByDomain = new Map<string, Control[]>()
  const controlsByFramework = new Map<string, Control[]>()
  const controlsByRisk = new Map<string, Control[]>()
  const controlsByThreat = new Map<string, Control[]>()
  const controlsByBaseline = new Map<string, Control[]>()

  for (const c of m.controls) {
    push(controlsByDomain, c.domainId, c)
    for (const fw of Object.keys(c.mappings)) push(controlsByFramework, fw, c)
    for (const r of c.riskIds) push(controlsByRisk, r, c)
    for (const t of c.threatIds) push(controlsByThreat, t, c)
    for (const b of c.baselines) push(controlsByBaseline, b, c)
  }

  const aosByControl = new Map<string, AssessmentObjective[]>()
  for (const ao of m.assessmentObjectives) push(aosByControl, ao.controlId, ao)

  const erlByControl = new Map<string, ErlItem[]>()
  for (const e of m.erlItems) for (const cid of e.controlIds) push(erlByControl, cid, e)

  return {
    controlById: new Map(m.controls.map((c) => [c.id, c])),
    domainById: new Map(m.domains.map((d) => [d.id, d])),
    frameworkById: new Map(m.frameworks.map((f) => [f.id, f])),
    riskById: new Map(m.risks.map((r) => [r.id, r])),
    threatById: new Map(m.threats.map((t) => [t.id, t])),
    controlsByDomain,
    controlsByFramework,
    controlsByRisk,
    controlsByThreat,
    controlsByBaseline,
    aosByControl,
    erlById: new Map(m.erlItems.map((e) => [e.id, e])),
    erlByControl,
    compensatingByControl: new Map(m.compensating.map((c) => [c.controlId, c])),
    stats: {
      controls: m.controls.length,
      domains: m.domains.length,
      frameworks: m.frameworks.length,
      mappedFrameworks: controlsByFramework.size,
      risks: m.risks.length,
      threats: m.threats.length,
      aos: m.assessmentObjectives.length,
      erlItems: m.erlItems.length,
    },
  }
}
