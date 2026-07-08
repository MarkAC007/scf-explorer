import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseWorkbook } from '../../src/parser/parseWorkbook'
import { buildSearch } from '../../src/search/searchIndex'
import { applyFilters } from '../../src/views/controlsFilter'
import { toCsv } from '../../src/lib/csv'

const buf = readFileSync(join(__dirname, '../fixtures/scf-fixture.xlsx'))
const model = parseWorkbook(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  'f.xlsx',
)
const search = buildSearch(model.controls)

describe('applyFilters', () => {
  it('no filters returns all controls', () => {
    expect(applyFilters(model.controls, {}, search)).toHaveLength(101)
  })
  it('filters by domain', () => {
    const out = applyFilters(model.controls, { domain: 'GOV' }, search)
    expect(out.length).toBeGreaterThan(10)
    expect(out.every((c) => c.domainId === 'GOV')).toBe(true)
  })
  it('filters by pptdf and csf function', () => {
    const out = applyFilters(model.controls, { pptdf: ['Process'], csf: ['Govern'] }, search)
    expect(out.length).toBeGreaterThan(0)
    expect(out.every((c) => c.pptdf.includes('Process') && c.csfFunction === 'Govern')).toBe(true)
  })
  it('filters by framework mapping presence', () => {
    const out = applyFilters(model.controls, { framework: 'nist-800-53-r5' }, search)
    expect(out.length).toBeGreaterThan(0)
    expect(out.every((c) => 'nist-800-53-r5' in c.mappings)).toBe(true)
  })
  it('filters by minimum weighting', () => {
    const out = applyFilters(model.controls, { weightMin: 8 }, search)
    expect(out.every((c) => (c.weighting ?? 0) >= 8)).toBe(true)
  })
  it('full-text search finds GOV-01 from description words', () => {
    const out = applyFilters(model.controls, { query: 'security compliance resilience program' }, search)
    expect(out.some((c) => c.id === 'GOV-01')).toBe(true)
  })
  it('search by exact control id works', () => {
    const out = applyFilters(model.controls, { query: 'GOV-01' }, search)
    expect(out[0].id).toBe('GOV-01')
  })
  it('composes search with facets', () => {
    const out = applyFilters(model.controls, { query: 'program', domain: 'AST' }, search)
    expect(out.every((c) => c.domainId === 'AST')).toBe(true)
  })
})

describe('toCsv', () => {
  it('quotes fields containing commas, quotes and newlines', () => {
    const csv = toCsv([
      { a: 'plain', b: 'has,comma', c: 'has "quote"', d: 'line\nbreak' },
    ])
    expect(csv).toBe('a,b,c,d\r\nplain,"has,comma","has ""quote""","line\nbreak"')
  })
  it('handles empty input', () => {
    expect(toCsv([])).toBe('')
  })
})
