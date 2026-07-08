import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseWorkbook } from '../../src/parser/parseWorkbook'
import { buildIndexes } from '../../src/model/indexes'

const buf = readFileSync(join(__dirname, '../fixtures/scf-fixture.xlsx'))
const model = parseWorkbook(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), 'scf-fixture.xlsx')

describe('parseWorkbook', () => {
  it('detects the SCF version from the main sheet name', () => {
    expect(model.version).toBe('2026.1')
  })
  it('matches all nine data sheets with no warnings', () => {
    expect(model.parseReport.sheets.length).toBeGreaterThanOrEqual(9)
    expect(model.parseReport.warnings).toEqual([])
  })
  it('assembles all collections', () => {
    expect(model.domains).toHaveLength(33)
    expect(model.controls).toHaveLength(101)
    expect(model.frameworks.length).toBeGreaterThanOrEqual(200)
    expect(model.risks.length).toBeGreaterThanOrEqual(35)
    expect(model.threats.length).toBeGreaterThanOrEqual(35)
    expect(model.assessmentObjectives.length).toBeGreaterThan(100)
    expect(model.erlItems.length).toBeGreaterThan(10)
    expect(model.compensating).toHaveLength(101)
    expect(model.privacyPrinciples.length).toBeGreaterThanOrEqual(1)
    expect(model.baselineDefs.length).toBeGreaterThanOrEqual(6)
  })
  it('records source metadata', () => {
    expect(model.sourceFileName).toBe('scf-fixture.xlsx')
    expect(model.parsedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})

describe('buildIndexes', () => {
  const ix = buildIndexes(model)
  it('indexes controls by id and domain', () => {
    expect(ix.controlById.get('GOV-01')!.name).toMatch(/program/i)
    expect(ix.controlsByDomain.get('GOV')!.length).toBeGreaterThan(10)
  })
  it('builds framework reverse index', () => {
    const mapped = ix.controlsByFramework.get('nist-800-53-r5')!
    expect(mapped.some((c) => c.id === 'GOV-01')).toBe(true)
  })
  it('builds risk/threat reverse indexes consistent with forward links', () => {
    const viaRisk = ix.controlsByRisk.get('R-GV-1') ?? []
    expect(viaRisk.some((c) => c.id === 'GOV-01')).toBe(true)
    for (const c of viaRisk) expect(c.riskIds).toContain('R-GV-1')
  })
  it('indexes AOs and ERL by control', () => {
    expect(ix.aosByControl.get('GOV-01')!.length).toBeGreaterThanOrEqual(1)
    expect(ix.erlByControl.get('GOV-01')!.some((e) => e.id === 'E-GOV-01')).toBe(true)
  })
  it('computes stats', () => {
    expect(ix.stats.controls).toBe(101)
    expect(ix.stats.mappedFrameworks).toBeGreaterThan(100)
    expect(ix.stats.mappedFrameworks).toBeLessThanOrEqual(ix.stats.frameworks)
  })
})
