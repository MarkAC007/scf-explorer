import { describe, it, expect } from 'vitest'
import { sheet, fixtureExpectations } from '../helpers/fixture'
import { parseMainSheet } from '../../src/parser/sheets/mainSheet'
import { parseSources } from '../../src/parser/sheets/sources'

const knownFrameworks = parseSources(sheet(/authoritative sources|focal documents/i))
const result = parseMainSheet(sheet(/^scf 20/i), knownFrameworks)
const gov01 = result.controls.find((c) => c.id === 'GOV-01')!
const exp = fixtureExpectations()

describe('parseMainSheet core fields', () => {
  it('parses every fixture control row', () => {
    expect(result.controls.length).toBe(exp.controlCount)
    expect(result.controls.map((c) => c.id)).toEqual(exp.controlIds)
    expect(result.controls.every((c) => /^(GOV|AST)-/.test(c.id))).toBe(true)
  })
  it('parses GOV-01 core fields', () => {
    expect(gov01).toBeDefined()
    expect(gov01.domainId).toBe('GOV')
    expect(gov01.name).toBe(String(exp.rawCell('GOV-01', /^scf control$/i)).trim())
    expect(gov01.description).toMatch(/^Mechanisms exist/)
    expect(gov01.question).toMatch(/^Does the organization/)
    expect(gov01.weighting).toBe(Number(exp.rawCell('GOV-01', /^relative control weighting$/i)))
    expect(gov01.pptdf).toEqual(exp.rawList('GOV-01', /^pptdf applicability$/i))
    expect(gov01.csfFunction).toBe(String(exp.rawCell('GOV-01', /^nist csf function grouping$/i)).trim())
    expect(gov01.cadence).toBe(String(exp.rawCell('GOV-01', /^conformity validation cadence$/i)).trim())
    expect(exp.rawTiers('GOV-01').length).toBeGreaterThan(0)
    expect(gov01.scrmTiers).toEqual(exp.rawTiers('GOV-01'))
  })
  it('parses six maturity levels with per-control text', () => {
    expect(gov01.maturity).toHaveLength(6)
    expect(gov01.maturity.map((m) => m.level)).toEqual([0, 1, 2, 3, 4, 5])
    expect(gov01.maturity.every((m) => m.text.length > 20)).toBe(true)
    expect(gov01.maturity[1].title).toMatch(/performed informally/i)
  })
  it('parses ERL references', () => {
    const erl = exp.rawList('GOV-01', /^evidence request list \(erl\) #$/i)
    expect(erl.length).toBeGreaterThan(0)
    expect(gov01.erlIds).toEqual(erl)
  })
  it('parses solutions by size band', () => {
    expect(gov01.solutions.length).toBeGreaterThanOrEqual(4)
    expect(gov01.solutions[0].sizeBand).toMatch(/micro-small/i)
  })
})

describe('parseMainSheet mappings', () => {
  it('maps a control to NIST 800-53 R5 exactly as the workbook cell holds it', () => {
    const id = exp.sampleMapped(exp.nist)
    const c = result.controls.find((x) => x.id === id)!
    expect(c.mappings[exp.nist]).toEqual(exp.rawMappingRefs(id, exp.nist))
  })
  it('splits multi-value mapping cells on newline', () => {
    const id = exp.sampleMapped(exp.iso, 2)
    const c = result.controls.find((x) => x.id === id)!
    const refs = exp.rawMappingRefs(id, exp.iso)
    expect(refs.length).toBeGreaterThan(1)
    expect(c.mappings[exp.iso]).toEqual(refs)
  })
  it('discovers a large number of framework columns', () => {
    expect(result.discoveredFrameworkHeaders.length).toBeGreaterThanOrEqual(200)
  })
  it('reports zero unmapped columns', () => {
    expect(result.unmapped).toEqual([])
  })
})

describe('parseMainSheet matrices and baselines', () => {
  it('links GOV-01 risks from the risk matrix', () => {
    const linked = exp.rawLinkedIds('GOV-01', 'risk')
    expect(linked.length).toBeGreaterThan(0)
    expect([...gov01.riskIds].sort()).toEqual([...linked].sort())
  })
  it('links GOV-01 threats from the threat matrix', () => {
    const linked = exp.rawLinkedIds('GOV-01', 'threat')
    expect(linked.length).toBeGreaterThan(0)
    expect([...gov01.threatIds].sort()).toEqual([...linked].sort())
  })
  it('captures baseline definitions and membership', () => {
    expect(result.baselineDefs.length).toBeGreaterThanOrEqual(3)
    const labels = exp.rawBaselineLabels('GOV-01')
    expect(labels.length).toBeGreaterThan(0)
    const ids = labels.map((l) => result.baselineDefs.find((b) => b.label === l)?.id)
    expect(ids.every(Boolean)).toBe(true)
    expect([...gov01.baselines].sort()).toEqual([...(ids as string[])].sort())
  })
})
