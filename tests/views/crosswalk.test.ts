import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseWorkbook } from '../../src/parser/parseWorkbook'
import { buildIndexes } from '../../src/model/indexes'
import { coverage, overlap } from '../../src/views/crosswalk'

const buf = readFileSync(join(__dirname, '../fixtures/scf-fixture.xlsx'))
const model = parseWorkbook(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  'f.xlsx',
)
const ix = buildIndexes(model)

describe('coverage', () => {
  const cov = coverage('nist-800-53-r5', ix, model)

  it('lists every control mapped to the framework', () => {
    expect(cov.controls.length).toBeGreaterThan(0)
    expect(cov.controls.every((c) => 'nist-800-53-r5' in c.mappings)).toBe(true)
  })
  it('computes per-domain coverage against domain totals', () => {
    const gov = cov.domainCoverage.find((d) => d.domain.id === 'GOV')
    expect(gov).toBeDefined()
    expect(gov!.mapped).toBeGreaterThan(0)
    expect(gov!.mapped).toBeLessThanOrEqual(gov!.total)
  })
  it('only reports domains present in the model controls', () => {
    for (const d of cov.domainCoverage) expect(d.total).toBeGreaterThan(0)
  })
})

describe('overlap', () => {
  const o = overlap('nist-800-53-r5', 'iso-27002-2022', ix)

  it('partitions into shared / onlyA / onlyB with no intersection', () => {
    const shared = new Set(o.shared.map((c) => c.id))
    for (const c of o.onlyA) expect(shared.has(c.id)).toBe(false)
    for (const c of o.onlyB) expect(shared.has(c.id)).toBe(false)
    expect(o.shared.length + o.onlyA.length).toBe(
      ix.controlsByFramework.get('nist-800-53-r5')!.length,
    )
    expect(o.shared.length + o.onlyB.length).toBe(
      ix.controlsByFramework.get('iso-27002-2022')!.length,
    )
  })
  it('shared controls map to both frameworks', () => {
    expect(o.shared.length).toBeGreaterThan(0)
    for (const c of o.shared) {
      expect('nist-800-53-r5' in c.mappings).toBe(true)
      expect('iso-27002-2022' in c.mappings).toBe(true)
    }
  })
})
