import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseMainSheet, parseLikelihood } from '../../src/parser/sheets/mainSheet'
import { buildIndexes } from '../../src/model/indexes'
import type { ScfModel } from '../../src/model/types'

/**
 * 2026.1.1 risk/threat cells are sparse markers (the risk id, or empty).
 * 2026.3 fills every cell with a likelihood: Unlikely | Possible | Likely.
 * Only Possible/Likely (or an unrated marker) count as a link.
 */
const HEADERS = ['SCF Domain', 'SCF Control', 'SCF #', 'Secure Controls Framework (SCF) Control Description',
  'Risk R-AC-1', 'Risk R-GV-1', 'Risk R-GV-2', 'Threat NT-1', 'Threat MT-1']

describe('parseLikelihood', () => {
  it.each([
    ['Unlikely', 'unlikely'], ['possible', 'possible'], [' LIKELY ', 'likely'],
    ['R-GV-1', null], ['', null], [null, null], ['x', null],
  ])('%s → %s', (v, expected) => {
    expect(parseLikelihood(v)).toBe(expected)
  })
})

describe('parseMainSheet — dense likelihood cells (2026.3)', () => {
  const ws = XLSX.utils.aoa_to_sheet([
    HEADERS,
    ['Governance', 'Program', 'GOV-01', 'd', 'Unlikely', 'Likely', 'Possible', 'Unlikely', 'Possible'],
    ['Governance', 'Roles', 'GOV-04', 'd', 'Unlikely', 'Unlikely', 'Unlikely', 'Unlikely', 'Unlikely'],
  ])
  const { controls } = parseMainSheet(ws, [])
  it('links only Possible and Likely', () => {
    expect(controls[0].riskIds).toEqual(['R-GV-1', 'R-GV-2'])
    expect(controls[0].threatIds).toEqual(['MT-1'])
    expect(controls[1].riskIds).toEqual([])
    expect(controls[1].threatIds).toEqual([])
  })
  it('keeps every rating, including Unlikely', () => {
    expect(controls[0].riskLikelihood).toEqual({ 'R-AC-1': 'unlikely', 'R-GV-1': 'likely', 'R-GV-2': 'possible' })
    expect(controls[0].threatLikelihood).toEqual({ 'NT-1': 'unlikely', 'MT-1': 'possible' })
    expect(Object.keys(controls[1].riskLikelihood)).toHaveLength(3)
  })
})

describe('parseMainSheet — sparse marker cells (2026.1.1)', () => {
  const ws = XLSX.utils.aoa_to_sheet([
    HEADERS,
    ['Governance', 'Program', 'GOV-01', 'd', 'R-AC-1', null, 'R-GV-2', null, 'MT-1'],
  ])
  const { controls } = parseMainSheet(ws, [])
  it('treats any filled marker as a link and records no rating', () => {
    expect(controls[0].riskIds).toEqual(['R-AC-1', 'R-GV-2'])
    expect(controls[0].threatIds).toEqual(['MT-1'])
    expect(controls[0].riskLikelihood).toEqual({})
    expect(controls[0].threatLikelihood).toEqual({})
  })
})

describe('buildIndexes — likelihood-aware reverse indexes', () => {
  const ws = XLSX.utils.aoa_to_sheet([
    HEADERS,
    ['Governance', 'Program', 'GOV-01', 'd', 'Unlikely', 'Likely', 'Possible', 'Unlikely', 'Possible'],
    ['Governance', 'Roles', 'GOV-04', 'd', 'Unlikely', 'Unlikely', 'Possible', 'Unlikely', 'Unlikely'],
  ])
  const main = parseMainSheet(ws, [])
  const model = {
    version: 't', sourceFileName: 't', parsedAt: '', domains: [], controls: main.controls, frameworks: [],
    risks: [], threats: [], assessmentObjectives: [], erlItems: [], compensating: [], privacyPrinciples: [],
    baselineDefs: [], parseReport: { version: 't', sheets: [], unmappedColumns: [], warnings: [] },
  } as unknown as ScfModel
  const ix = buildIndexes(model)
  it('controlsByRisk holds linked controls only', () => {
    expect((ix.controlsByRisk.get('R-GV-2') ?? []).map((c) => c.id)).toEqual(['GOV-01', 'GOV-04'])
    expect(ix.controlsByRisk.get('R-AC-1') ?? []).toEqual([])
  })
  it('unlikelyControlsByRisk holds the Unlikely-rated remainder', () => {
    expect((ix.unlikelyControlsByRisk.get('R-AC-1') ?? []).map((c) => c.id)).toEqual(['GOV-01', 'GOV-04'])
    expect((ix.unlikelyControlsByRisk.get('R-GV-1') ?? []).map((c) => c.id)).toEqual(['GOV-04'])
    expect((ix.unlikelyControlsByThreat.get('NT-1') ?? []).map((c) => c.id)).toEqual(['GOV-01', 'GOV-04'])
  })
  it('reports whether the model carries likelihood data', () => {
    expect(ix.stats.hasLikelihood).toBe(true)
  })
})
