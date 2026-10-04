import { describe, it, expect, beforeAll } from 'vitest'
import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseWorkbook } from '../../src/parser/parseWorkbook'
import { buildIndexes } from '../../src/model/indexes'
import { modelStore } from '../../src/store/modelStore'
import CrosswalkView from '../../src/views/CrosswalkView'
import { fixtureExpectations } from '../helpers/fixture'

// Framework slug derived from the fixture's own header (2026.1.1 → nist-800-53-r5, 2026.3 → nist-800-53-r5-2).
const NIST = fixtureExpectations().nist

beforeAll(() => {
  const buf = readFileSync(join(__dirname, '../fixtures/scf-fixture.xlsx'))
  const model = parseWorkbook(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), 'f.xlsx')
  modelStore.setState({ model, indexes: buildIndexes(model), status: 'ready' })
})

const at = (search: string) =>
  render(
    <MemoryRouter initialEntries={[`/crosswalk${search}`]}>
      <Routes>
        <Route path="/crosswalk" element={<CrosswalkView />} />
      </Routes>
    </MemoryRouter>,
  )

describe('CrosswalkView with framework ids from the URL', () => {
  it('renders coverage for a known framework', () => {
    at(`?fw=${NIST}`)
    expect(screen.getByText(/SCF controls$/)).toBeInTheDocument()
  })
  it('does not crash on an unknown framework id; shows a notice instead', () => {
    at(`?fw=${NIST}&fwB=emea-eu-nis2-renamed`)
    const notice = screen.getByRole('status')
    expect(notice).toHaveTextContent(/emea-eu-nis2-renamed/)
    expect(notice).toHaveTextContent(/not in this workbook/i)
    // framework A still renders its coverage on its own
    expect(screen.getByText(/SCF controls$/)).toBeInTheDocument()
  })
  it('lists every unknown id when both are unknown', () => {
    at('?fw=ghost-a&fwB=ghost-b')
    const notice = screen.getByRole('status')
    expect(notice).toHaveTextContent(/ghost-a/)
    expect(notice).toHaveTextContent(/ghost-b/)
  })
})
