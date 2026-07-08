/**
 * Data-integrity cross-check: the app's SheetJS parsing pipeline vs an independent
 * openpyxl extraction of the same workbook (scripts/ground-truth.py).
 *
 * Run:
 *   SCF_XLSX=/path/to/scf.xlsx python3 scripts/ground-truth.py > /tmp/scf-ground-truth.json
 *   SCF_XLSX=/path/to/scf.xlsx GROUND_TRUTH=/tmp/scf-ground-truth.json npx vitest run tests/integrity
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { parseWorkbook } from '../../src/parser/parseWorkbook'
import { buildIndexes } from '../../src/model/indexes'

const SCF = process.env.SCF_XLSX
const GT = process.env.GROUND_TRUTH

const md5 = (s: string): string => createHash('md5').update(s).digest('hex')
const collapse = (s: string): string => s.replace(/\s+/g, ' ').trim()

describe.skipIf(!SCF || !GT)('real workbook vs independent ground truth', () => {
  if (!SCF || !GT) return
  const gt = JSON.parse(readFileSync(GT, 'utf8'))
  const buf = readFileSync(SCF)
  const model = parseWorkbook(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    'scf.xlsx',
  )
  const ix = buildIndexes(model)

  it('parses cleanly: all sheets matched, no warnings, no unmapped columns', () => {
    expect(model.parseReport.warnings).toEqual([])
    expect(model.parseReport.unmappedColumns).toEqual([])
    expect(model.parseReport.sheets.length).toBeGreaterThanOrEqual(9)
  })

  it('control set is identical (count + exact id hash)', () => {
    expect(model.controls.length).toBe(gt.mainSheet.controls)
    const idsHash = md5(model.controls.map((c) => c.id).sort().join('|'))
    expect(idsHash).toBe(gt.mainSheet.idsHash)
  })

  it('core field aggregates match', () => {
    let wSum = 0
    let wNull = 0
    let pptdf = 0
    let erlRefs = 0
    for (const c of model.controls) {
      if (c.weighting == null) wNull++
      else wSum += c.weighting
      pptdf += c.pptdf.length
      erlRefs += c.erlIds.length
    }
    expect(wSum).toBe(gt.mainSheet.weightingSum)
    expect(wNull).toBe(gt.mainSheet.weightingNull)
    expect(pptdf).toBe(gt.mainSheet.pptdfTotal)
    expect(erlRefs).toBe(gt.mainSheet.erlRefsTotal)
  })

  it('every mapping cell and reference survives (30k+ cells, 67k+ refs)', () => {
    let cells = 0
    let refs = 0
    for (const c of model.controls) {
      for (const r of Object.values(c.mappings)) {
        cells++
        refs += r.length
      }
    }
    expect(cells).toBe(gt.mainSheet.mappingCells)
    expect(refs).toBe(gt.mainSheet.mappingRefs)
    expect(ix.controlsByFramework.size).toBe(gt.mainSheet.mappedFrameworks)
  })

  it('per-framework control counts match for every framework', () => {
    const mismatches: string[] = []
    for (const [fw, count] of Object.entries(gt.mainSheet.perFrameworkControls)) {
      const got = ix.controlsByFramework.get(fw)?.length ?? 0
      if (got !== count) mismatches.push(`${fw}: app=${got} truth=${count}`)
    }
    expect(mismatches).toEqual([])
  })

  it('risk/threat matrices match link-for-link', () => {
    const risk = model.controls.reduce((s, c) => s + c.riskIds.length, 0)
    const threat = model.controls.reduce((s, c) => s + c.threatIds.length, 0)
    expect(risk).toBe(gt.mainSheet.riskLinks)
    expect(threat).toBe(gt.mainSheet.threatLinks)
  })

  it('maturity, solutions, baselines and SCRM tiers match', () => {
    const mat = model.controls.reduce(
      (s, c) => s + c.maturity.filter((m) => m.text !== '').length,
      0,
    )
    const sol = model.controls.reduce((s, c) => s + c.solutions.length, 0)
    expect(mat).toBe(gt.mainSheet.maturityNonEmpty)
    expect(sol).toBe(gt.mainSheet.solutionsNonEmpty)
    for (const [b, count] of Object.entries(gt.mainSheet.baselineCounts)) {
      expect(ix.controlsByBaseline.get(b)?.length ?? 0, `baseline ${b}`).toBe(count)
    }
    for (const tier of [1, 2, 3]) {
      const got = model.controls.filter((c) => c.scrmTiers.includes(tier)).length
      expect(got, `tier ${tier}`).toBe(gt.mainSheet.tierCounts[String(tier)])
    }
  })

  it('supporting sheets match: domains, sources, AOs, ERL, compensating, privacy, catalogs', () => {
    expect(model.domains.map((d) => d.id).sort()).toEqual(gt.domains.ids)
    expect(model.frameworks.filter((f) => f.fromSources).length).toBe(
      gt.sources.uniqueCount,
    )
    expect(model.assessmentObjectives.length).toBe(gt.aos.count)
    expect(
      model.assessmentObjectives.filter((a) => a.rigor != null).length,
    ).toBe(gt.aos.rigorNonNull)
    expect(model.erlItems.length).toBe(gt.erl.count)
    expect(model.erlItems.reduce((s, e) => s + e.controlIds.length, 0)).toBe(
      gt.erl.controlLinks,
    )
    let unionLinks = 0
    for (const list of ix.erlByControl.values()) unionLinks += list.length
    expect(unionLinks, 'evidence union links').toBe(gt.erl.unionLinks)
    expect(model.compensating.length).toBe(gt.compensating.count)
    expect(model.compensating.reduce((s, c) => s + c.options.length, 0)).toBe(
      gt.compensating.options,
    )
    expect(model.privacyPrinciples.length).toBe(gt.privacy.principles)
    expect(
      model.privacyPrinciples.reduce((s, p) => s + p.controlIds.length, 0),
    ).toBe(gt.privacy.controlLinks)
    expect(model.risks.map((r) => r.id).sort()).toEqual(gt.risks.ids)
    expect(model.threats.map((t) => t.id).sort()).toEqual(gt.threats.ids)
  })

  it('EVERY control matches content-hash-for-content-hash (all fields, all mappings)', () => {
    const mismatches: string[] = []
    for (const c of model.controls) {
      const ser = [
        c.id,
        collapse(c.name),
        collapse(c.description),
        collapse(c.question),
        collapse(c.cadence),
        collapse(c.csfFunction),
        c.weighting == null ? '' : String(c.weighting),
        c.pptdf.join(';'),
        c.erlIds.join(';'),
        [...c.riskIds].sort().join(';'),
        [...c.threatIds].sort().join(';'),
        [...c.maturity]
          .sort((a, b) => a.level - b.level)
          .map((m) => collapse(m.text))
          .join('|'),
        c.solutions.map((x) => collapse(x.text)).join('|'),
        Object.keys(c.mappings)
          .sort()
          .map((fw) => `${fw}=${c.mappings[fw].join(';')}`)
          .join('|'),
      ].join('\x1f')
      if (md5(ser) !== gt.mainSheet.controlHashes[c.id]) mismatches.push(c.id)
    }
    expect(mismatches, 'controls whose full content differs from source').toEqual([])
    expect(Object.keys(gt.mainSheet.controlHashes).length).toBe(model.controls.length)
  })

  it('supporting sheets match content-hash-for-content-hash', () => {
    const joinSorted = (rows: string[]): string => [...rows].sort().join('\n')
    const aoRows = model.assessmentObjectives.map((a) =>
      [
        a.id,
        a.controlId,
        collapse(a.text),
        a.rigor == null ? '' : String(a.rigor),
        a.origins.join(';'),
      ].join('\x1f'),
    )
    expect(md5(joinSorted(aoRows)), 'assessment objectives content').toBe(
      gt.aos.contentHash,
    )
    const erlRows = model.erlItems.map((e) =>
      [
        e.id,
        collapse(e.areaOfFocus),
        collapse(e.artifact),
        collapse(e.description),
        e.controlIds.join(';'),
      ].join('\x1f'),
    )
    expect(md5(joinSorted(erlRows)), 'ERL content').toBe(gt.erl.contentHash)
    const compRows = model.compensating.map((c) =>
      [
        c.controlId,
        collapse(c.riskNote),
        c.options
          .map(
            (o) => `${collapse(o.id)}:${collapse(o.name)}:${collapse(o.justification)}`,
          )
          .join('|'),
      ].join('\x1f'),
    )
    expect(md5(joinSorted(compRows)), 'compensating content').toBe(
      gt.compensating.contentHash,
    )
    const domRows = model.domains.map((d) =>
      [d.id, collapse(d.name), collapse(d.principle), collapse(d.intent)].join('\x1f'),
    )
    expect(md5(joinSorted(domRows)), 'domains content').toBe(gt.domains.contentHash)
    const riskRows = model.risks.map((r) =>
      [r.id, collapse(r.name), collapse(r.description)].join('\x1f'),
    )
    expect(md5(joinSorted(riskRows)), 'risk catalog content').toBe(gt.risks.contentHash)
    const threatRows = model.threats.map((t) =>
      [t.id, collapse(t.name), collapse(t.description)].join('\x1f'),
    )
    expect(md5(joinSorted(threatRows)), 'threat catalog content').toBe(
      gt.threats.contentHash,
    )
  })

  it('sample controls match field-for-field, including exact text and mapping refs', () => {
    for (const [id, truth] of Object.entries<Record<string, unknown>>(gt.samples)) {
      const c = ix.controlById.get(id)
      expect(c, id).toBeDefined()
      expect(c!.description, `${id} description`).toBe(truth.description)
      expect(c!.question, `${id} question`).toBe(truth.question)
      expect(collapse(c!.cadence), `${id} cadence`).toBe(truth.cadence)
      expect(collapse(c!.csfFunction), `${id} csf`).toBe(truth.csf)
      expect(c!.weighting, `${id} weighting`).toBe(truth.weighting)
      expect(c!.pptdf, `${id} pptdf`).toEqual(truth.pptdf)
      expect(c!.erlIds, `${id} erl`).toEqual(truth.erlIds)
      expect([...c!.riskIds].sort(), `${id} risks`).toEqual(truth.riskIds)
      expect([...c!.threatIds].sort(), `${id} threats`).toEqual(truth.threatIds)
      expect(Object.keys(c!.mappings).length, `${id} fw count`).toBe(
        truth.mappingFrameworkCount,
      )
      const matHash = md5(
        [...c!.maturity]
          .sort((a, b) => a.level - b.level)
          .map((m) => collapse(m.text))
          .join('|'),
      )
      expect(matHash, `${id} maturity`).toBe(truth.maturityHash)
      for (const [fw, refs] of Object.entries(
        truth.mappings as Record<string, string[]>,
      )) {
        expect(c!.mappings[fw] ?? [], `${id} → ${fw}`).toEqual(refs)
      }
    }
  })
})
