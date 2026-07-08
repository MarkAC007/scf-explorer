export interface Domain {
  id: string
  name: string
  principle: string
  intent: string
  controlCount: number
}

export interface Framework {
  id: string
  header: string
  name: string
  geography: string
  source: string
  url: string
  strmUrl: string
  fromSources: boolean
}

export interface MaturityLevel {
  level: 0 | 1 | 2 | 3 | 4 | 5
  title: string
  text: string
}

export interface Solution {
  sizeBand: string
  text: string
}

export interface Control {
  id: string
  domainId: string
  name: string
  description: string
  question: string
  cadence: string
  weighting: number | null
  pptdf: string[]
  csfFunction: string
  scrmTiers: number[]
  maturity: MaturityLevel[]
  baselines: string[]
  solutions: Solution[]
  erlIds: string[]
  mappings: Record<string, string[]>
  riskIds: string[]
  threatIds: string[]
  errata: string
  row: number
}

export interface Risk {
  id: string
  grouping: string
  name: string
  description: string
  csfFunction: string
  materiality: string
}

export interface Threat {
  id: string
  grouping: string
  name: string
  description: string
  materiality: string
}

export interface AssessmentObjective {
  id: string
  controlId: string
  text: string
  pptdf: string[]
  origins: string[]
  rigor: number | null
  sdp: string
  odp: string
}

export interface ErlItem {
  id: string
  areaOfFocus: string
  artifact: string
  description: string
  controlIds: string[]
}

export interface CompensatingOption {
  name: string
  id: string
  justification: string
}

export interface CompensatingEntry {
  controlId: string
  riskNote: string
  options: CompensatingOption[]
}

export interface PrivacyPrinciple {
  num: number
  name: string
  description: string
  controlIds: string[]
  mappings: Record<string, string[]>
}

export interface BaselineDef {
  id: string
  label: string
}

export interface ParseReport {
  version: string
  sheets: { name: string; matched: string; rows: number }[]
  unmappedColumns: { sheet: string; header: string }[]
  warnings: string[]
}

export interface ScfModel {
  version: string
  sourceFileName: string
  parsedAt: string
  domains: Domain[]
  controls: Control[]
  frameworks: Framework[]
  risks: Risk[]
  threats: Threat[]
  assessmentObjectives: AssessmentObjective[]
  erlItems: ErlItem[]
  compensating: CompensatingEntry[]
  privacyPrinciples: PrivacyPrinciple[]
  baselineDefs: BaselineDef[]
  parseReport: ParseReport
}
