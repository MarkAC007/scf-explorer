import { describe, it, expect } from 'vitest'
import { migrateFrameworkId, migrateFrameworkIds, describeMigration } from '../../src/scope/scopeMigrate'

// Slugs below are real 2026.1.1 → 2026.3 renames taken from the two Focal Documents sheets.
const KNOWN_2026_3 = new Set([
  'nist-800-53-r5-2', 'nist-800-172-r3', 'nist-800-172a-r3', 'iso-27002-2022',
  'usa-federal-dhs-cisa-ssdaf', 'usa-federal-cisa-cpg-2022', 'usa-federal-c2m2-2-1',
  'emea-eu-nis2-2022', 'emea-eu-nis2-annex-2024', 'emea-germany-c5-2026', 'sparta-4-0',
  'scf-dpmp-2026', 'apac-new-zealand-nzism-3-9', 'emea-israel-cdmo-2-0',
  'emea-germany-bait-2021', 'emea-germany-kritis-2021',
])

describe('migrateFrameworkId', () => {
  it.each([
    ['iso-27002-2022', 'iso-27002-2022', 'exact'],
    ['us-dhs-cisa-ssdaf', 'usa-federal-dhs-cisa-ssdaf', 'geography'],
    ['us-cisa-cpg-2022', 'usa-federal-cisa-cpg-2022', 'geography'],
    ['us-c2m2-2-1', 'usa-federal-c2m2-2-1', 'geography'],
    ['nist-800-53-r5', 'nist-800-53-r5-2', 'version'],
    ['nist-800-172', 'nist-800-172-r3', 'version'],
    ['emea-eu-nis2', 'emea-eu-nis2-2022', 'version'],
    ['emea-eu-nis2-annex', 'emea-eu-nis2-annex-2024', 'version'],
    ['emea-germany-c5-2020', 'emea-germany-c5-2026', 'version'],
    ['sparta', 'sparta-4-0', 'version'],
    ['scf-dpmp-2025', 'scf-dpmp-2026', 'version'],
    ['apac-new-zealand-nzism-3-6', 'apac-new-zealand-nzism-3-9', 'version'],
    ['emea-israel-cdmo-1-0', 'emea-israel-cdmo-2-0', 'version'],
  ])('%s → %s (%s)', (from, to, via) => {
    expect(migrateFrameworkId(from, KNOWN_2026_3)).toEqual({ from, to, via })
  })
  it('drops a slug with no safe match', () => {
    expect(migrateFrameworkId('emea-germany', KNOWN_2026_3)).toEqual({ from: 'emea-germany', to: null, via: 'dropped' })
    expect(migrateFrameworkId('us-ca-sb1386', KNOWN_2026_3)).toEqual({ from: 'us-ca-sb1386', to: null, via: 'dropped' })
  })
  it('does not treat a different document with a shared prefix as a version bump', () => {
    // "nist-800-172a-r3" must not absorb "nist-800-172"
    expect(migrateFrameworkId('nist-800-172', KNOWN_2026_3).to).toBe('nist-800-172-r3')
  })
  it('picks the newest when several versions of one document exist', () => {
    const known = new Set(['nist-csf-1-1', 'nist-csf-2-0'])
    expect(migrateFrameworkId('nist-csf', known).to).toBe('nist-csf-2-0')
    expect(migrateFrameworkId('nist-csf-1-0', known).to).toBe('nist-csf-2-0')
  })
})

describe('migrateFrameworkIds', () => {
  it('keeps order, de-duplicates and reports changes', () => {
    const r = migrateFrameworkIds(['iso-27002-2022', 'nist-800-53-r5', 'nist-800-53-r5-2', 'emea-germany'], KNOWN_2026_3)
    expect(r.frameworkIds).toEqual(['iso-27002-2022', 'nist-800-53-r5-2'])
    expect(r.changed).toBe(true)
    expect(r.migrations.map((m) => m.via)).toEqual(['exact', 'version', 'exact', 'dropped'])
  })
  it('is a no-op for an all-known list', () => {
    const r = migrateFrameworkIds(['iso-27002-2022'], KNOWN_2026_3)
    expect(r.changed).toBe(false)
    expect(describeMigration('S', '2026.3', r)).toBeNull()
  })
  it('describes both moves and drops in one notice', () => {
    const r = migrateFrameworkIds(['nist-800-53-r5', 'emea-germany'], KNOWN_2026_3)
    const n = describeMigration('ISO+NIST', '2026.3', r)!
    expect(n).toMatch(/updated 1 renamed framework\(s\) for SCF 2026\.3 \(nist-800-53-r5 → nist-800-53-r5-2\)/)
    expect(n).toMatch(/dropped 1 framework\(s\) not present in SCF 2026\.3 \(emea-germany\)/)
  })
})
