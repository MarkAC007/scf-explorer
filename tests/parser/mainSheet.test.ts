import { describe, it, expect } from 'vitest'
import { sheet } from '../helpers/fixture'
import { parseMainSheet } from '../../src/parser/sheets/mainSheet'
import { parseSources } from '../../src/parser/sheets/sources'

const knownFrameworks = parseSources(sheet(/authoritative sources/i))
const result = parseMainSheet(sheet(/^scf 20/i), knownFrameworks)
const gov01 = result.controls.find((c) => c.id === 'GOV-01')!

describe('parseMainSheet core fields', () => {
  it('parses every fixture control row', () => {
    expect(result.controls.length).toBe(101)
    expect(result.controls.every((c) => /^(GOV|AST)-/.test(c.id))).toBe(true)
  })
  it('parses GOV-01 core fields', () => {
    expect(gov01).toBeDefined()
    expect(gov01.domainId).toBe('GOV')
    expect(gov01.name).toMatch(/program/i)
    expect(gov01.description).toMatch(/^Mechanisms exist/)
    expect(gov01.question).toMatch(/^Does the organization/)
    expect(gov01.weighting).toBe(10)
    expect(gov01.pptdf).toEqual(['Process'])
    expect(gov01.csfFunction).toBe('Govern')
    expect(gov01.cadence).toBe('Annual')
    expect(gov01.scrmTiers).toEqual([1, 2, 3])
  })
  it('parses six maturity levels with per-control text', () => {
    expect(gov01.maturity).toHaveLength(6)
    expect(gov01.maturity.map((m) => m.level)).toEqual([0, 1, 2, 3, 4, 5])
    expect(gov01.maturity.every((m) => m.text.length > 20)).toBe(true)
    expect(gov01.maturity[1].title).toMatch(/performed informally/i)
  })
  it('parses ERL references', () => {
    expect(gov01.erlIds).toContain('E-GOV-01')
  })
  it('parses solutions by size band', () => {
    expect(gov01.solutions.length).toBeGreaterThanOrEqual(4)
    expect(gov01.solutions[0].sizeBand).toMatch(/micro-small/i)
  })
})

describe('parseMainSheet mappings', () => {
  it('maps GOV-01 to NIST 800-53 R5 PM-01', () => {
    expect(gov01.mappings['nist-800-53-r5']).toContain('PM-01')
  })
  it('splits multi-value mapping cells on newline', () => {
    const iso = gov01.mappings['iso-27002-2022']
    expect(iso).toEqual(['5.1', '5.4', '5.37'])
  })
  it('discovers a large number of framework columns', () => {
    expect(result.discoveredFrameworkHeaders.length).toBeGreaterThanOrEqual(200)
  })
  it('reports zero unmapped columns for 2026.1.1', () => {
    expect(result.unmapped).toEqual([])
  })
})

describe('parseMainSheet matrices and baselines', () => {
  it('links GOV-01 risks from the risk matrix', () => {
    expect(gov01.riskIds).toContain('R-AC-1')
    expect(gov01.riskIds).toContain('R-GV-1')
  })
  it('links GOV-01 threats from the threat matrix', () => {
    expect(gov01.threatIds).toContain('NT-7')
    expect(gov01.threatIds).toContain('MT-1')
  })
  it('captures baseline definitions and membership', () => {
    expect(result.baselineDefs.length).toBeGreaterThanOrEqual(6)
    const esp1 = result.baselineDefs.find((b) => /esp level 1/i.test(b.label))
    expect(esp1).toBeDefined()
    expect(gov01.baselines).toContain(esp1!.id)
  })
})
