/**
 * Expectations derived from the workbook itself, not from release literals.
 *
 * Reads raw rows with SheetJS (no parser code paths) so tests can assert exact
 * values — control count, domain count, version string, framework slugs — that
 * hold for whichever SCF release the fixture was generated from.
 */
import { readFileSync } from 'node:fs'
import * as XLSX from 'xlsx'
import { normalizeHeader, slugify } from '../../src/parser/headerMatch'

export interface RawControl {
  headers: string[]
  slugs: string[]
  cells: unknown[]
}

export interface WorkbookExpectations {
  mainSheetName: string
  version: string
  controlCount: number
  domainCount: number
  aoCount: number
  /** Slug of the NIST SP 800-53 R5 column (`nist-800-53-r5`, `nist-800-53-r5-2`, …). */
  nist: string
  /** Slug of the ISO/IEC 27002:2022 column. */
  iso: string
  /** Slug of the EU NIS2 column if the release has one. */
  nis2: string | undefined
  /** Control ids in main-sheet order. */
  controlIds: string[]
  /** Domain id → domain name from the domains sheet. */
  domainNames: Map<string, string>
  rawControl: (id: string) => RawControl
  /** One main-sheet cell of a control, by header pattern. */
  rawCell: (id: string, header: RegExp) => unknown
  /** Newline-split values of one main-sheet cell. */
  rawList: (id: string, header: RegExp) => string[]
  /** SCRM focus tiers whose cell is filled for this control. */
  rawTiers: (id: string) => number[]
  /** Baseline column labels (the text after "SCF ") whose cell is filled for this control. */
  rawBaselineLabels: (id: string) => string[]
  /** First control id (main-sheet order) with at least `min` refs in the given framework column. */
  sampleMapped: (slug: string, min?: number) => string
  /** Whether the domains sheet still carries a Control Count column (dropped in 2026.3). */
  hasDomainControlCount: boolean
  /** First ERL row: artifact id and the controls its mapping cell lists. */
  erlSample: { id: string; controlIds: string[] }
  /** First privacy principle row: number, name and the first control it links. */
  privacySample: { num: string; name: string; controlId: string }
  /** Newline-split refs of one mapping cell, as the workbook holds them. */
  rawMappingRefs: (id: string, slug: string) => string[]
  /** Risk/threat ids whose cell links this control (filled and not "Unlikely"). */
  rawLinkedIds: (id: string, kind: 'risk' | 'threat') => string[]
}

const CONTROL_ID = /^[A-Z]{2,4}-\d/
const rows = (ws: XLSX.WorkSheet): unknown[][] =>
  XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null })
const filled = (v: unknown): boolean => v != null && String(v).trim() !== ''
const findSheet = (wb: XLSX.WorkBook, pattern: RegExp): XLSX.WorkSheet => {
  const name = wb.SheetNames.find((n) => pattern.test(n))
  if (!name) throw new Error(`workbook sheet not found: ${pattern}`)
  return wb.Sheets[name]
}
const column = (headers: string[], pattern: RegExp, what: string): number => {
  const i = headers.findIndex((h) => pattern.test(h))
  if (i === -1) throw new Error(`workbook column not found: ${what} (${pattern})`)
  return i
}
const pickSlug = (slugs: string[], pattern: RegExp, what: string): string => {
  const s = slugs.find((x) => pattern.test(x))
  if (!s) throw new Error(`workbook framework column not found: ${what} (${pattern})`)
  return s
}

export const expectationsFor = (wb: XLSX.WorkBook): WorkbookExpectations => {
  const mainSheetName = wb.SheetNames.find((n) => /^scf 20/i.test(n))
  if (!mainSheetName) throw new Error('workbook has no "SCF 20xx" main sheet')
  const main = rows(wb.Sheets[mainSheetName])
  const headers = (main[0] ?? []).map(normalizeHeader)
  const slugs = headers.map(slugify)
  const cId = column(headers, /^scf #$/i, 'control id')
  const controlRows = main.slice(1).filter((r) => CONTROL_ID.test(String(r[cId] ?? '').trim()))
  const byId = new Map(controlRows.map((r) => [String(r[cId]).trim(), r]))

  const dom = rows(findSheet(wb, /domains & principles/i))
  const dh = (dom[0] ?? []).map(normalizeHeader)
  const dId = column(dh, /^scf identifier$/i, 'domain id')
  const dName = column(dh, /^scf domain$/i, 'domain name')
  const domainNames = new Map<string, string>()
  for (const r of dom.slice(1)) {
    if (filled(r[dId])) domainNames.set(String(r[dId]).trim(), String(r[dName] ?? '').trim())
  }

  const ao = rows(findSheet(wb, /^assessment objectives/i))
  const ah = (ao[0] ?? []).map(normalizeHeader)
  const aId = column(ah, /^scf ao #$/i, 'assessment objective id')
  const aoCount = ao.slice(1).filter((r) => filled(r[aId])).length

  const priv = rows(findSheet(wb, /data privacy mgmt principles/i))
  const ph = (priv[0] ?? []).map(normalizeHeader)
  const pNum = column(ph, /^#$/, 'privacy principle number')
  const pName = column(ph, /^principle name$/i, 'privacy principle name')
  const pCtl = column(ph, /^(\d{4}\.\d+ )?scf #$/i, 'privacy control id')
  const pRow = priv.slice(1).find((r) => filled(r[pNum]) && filled(r[pName]) && CONTROL_ID.test(String(r[pCtl] ?? '').trim()))
  if (!pRow) throw new Error('privacy sheet has no principle row with a linked control')
  const pn = pRow[pNum]
  const privacySample = {
    num: typeof pn === 'number' ? String(pn) : String(pn).trim(),
    name: String(pRow[pName]).trim(),
    controlId: String(pRow[pCtl]).trim(),
  }

  const erl = rows(findSheet(wb, /^evidence request list/i))
  const eh = (erl[0] ?? []).map(normalizeHeader)
  const eId = column(eh, /^erl #$/i, 'ERL id')
  const eMap = column(eh, /^scf control mappings$/i, 'ERL control mappings')
  const eRow = erl.slice(1).find((r) => filled(r[eId]) && filled(r[eMap]))
  if (!eRow) throw new Error('ERL sheet has no row with control mappings')
  const erlSample = {
    id: String(eRow[eId]).trim(),
    controlIds: String(eRow[eMap]).split('\n').map((x) => x.trim()).filter(Boolean),
  }

  const rawControl = (id: string): RawControl => {
    const cells = byId.get(id)
    if (!cells) throw new Error(`workbook has no control ${id}`)
    return { headers, slugs, cells }
  }
  const rawMappingRefs = (id: string, slug: string): string[] => {
    const { cells } = rawControl(id)
    const i = slugs.indexOf(slug)
    if (i === -1) throw new Error(`workbook has no column with slug ${slug}`)
    return String(cells[i] ?? '')
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean)
  }
  const rawCell = (id: string, header: RegExp): unknown => {
    const { cells } = rawControl(id)
    return cells[column(headers, header, String(header))]
  }
  const rawList = (id: string, header: RegExp): string[] =>
    String(rawCell(id, header) ?? '')
      .split('\n')
      .map((x) => x.trim())
      .filter(Boolean)
  const rawTiers = (id: string): number[] => {
    const { cells } = rawControl(id)
    const out: number[] = []
    headers.forEach((h, i) => {
      const m = /^scrm focus tier (\d)/i.exec(h)
      if (m && filled(cells[i])) out.push(Number(m[1]))
    })
    return out
  }
  const rawBaselineLabels = (id: string): string[] => {
    const { cells } = rawControl(id)
    const out: string[] = []
    headers.forEach((h, i) => {
      const m = /^scf (community derived|scrms|core .+)$/i.exec(h)
      if (m && filled(cells[i])) out.push(m[1].trim())
    })
    return out
  }
  const sampleMapped = (slug: string, min = 1): string => {
    const i = slugs.indexOf(slug)
    if (i === -1) throw new Error(`workbook has no column with slug ${slug}`)
    const row = controlRows.find((r) => String(r[i] ?? '').split('\n').filter((x) => x.trim()).length >= min)
    if (!row) throw new Error(`no control with >= ${min} refs in ${slug}`)
    return String(row[cId]).trim()
  }
  const rawLinkedIds = (id: string, kind: 'risk' | 'threat'): string[] => {
    const { cells } = rawControl(id)
    const pattern = kind === 'risk' ? /^risk (r-[a-z]{2}-\d+)$/i : /^threat ((?:nt|mt)-\d+)$/i
    const out: string[] = []
    headers.forEach((h, i) => {
      const m = pattern.exec(h)
      if (!m) return
      const v = cells[i]
      if (filled(v) && String(v).trim().toLowerCase() !== 'unlikely') out.push(m[1].toUpperCase())
    })
    return out
  }

  return {
    mainSheetName,
    version: mainSheetName.replace(/^scf\s*/i, '').trim(),
    controlCount: controlRows.length,
    domainCount: domainNames.size,
    aoCount,
    nist: pickSlug(slugs, /^nist-800-53-r5(-\d+)?$/, 'NIST SP 800-53 R5'),
    iso: pickSlug(slugs, /^iso-27002-2022$/, 'ISO/IEC 27002:2022'),
    nis2: slugs.find((s) => /^emea-eu-nis2(-\d{4})?$/.test(s)),
    controlIds: controlRows.map((r) => String(r[cId]).trim()),
    domainNames,
    rawControl,
    rawCell,
    rawList,
    rawTiers,
    rawBaselineLabels,
    sampleMapped,
    hasDomainControlCount: dh.some((h) => /^control count$/i.test(h)),
    erlSample,
    privacySample,
    rawMappingRefs,
    rawLinkedIds,
  }
}

export const expectationsFromFile = (path: string): WorkbookExpectations =>
  expectationsFor(XLSX.read(readFileSync(path), { type: 'buffer' }))
