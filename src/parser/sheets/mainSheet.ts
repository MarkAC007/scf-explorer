import * as XLSX from 'xlsx'
import type { BaselineDef, Control, Framework, MaturityLevel } from '../../model/types'
import { normalizeHeader, slugify } from '../headerMatch'

export interface MainSheetResult {
  controls: Control[]
  discoveredFrameworkHeaders: string[]
  baselineDefs: BaselineDef[]
  unmapped: string[]
  frameworks: Framework[]
}

type ColKind =
  | { kind: 'core'; field: string }
  | { kind: 'solution'; band: string }
  | { kind: 'tier'; tier: number }
  | { kind: 'maturity'; level: number; title: string }
  | { kind: 'baseline'; id: string; label: string }
  | { kind: 'risk'; id: string }
  | { kind: 'threat'; id: string }
  | { kind: 'errata' }
  | { kind: 'skipped' }
  | { kind: 'framework'; id: string }

const CORE: [RegExp, string][] = [
  [/^scf domain$/i, 'domain'],
  [/^scf control$/i, 'name'],
  [/^scf #$/i, 'id'],
  [/^secure controls framework \(scf\) control description$/i, 'description'],
  [/^conformity validation cadence$/i, 'cadence'],
  [/^evidence request list \(erl\) #$/i, 'erl'],
  [/^scf control question$/i, 'question'],
  [/^relative control weighting$/i, 'weighting'],
  [/^pptdf applicability$/i, 'pptdf'],
  [/^nist csf function grouping$/i, 'csf'],
]

const SKIPPED =
  /^(minimum security requirements|identify (minimum compliance|discretionary security)|risk threat summary|control threat summary)/i

/** Classify one normalized main-sheet header. Every column gets a kind; 'framework' is the fallback. */
export const classifyColumn = (header: string): ColKind => {
  for (const [re, field] of CORE) if (re.test(header)) return { kind: 'core', field }
  const sol = header.match(/^possible solutions & considerations (.+?) bls firm size/i)
  if (sol) return { kind: 'solution', band: sol[1].trim() }
  const tier = header.match(/^scrm focus tier (\d)/i)
  if (tier) return { kind: 'tier', tier: Number(tier[1]) }
  const mat = header.match(/^scr-cmm level (\d) (.+)$/i)
  if (mat) return { kind: 'maturity', level: Number(mat[1]), title: mat[2].trim() }
  const base = header.match(/^scf (community derived|scrms|core .+)$/i)
  if (base) return { kind: 'baseline', id: slugify(base[1]), label: base[1].trim() }
  const risk = header.match(/^risk (r-[a-z]{2}-\d+)$/i)
  if (risk) return { kind: 'risk', id: risk[1].toUpperCase() }
  const threat = header.match(/^threat ((?:nt|mt)-\d+)$/i)
  if (threat) return { kind: 'threat', id: threat[1].toUpperCase() }
  if (/^errata/i.test(header)) return { kind: 'errata' }
  if (SKIPPED.test(header)) return { kind: 'skipped' }
  return { kind: 'framework', id: slugify(header) }
}

const splitMulti = (v: unknown): string[] =>
  String(v ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

export const parseMainSheet = (
  ws: XLSX.WorkSheet,
  knownFrameworks: Framework[],
): MainSheetResult => {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null })
  const rawHeaders = rows[0] ?? []
  const headers = rawHeaders.map(normalizeHeader)
  const knownById = new Map(knownFrameworks.map((f) => [f.id, f]))

  const kinds: ColKind[] = headers.map((h) => (h ? classifyColumn(h) : { kind: 'skipped' }))

  // Framework registry: sources-sheet metadata when available, fallback otherwise.
  const frameworks: Framework[] = []
  const discoveredFrameworkHeaders: string[] = []
  const unmapped: string[] = []
  kinds.forEach((k, i) => {
    if (k.kind !== 'framework') return
    discoveredFrameworkHeaders.push(headers[i])
    const known = knownById.get(k.id)
    if (known) frameworks.push(known)
    else {
      frameworks.push({
        id: k.id,
        header: headers[i],
        name: headers[i],
        geography: headers[i].match(/^(us|emea|apac|americas)\b/i)?.[1].toUpperCase() ?? 'General',
        source: '',
        url: '',
        strmUrl: '',
        fromSources: false,
      })
    }
  })

  const coreIdx = new Map<string, number>()
  kinds.forEach((k, i) => {
    if (k.kind === 'core') coreIdx.set(k.field, i)
  })
  for (const [, field] of CORE) {
    if (!coreIdx.has(field)) unmapped.push(`missing core column: ${field}`)
  }

  const baselineDefs: BaselineDef[] = []
  const seenBaselines = new Set<string>()
  kinds.forEach((k) => {
    if (k.kind === 'baseline' && !seenBaselines.has(k.id)) {
      seenBaselines.add(k.id)
      baselineDefs.push({ id: k.id, label: k.label })
    }
  })

  const cell = (row: unknown[], field: string): unknown => {
    const i = coreIdx.get(field)
    return i === undefined ? null : row[i]
  }

  const controls: Control[] = []
  rows.slice(1).forEach((row, rowIdx) => {
    const id = String(cell(row, 'id') ?? '').trim()
    if (!/^[A-Z]{2,4}-\d/.test(id)) return

    const maturity: MaturityLevel[] = []
    const solutions: Control['solutions'] = []
    const baselines: string[] = []
    const scrmTiers: number[] = []
    const riskIds: string[] = []
    const threatIds: string[] = []
    const mappings: Record<string, string[]> = {}
    let errata = ''

    kinds.forEach((k, i) => {
      const v = row[i]
      const filled = v != null && String(v).trim() !== ''
      switch (k.kind) {
        case 'maturity':
          maturity.push({
            level: k.level as MaturityLevel['level'],
            title: k.title,
            text: String(v ?? '').trim(),
          })
          break
        case 'solution':
          if (filled) solutions.push({ sizeBand: k.band, text: String(v).trim() })
          break
        case 'baseline':
          if (filled) baselines.push(k.id)
          break
        case 'tier':
          if (filled) scrmTiers.push(k.tier)
          break
        case 'risk':
          if (filled) riskIds.push(k.id)
          break
        case 'threat':
          if (filled) threatIds.push(k.id)
          break
        case 'framework': {
          const refs = splitMulti(v)
          if (refs.length) mappings[k.id] = refs
          break
        }
        case 'errata':
          if (filled) errata = String(v).trim()
          break
      }
    })

    maturity.sort((a, b) => a.level - b.level)

    controls.push({
      id,
      domainId: id.split('-')[0],
      name: String(cell(row, 'name') ?? '').trim(),
      description: String(cell(row, 'description') ?? '').trim(),
      question: String(cell(row, 'question') ?? '').trim(),
      cadence: String(cell(row, 'cadence') ?? '').trim(),
      weighting: (() => {
        const raw = cell(row, 'weighting')
        if (raw == null || String(raw).trim() === '') return null
        const n = Number(raw)
        return Number.isFinite(n) ? n : null // 0 is a legitimate weighting (e.g. TDA-11.2)
      })(),
      pptdf: splitMulti(cell(row, 'pptdf')),
      csfFunction: String(cell(row, 'csf') ?? '').trim(),
      scrmTiers: scrmTiers.sort(),
      maturity,
      baselines,
      solutions,
      erlIds: splitMulti(cell(row, 'erl')),
      mappings,
      riskIds,
      threatIds,
      errata,
      row: rowIdx + 2,
    })
  })

  return { controls, discoveredFrameworkHeaders, baselineDefs, unmapped, frameworks }
}
