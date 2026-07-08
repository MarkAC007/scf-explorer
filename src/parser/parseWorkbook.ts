import * as XLSX from 'xlsx'
import type { Framework, ParseReport, ScfModel } from '../model/types'
import { parseDomains } from './sheets/domains'
import { parseSources } from './sheets/sources'
import { parseMainSheet } from './sheets/mainSheet'
import { parseRiskCatalog, parseThreatCatalog } from './sheets/catalogs'
import { parseAssessmentObjectives } from './sheets/assessmentObjectives'
import { parseErl } from './sheets/erl'
import { parseCompensating } from './sheets/compensating'
import { parsePrivacyPrinciples } from './sheets/privacy'

const SHEET_PATTERNS: { key: string; pattern: RegExp }[] = [
  { key: 'main', pattern: /^scf 20/i },
  { key: 'domains', pattern: /domains & principles/i },
  { key: 'sources', pattern: /authoritative sources/i },
  { key: 'compensating', pattern: /^compensating controls/i },
  { key: 'erl', pattern: /^evidence request list/i },
  { key: 'aos', pattern: /^assessment objectives/i },
  { key: 'privacy', pattern: /data privacy mgmt principles/i },
  { key: 'threats', pattern: /threat catalog/i },
  { key: 'risks', pattern: /risk catalog/i },
]

export class NotScfWorkbookError extends Error {
  constructor() {
    super('This workbook has no "SCF 20xx.x" sheet — it does not look like the SCF Excel release.')
    this.name = 'NotScfWorkbookError'
  }
}

const rowCount = (ws: XLSX.WorkSheet): number =>
  ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']).e.r + 1 : 0

export const parseWorkbook = (data: ArrayBuffer, fileName: string): ScfModel => {
  const wb = XLSX.read(new Uint8Array(data), { type: 'array' })

  const found = new Map<string, string>()
  for (const { key, pattern } of SHEET_PATTERNS) {
    const name = wb.SheetNames.find((n) => pattern.test(n.trim()))
    if (name) found.set(key, name)
  }
  const mainName = found.get('main')
  if (!mainName) throw new NotScfWorkbookError()

  const report: ParseReport = {
    version: mainName.replace(/^scf\s*/i, '').trim(),
    sheets: [],
    unmappedColumns: [],
    warnings: [],
  }
  for (const { key } of SHEET_PATTERNS) {
    const name = found.get(key)
    if (name) report.sheets.push({ name: key, matched: name, rows: rowCount(wb.Sheets[name]) })
    else report.warnings.push(`Sheet not found: ${key}`)
  }

  const get = (key: string): XLSX.WorkSheet | null => {
    const name = found.get(key)
    return name ? wb.Sheets[name] : null
  }

  const safe = <T>(key: string, fn: (ws: XLSX.WorkSheet) => T, empty: T): T => {
    const ws = get(key)
    if (!ws) return empty
    try {
      return fn(ws)
    } catch (e) {
      report.warnings.push(`Failed to parse sheet '${found.get(key)}': ${String(e)}`)
      return empty
    }
  }

  const sources = safe('sources', parseSources, [] as Framework[])
  const main = parseMainSheet(wb.Sheets[mainName], sources)
  report.unmappedColumns.push(
    ...main.unmapped.map((header) => ({ sheet: mainName, header })),
  )

  // Frameworks present as columns, enriched from sources; sources without a column are
  // appended so the directory still lists them (with zero mappings).
  const columnIds = new Set(main.frameworks.map((f) => f.id))
  const frameworks = [
    ...main.frameworks,
    ...sources.filter((s) => !columnIds.has(s.id)),
  ]

  return {
    version: report.version,
    sourceFileName: fileName,
    parsedAt: new Date().toISOString(),
    domains: safe('domains', parseDomains, []),
    controls: main.controls,
    frameworks,
    risks: safe('risks', parseRiskCatalog, []),
    threats: safe('threats', parseThreatCatalog, []),
    assessmentObjectives: safe('aos', parseAssessmentObjectives, []),
    erlItems: safe('erl', parseErl, []),
    compensating: safe('compensating', parseCompensating, []),
    privacyPrinciples: safe('privacy', parsePrivacyPrinciples, []),
    baselineDefs: main.baselineDefs,
    parseReport: report,
  }
}
