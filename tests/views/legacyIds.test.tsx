import { describe, it, expect, beforeAll } from 'vitest'
import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { loadFixture } from '../helpers/fixture'
import { parseWorkbook } from '../../src/parser/parseWorkbook'
import { buildIndexes } from '../../src/model/indexes'
import { modelStore } from '../../src/store/modelStore'
import ControlDetailView from '../../src/views/ControlDetailView'

/**
 * 2026.3 renumbered 683 of 711 shared control ids. The workbook carries the old number in
 * "Legacy SCF #" and the change tags in the Errata column; the control page must resolve old
 * ids, warn when an id now names a different control, and show the tags.
 *
 * Fixture rebuilt with a Legacy SCF # column:
 *   GOV-01 ← NONE            GOV-02 ← GOV-01 (GOV-01 still exists → collision)
 *   GOV-03 ← OLD-99 (pure alias)   GOV-04 ← DUP-1, GOV-05 ← DUP-1 (ambiguous)
 */
const LEGACY: Record<string, string> = { 'GOV-02': 'GOV-01', 'GOV-03': 'OLD-99', 'GOV-04': 'DUP-1', 'GOV-05': 'DUP-1' }

beforeAll(() => {
  const src = loadFixture()
  const wb = XLSX.utils.book_new()
  for (const name of src.SheetNames) {
    let rows = XLSX.utils.sheet_to_json<unknown[]>(src.Sheets[name], { header: 1, defval: null })
    if (/^scf 20/i.test(name)) {
      const idCol = rows[0].findIndex((h) => String(h ?? '').trim() === 'SCF #')
      const errCol = rows[0].findIndex((h) => /^errata/i.test(String(h ?? '').trim()))
      rows = rows.map((r, i) => {
        if (i === 0) return [...r, 'Legacy SCF #']
        const id = String(r[idCol] ?? '').trim()
        const out = [...r, LEGACY[id] ?? 'NONE']
        if (id === 'GOV-02') out[errCol] = '- wordsmithed\n- renumbered'
        return out
      })
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name)
  }
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  const model = parseWorkbook(buf, 'legacy.xlsx')
  modelStore.setState({ model, indexes: buildIndexes(model), status: 'ready' })
})

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/controls/:id" element={<ControlDetailView />} />
      </Routes>
    </MemoryRouter>,
  )

describe('buildIndexes.controlsByLegacyId', () => {
  it('indexes controls by every legacy id', () => {
    const ix = modelStore.getState().indexes!
    expect(ix.controlsByLegacyId.get('OLD-99')!.map((c) => c.id)).toEqual(['GOV-03'])
    expect(ix.controlsByLegacyId.get('DUP-1')!.map((c) => c.id)).toEqual(['GOV-04', 'GOV-05'])
    expect(ix.controlsByLegacyId.has('NONE')).toBe(false)
  })
})

describe('ControlDetailView legacy id handling', () => {
  it('redirects a pure legacy id to its current control and says so', () => {
    renderAt('/controls/OLD-99')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/.+/)
    expect(screen.getAllByText('GOV-03').length).toBeGreaterThanOrEqual(1)
    const notice = screen.getByRole('status')
    expect(notice).toHaveTextContent(/OLD-99/)
    expect(notice).toHaveTextContent(/renumbered/i)
    expect(notice).toHaveTextContent(/GOV-03/)
  })
  it('offers the candidates when a legacy id maps to several controls', () => {
    renderAt('/controls/DUP-1')
    expect(screen.getByText(/not found/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'GOV-04' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'GOV-05' })).toBeInTheDocument()
  })
  it('warns when an existing id was also another control’s old number', () => {
    renderAt('/controls/GOV-01')
    const notice = screen.getByRole('status')
    expect(notice).toHaveTextContent(/GOV-01/)
    expect(notice).toHaveTextContent(/GOV-02/)
    expect(screen.getByRole('link', { name: 'GOV-02' })).toBeInTheDocument()
  })
  it('shows legacy ids and change tags in the header', () => {
    renderAt('/controls/GOV-02')
    expect(screen.getByText(/formerly/i)).toHaveTextContent(/GOV-01/)
    expect(screen.getByText('wordsmithed')).toBeInTheDocument()
    expect(screen.getByText('renumbered')).toBeInTheDocument()
  })
  it('renders no legacy notice for an ordinary control', () => {
    renderAt('/controls/GOV-03')
    expect(screen.queryByRole('status')).toBeNull()
  })
})
