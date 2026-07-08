import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseWorkbook } from '../../src/parser/parseWorkbook'
import { buildIndexes } from '../../src/model/indexes'
import {
  scopeControlIds,
  marginalAdds,
  spineEdge,
  domainCoverage,
  weightingProfile,
  pptdfSplit,
  evidenceRollup,
  solutionsRollup,
} from '../../src/scope/scopeMath'

const buf = readFileSync(join(__dirname, '../fixtures/scf-fixture.xlsx'))
const model = parseWorkbook(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  'f.xlsx',
)
const ix = buildIndexes(model)

const FW_A = 'nist-800-53-r5'
const FW_B = 'iso-27002-2022'

describe('scopeControlIds', () => {
  it('is the union of the frameworks control sets', () => {
    const a = new Set(ix.controlsByFramework.get(FW_A)!.map((c) => c.id))
    const b = new Set(ix.controlsByFramework.get(FW_B)!.map((c) => c.id))
    const union = scopeControlIds([FW_A, FW_B], ix)
    expect(union.size).toBe(new Set([...a, ...b]).size)
    for (const id of a) expect(union.has(id)).toBe(true)
    for (const id of b) expect(union.has(id)).toBe(true)
  })
  it('empty selection gives empty set; unknown ids are ignored', () => {
    expect(scopeControlIds([], ix).size).toBe(0)
    expect(scopeControlIds(['no-such-framework'], ix).size).toBe(0)
  })
})

describe('marginalAdds', () => {
  it('counts controls only that framework contributes', () => {
    const m = marginalAdds([FW_A, FW_B], ix)
    const a = new Set(ix.controlsByFramework.get(FW_A)!.map((c) => c.id))
    const b = new Set(ix.controlsByFramework.get(FW_B)!.map((c) => c.id))
    const onlyA = [...a].filter((id) => !b.has(id)).length
    const onlyB = [...b].filter((id) => !a.has(id)).length
    expect(m.get(FW_A)).toBe(onlyA)
    expect(m.get(FW_B)).toBe(onlyB)
  })
  it('a single selected framework contributes everything it maps', () => {
    const m = marginalAdds([FW_A], ix)
    expect(m.get(FW_A)).toBe(ix.controlsByFramework.get(FW_A)!.length)
  })
})

describe('spineEdge', () => {
  it('partitions: spine ⊆ union, edges ⊆ union, spine ∩ edges = ∅ (for 2+ fws)', () => {
    const { spine, edges } = spineEdge([FW_A, FW_B], ix)
    const union = scopeControlIds([FW_A, FW_B], ix)
    const spineIds = new Set(spine.map((c) => c.id))
    for (const c of spine) {
      expect(union.has(c.id)).toBe(true)
      expect(FW_A in c.mappings && FW_B in c.mappings).toBe(true)
    }
    for (const c of edges) {
      expect(union.has(c.id)).toBe(true)
      expect(spineIds.has(c.id)).toBe(false)
      expect(Number(FW_A in c.mappings) + Number(FW_B in c.mappings)).toBe(1)
    }
  })
})

describe('shape aggregations', () => {
  const set = scopeControlIds([FW_A], ix)
  it('domainCoverage sums to the scoped set and never exceeds totals', () => {
    const cov = domainCoverage(set, ix, model)
    expect(cov.reduce((s, d) => s + d.scoped, 0)).toBe(set.size)
    for (const d of cov) expect(d.scoped).toBeLessThanOrEqual(d.total)
  })
  it('weightingProfile buckets every scoped control with a weighting', () => {
    const prof = weightingProfile(set, ix)
    const withW = [...set].filter((id) => ix.controlById.get(id)!.weighting != null)
    expect(prof.reduce((s, b) => s + b.count, 0)).toBe(withW.length)
  })
  it('pptdfSplit counts memberships', () => {
    const split = pptdfSplit(set, ix)
    expect(split.find((p) => p.label === 'Process')!.count).toBeGreaterThan(0)
  })
})

describe('evidenceRollup', () => {
  it('dedupes artifacts and lists driving in-scope controls', () => {
    const set = scopeControlIds([FW_A, FW_B], ix)
    const groups = evidenceRollup(set, ix)
    expect(groups.length).toBeGreaterThan(0)
    const seen = new Set<string>()
    for (const g of groups) {
      for (const item of g.items) {
        expect(seen.has(item.erl.id)).toBe(false)
        seen.add(item.erl.id)
        expect(item.drivingControls.length).toBeGreaterThan(0)
        for (const c of item.drivingControls) expect(set.has(c.id)).toBe(true)
      }
    }
    const gov01Erl = groups.flatMap((g) => g.items).find((i) => i.erl.id === 'E-GOV-01')
    expect(gov01Erl).toBeDefined()
  })
})

describe('solutionsRollup', () => {
  it('returns per-domain solution entries for the chosen band', () => {
    const set = scopeControlIds([FW_A], ix)
    const bands = [...ix.controlById.values()][0].solutions.map((s) => s.sizeBand)
    const groups = solutionsRollup(set, ix, bands[0])
    expect(groups.length).toBeGreaterThan(0)
    for (const g of groups) {
      for (const e of g.entries) {
        expect(set.has(e.control.id)).toBe(true)
        expect(e.text.length).toBeGreaterThan(0)
      }
    }
  })
})
