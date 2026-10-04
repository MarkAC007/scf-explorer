import { describe, it, expect } from 'vitest'
import { sheet, fixtureExpectations } from '../helpers/fixture'
import { parseDomains } from '../../src/parser/sheets/domains'
import { parseSources } from '../../src/parser/sheets/sources'
import { parseRiskCatalog, parseThreatCatalog } from '../../src/parser/sheets/catalogs'

describe('parseDomains', () => {
  const domains = parseDomains(sheet(/domains & principles/i))
  it('parses every domain row', () => {
    expect(domains).toHaveLength(fixtureExpectations().domainCount)
    expect(domains.map((d) => d.id).sort()).toEqual([...fixtureExpectations().domainNames.keys()].sort())
  })
  it('parses GOV with principle, intent and count', () => {
    const gov = domains.find((d) => d.id === 'GOV')
    expect(gov).toBeDefined()
    expect(gov!.name).toMatch(/governance/i)
    expect(gov!.principle.length).toBeGreaterThan(20)
    expect(gov!.intent.length).toBeGreaterThan(20)
    // 2026.3 dropped the Control Count column; parseWorkbook derives it from the main sheet instead
    if (fixtureExpectations().hasDomainControlCount) expect(gov!.controlCount).toBeGreaterThan(0)
    else expect(gov!.controlCount).toBe(0)
  })
})

describe('parseSources', () => {
  const sources = parseSources(sheet(/authoritative sources|focal documents/i))
  it('parses a large catalog', () => {
    expect(sources.length).toBeGreaterThanOrEqual(200)
  })
  it('contains NIST 800-53 R5 with links and geography', () => {
    const f = sources.find((s) => s.id === fixtureExpectations().nist)
    expect(f).toBeDefined()
    expect(f!.fromSources).toBe(true)
    expect(f!.geography.length).toBeGreaterThan(0)
    expect(f!.name).toMatch(/800\s*-\s*53/)
  })
})

describe('parseRiskCatalog', () => {
  const risks = parseRiskCatalog(sheet(/risk catalog/i))
  it('parses risks with ids and descriptions', () => {
    expect(risks.length).toBeGreaterThanOrEqual(35)
    const r = risks.find((x) => x.id === 'R-AC-1')
    expect(r).toBeDefined()
    expect(r!.description.length).toBeGreaterThan(10)
  })
  it('carries grouping forward onto continuation rows', () => {
    expect(risks.every((r) => r.grouping.length > 0)).toBe(true)
  })
})

describe('parseThreatCatalog', () => {
  const threats = parseThreatCatalog(sheet(/threat catalog/i))
  it('parses threats with ids', () => {
    expect(threats.length).toBeGreaterThanOrEqual(35)
    const t = threats.find((x) => x.id === 'MT-1')
    expect(t).toBeDefined()
    expect(t!.description.length).toBeGreaterThan(10)
  })
  it('carries grouping forward', () => {
    expect(threats.every((t) => t.grouping.length > 0)).toBe(true)
  })
})
