import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as XLSX from 'xlsx'
import { expectationsFor } from './expected'

let cached: XLSX.WorkBook | null = null

/** Load the trimmed SCF fixture workbook (cached across tests in a file). */
export const loadFixture = (): XLSX.WorkBook => {
  if (!cached) {
    const buf = readFileSync(join(__dirname, '../fixtures/scf-fixture.xlsx'))
    cached = XLSX.read(buf, { type: 'buffer' })
  }
  return cached
}

export const sheet = (namePattern: RegExp): XLSX.WorkSheet => {
  const wb = loadFixture()
  const name = wb.SheetNames.find((n) => namePattern.test(n))
  if (!name) throw new Error(`fixture sheet not found: ${namePattern}`)
  return wb.Sheets[name]
}

export const hasSheet = (namePattern: RegExp): boolean =>
  loadFixture().SheetNames.some((n) => namePattern.test(n))

let expected: import('./expected').WorkbookExpectations | null = null
/** Workbook-derived expectations for the fixture (counts, version, framework slugs). */
export const fixtureExpectations = (): import('./expected').WorkbookExpectations => {
  if (!expected) expected = expectationsFor(loadFixture())
  return expected
}
