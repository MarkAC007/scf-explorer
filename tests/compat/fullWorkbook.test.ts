/**
 * Release-independent invariants on a parsed FULL SCF workbook.
 *
 * These are the signals a "green build" failed to give when SCF 2026.3 shipped: the
 * viewer loaded the new release but every risk linked every control, sources were
 * empty and ERL artifacts blank. Each assertion below would have gone red on 2026.3
 * before #35–#38, and must hold for any release the parser claims to support.
 *
 * Run: SCF_XLSX=/path/to/scf.xlsx npx vitest run tests/compat
 * (CI runs it once per release in the `compat` matrix.)
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseWorkbook } from '../../src/parser/parseWorkbook'
import { buildIndexes } from '../../src/model/indexes'
import { expectationsFromFile } from '../helpers/expected'

const SCF = process.env.SCF_XLSX

describe.skipIf(!SCF)('full workbook: release-independent invariants', () => {
  if (!SCF) return
  const buf = readFileSync(SCF)
  const model = parseWorkbook(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), 'scf.xlsx')
  const ix = buildIndexes(model)
  const exp = expectationsFromFile(SCF)

  it('every data sheet is found and every main-sheet column is classified', () => {
    expect(model.parseReport.warnings.filter((w) => /sheet not found/i.test(w))).toEqual([])
    expect(model.parseReport.unmappedColumns).toEqual([])
    expect(model.parseReport.sheets.length).toBeGreaterThanOrEqual(9)
  })

  it('version, control and domain counts match the workbook', () => {
    expect(model.version).toMatch(/^\d{4}\.\d/)
    expect(model.version).toBe(exp.version)
    expect(model.controls).toHaveLength(exp.controlCount)
    expect(model.controls.length).toBeGreaterThan(1000)
    expect(model.domains).toHaveLength(exp.domainCount)
    expect(model.domains.length).toBeGreaterThanOrEqual(30)
    const perDomain = model.domains.reduce((s, d) => s + d.controlCount, 0)
    expect(perDomain, 'domain controlCount sum').toBe(model.controls.length)
  })

  it('no bookkeeping column is mistaken for a framework', () => {
    const bogus = model.frameworks.filter((f) => /legacy|orphaned|compensating|risk-if|errata/i.test(f.id))
    expect(bogus.map((f) => f.id)).toEqual([])
    for (const c of model.controls) {
      for (const fw of Object.keys(c.mappings)) expect(ix.frameworkById.has(fw), `${c.id} → ${fw}`).toBe(true)
    }
  })

  it('sources sheet enriches a large catalog of frameworks', () => {
    const fromSources = model.frameworks.filter((f) => f.fromSources)
    expect(fromSources.length).toBeGreaterThan(200)
    expect(ix.frameworkById.get(exp.nist)?.fromSources, exp.nist).toBe(true)
    expect(ix.frameworkById.get(exp.iso)?.fromSources, exp.iso).toBe(true)
  })

  it('risk and threat matrices link selectively, not every control to everything', () => {
    expect(model.risks.length).toBeGreaterThan(30)
    expect(model.threats.length).toBeGreaterThan(30)
    // A handful of umbrella controls legitimately link every risk (GOV-02.1 in 2026.1.1);
    // the 2026.3 regression was that EVERY control did.
    const allRisks = model.controls.filter((c) => c.riskIds.length === model.risks.length).length
    const allThreats = model.controls.filter((c) => c.threatIds.length === model.threats.length).length
    expect(allRisks / model.controls.length, 'share of controls linking every risk').toBeLessThan(0.1)
    expect(allThreats / model.controls.length, 'share of controls linking every threat').toBeLessThan(0.1)
    expect(model.controls.some((c) => c.riskIds.length > 0)).toBe(true)
    expect(model.controls.some((c) => c.threatIds.length > 0)).toBe(true)
    // Likewise some catalog entries genuinely apply everywhere (2026.3 rates 15 natural
    // threats "Possible" for every control); the regression was that ALL of them did.
    const n = model.controls.length
    const risksEverywhere = model.risks.filter((r) => (ix.controlsByRisk.get(r.id)?.length ?? 0) === n).length
    const threatsEverywhere = model.threats.filter((t) => (ix.controlsByThreat.get(t.id)?.length ?? 0) === n).length
    expect(risksEverywhere / model.risks.length, 'share of risks linked to every control').toBeLessThan(0.5)
    expect(threatsEverywhere / model.threats.length, 'share of threats linked to every control').toBeLessThan(0.5)
  })

  it('every ERL item has an artifact and maps to real controls', () => {
    expect(model.erlItems.length).toBe(exp.erlCount)
    expect(model.erlItems.length).toBeGreaterThan(100)
    expect(model.erlItems.filter((e) => e.artifact.trim() === '').map((e) => e.id)).toEqual([])
    for (const e of model.erlItems) {
      for (const cid of e.controlIds) expect(ix.controlById.has(cid), `${e.id} → ${cid}`).toBe(true)
    }
  })

  it('assessment objectives carry rigor and belong to real controls', () => {
    expect(model.assessmentObjectives).toHaveLength(exp.aoCount)
    const withRigor = model.assessmentObjectives.filter((a) => a.rigor != null).length
    expect(withRigor / model.assessmentObjectives.length).toBeGreaterThan(0.9)
    const orphans = model.assessmentObjectives.filter((a) => !ix.controlById.has(a.controlId))
    expect(orphans.map((a) => a.id)).toEqual([])
  })

  it('compensating controls cover every control, from whichever layout the release uses', () => {
    expect(model.compensating).toHaveLength(model.controls.length)
    expect(model.compensating.reduce((s, c) => s + c.options.length, 0)).toBeGreaterThan(100)
  })

  it('privacy principles and baselines are populated', () => {
    expect(model.privacyPrinciples.length).toBeGreaterThan(50)
    expect(model.privacyPrinciples.reduce((s, p) => s + p.controlIds.length, 0)).toBeGreaterThan(100)
    expect(model.baselineDefs.length).toBeGreaterThanOrEqual(3)
    for (const b of model.baselineDefs) {
      expect(ix.controlsByBaseline.get(b.id)?.length ?? 0, b.label).toBeGreaterThan(0)
    }
  })
})
