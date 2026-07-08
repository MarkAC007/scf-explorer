import { describe, it, expect } from 'vitest'
import { normalizeHeader, slugify, findColumn } from '../../src/parser/headerMatch'

describe('normalizeHeader', () => {
  it('collapses newlines and whitespace runs to single spaces', () => {
    expect(normalizeHeader('SCF\nControl')).toBe('SCF Control')
    expect(normalizeHeader('  NIST\n800-53\nR5  ')).toBe('NIST 800-53 R5')
  })
  it('handles null/undefined/numbers', () => {
    expect(normalizeHeader(null)).toBe('')
    expect(normalizeHeader(undefined)).toBe('')
    expect(normalizeHeader(42)).toBe('42')
  })
})

describe('slugify', () => {
  it('lowercases and dashes non-alphanumerics', () => {
    expect(slugify('NIST\n800-53\nR5')).toBe('nist-800-53-r5')
    expect(slugify('AICPA\nTSC 2017:2022 (used for SOC 2)')).toBe('aicpa-tsc-2017-2022-used-for-soc-2')
  })
  it('trims leading/trailing dashes', () => {
    expect(slugify('(privacy)')).toBe('privacy')
  })
  it('keeps + distinct so GovRAMP Low+ does not collide with GovRAMP Low', () => {
    expect(slugify('GovRAMP\nLow+')).toBe('govramp-low-plus')
    expect(slugify('GovRAMP\nLow')).toBe('govramp-low')
  })
})

describe('findColumn', () => {
  const headers = ['SCF Domain', 'SCF Control', 'SCF #', 'Secure Controls Framework (SCF)\nControl Description']
  it('finds by regex on normalized header', () => {
    expect(findColumn(headers, /^scf #$/i)).toBe(2)
    expect(findColumn(headers, /^secure controls framework \(scf\) control description$/i)).toBe(3)
  })
  it('tries multiple patterns in order', () => {
    expect(findColumn(headers, /^nope$/i, /^scf domain$/i)).toBe(0)
  })
  it('returns -1 when absent', () => {
    expect(findColumn(headers, /^missing column$/i)).toBe(-1)
  })
})
