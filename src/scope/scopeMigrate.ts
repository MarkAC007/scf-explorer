/**
 * Saved scopes store framework slugs only. SCF releases rename framework columns
 * (2026.3 renamed 142 of ~250), so a slug saved against one release may not exist in the
 * next. This module maps old slugs onto the loaded workbook's slugs using the two rename
 * patterns the SCF actually uses — a geography prefix change ("us-…" → "usa-federal-…")
 * and a version/year suffix change ("nist-800-53-r5" → "nist-800-53-r5-2") — and leaves
 * anything ambiguous alone so a scope never silently gains the wrong framework.
 */

export type Migration =
  | { from: string; to: string; via: 'exact' | 'geography' | 'version' }
  | { from: string; to: null; via: 'dropped' }

export interface MigrationResult {
  frameworkIds: string[]
  migrations: Migration[]
  changed: boolean
}

const GEO_PREFIX = /^(usa?(-federal|-state(-[a-z]{2})?)?|emea(-eu)?|apac|americas|africa|international)-/
// A version is "r5", "r5-2", "v2", "3-6", "1-0-1" (short numbers) or a four-digit year —
// never a lone number or a long numeric run, which belong to the document's name
// ("800-172", "essential-8", "iso-27002", "252-204-7012").
const VERSION_SUFFIX = /-(r\d+(-\d+)*|v\d+(-\d+)*|\d{1,2}(-\d{1,2})+|\d{4})$/
const VERSION_TOKEN = /^(r\d+(-\d+)*|v\d+(-\d+)*|\d{1,2}(-\d{1,2})+|\d{4})$/

const core = (slug: string): string => slug.replace(GEO_PREFIX, '')
const base = (slug: string): string => core(slug).replace(VERSION_SUFFIX, '')

/** Natural sort key so "r5-2" > "r5" and "2026" > "2024". */
const versionKey = (slug: string): number[] =>
  (core(slug).slice(base(slug).length + 1).match(/\d+/g) ?? []).map(Number)
const compareVersions = (a: string, b: string): number => {
  const ka = versionKey(a)
  const kb = versionKey(b)
  for (let i = 0; i < Math.max(ka.length, kb.length); i++) {
    const d = (ka[i] ?? 0) - (kb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

/** Map one slug onto the known set, or null when there is no safe single answer. */
export const migrateFrameworkId = (slug: string, known: ReadonlySet<string>): Migration => {
  if (known.has(slug)) return { from: slug, to: slug, via: 'exact' }

  const c = core(slug)
  const sameCore = [...known].filter((k) => core(k) === c)
  if (sameCore.length === 1) return { from: slug, to: sameCore[0], via: 'geography' }
  if (sameCore.length > 1) return { from: slug, to: null, via: 'dropped' }

  const b = base(slug)
  const sameBase = [...known].filter((k) => {
    const kc = core(k)
    if (kc === b) return true
    return kc.startsWith(b + '-') && VERSION_TOKEN.test(kc.slice(b.length + 1))
  })
  if (sameBase.length === 0) return { from: slug, to: null, via: 'dropped' }
  // Several versions of the same document: take the newest, which is what the SCF maps now.
  const newest = sameBase.sort(compareVersions).at(-1)!
  return { from: slug, to: newest, via: 'version' }
}

/** Migrate a scope's framework list; preserves order, de-duplicates, never invents ids. */
export const migrateFrameworkIds = (frameworkIds: string[], known: ReadonlySet<string>): MigrationResult => {
  const migrations = frameworkIds.map((id) => migrateFrameworkId(id, known))
  const out: string[] = []
  for (const m of migrations) if (m.to && !out.includes(m.to)) out.push(m.to)
  const changed = migrations.some((m) => m.via !== 'exact')
  return { frameworkIds: out, migrations, changed }
}

/** Human-readable notice for one scope's migration, or null when nothing changed. */
export const describeMigration = (scopeName: string, version: string, r: MigrationResult): string | null => {
  if (!r.changed) return null
  const moved = r.migrations.filter((m) => m.via === 'geography' || m.via === 'version')
  const dropped = r.migrations.filter((m) => m.via === 'dropped')
  const parts: string[] = []
  if (moved.length)
    parts.push(`updated ${moved.length} renamed framework(s) for SCF ${version} (${moved.map((m) => `${m.from} → ${m.to}`).join(', ')})`)
  if (dropped.length)
    parts.push(`dropped ${dropped.length} framework(s) not present in SCF ${version} (${dropped.map((m) => m.from).join(', ')})`)
  return `Scope “${scopeName}”: ${parts.join('; ')}`
}
