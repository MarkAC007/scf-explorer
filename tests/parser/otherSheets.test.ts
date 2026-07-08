import { describe, it, expect } from 'vitest'
import { sheet } from '../helpers/fixture'
import { parseAssessmentObjectives } from '../../src/parser/sheets/assessmentObjectives'
import { parseErl } from '../../src/parser/sheets/erl'
import { parseCompensating } from '../../src/parser/sheets/compensating'
import { parsePrivacyPrinciples } from '../../src/parser/sheets/privacy'

describe('parseAssessmentObjectives', () => {
  const aos = parseAssessmentObjectives(sheet(/^assessment objectives/i))
  it('parses AOs keyed to controls', () => {
    expect(aos.length).toBeGreaterThan(100)
    const gov01 = aos.filter((a) => a.controlId === 'GOV-01')
    expect(gov01.length).toBeGreaterThanOrEqual(1)
    expect(gov01[0].id).toMatch(/^GOV-01_A/)
    expect(gov01[0].text.length).toBeGreaterThan(20)
  })
  it('parses rigor as number', () => {
    expect(aos.some((a) => a.rigor !== null && a.rigor >= 1)).toBe(true)
  })
})

describe('parseErl', () => {
  const erl = parseErl(sheet(/^evidence request list/i))
  it('parses artifacts with control mappings', () => {
    expect(erl.length).toBeGreaterThan(10)
    const e = erl.find((x) => x.id === 'E-GOV-01')
    expect(e).toBeDefined()
    expect(e!.artifact.length).toBeGreaterThan(3)
    expect(e!.controlIds).toContain('GOV-01')
  })
})

describe('parseCompensating', () => {
  const comp = parseCompensating(sheet(/^compensating controls/i))
  it('parses one entry per control', () => {
    expect(comp.length).toBe(101)
  })
  it('GOV-01 is not eligible and has zero options', () => {
    const g = comp.find((c) => c.controlId === 'GOV-01')!
    expect(g.riskNote).toMatch(/not applicable/i)
    expect(g.options).toEqual([])
  })
  it('collects options only when a real compensating control id is present', () => {
    for (const c of comp) {
      for (const o of c.options) {
        expect(o.id).not.toMatch(/^n\/?a$/i)
        expect(o.id.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('parsePrivacyPrinciples', () => {
  const pps = parsePrivacyPrinciples(sheet(/data privacy mgmt principles/i))
  it('groups rows by principle and collects control ids', () => {
    expect(pps.length).toBeGreaterThanOrEqual(1)
    const p1 = pps.find((p) => p.num === 1)!
    expect(p1.name).toBe('Data Privacy by Design')
    expect(p1.controlIds).toContain('GOV-01')
  })
  it('collects privacy framework mappings', () => {
    const p1 = pps.find((p) => p.num === 1)!
    expect(Object.keys(p1.mappings).length).toBeGreaterThan(0)
  })
})
