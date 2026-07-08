import { describe, it, expect, beforeAll } from 'vitest'
import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseWorkbook } from '../../src/parser/parseWorkbook'
import { buildIndexes } from '../../src/model/indexes'
import { modelStore } from '../../src/store/modelStore'
import { groupMappings } from '../../src/views/controlDetail.helpers'
import ControlDetailView from '../../src/views/ControlDetailView'

const buf = readFileSync(join(__dirname, '../fixtures/scf-fixture.xlsx'))
const model = parseWorkbook(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  'f.xlsx',
)
const indexes = buildIndexes(model)

beforeAll(() => {
  modelStore.setState({ model, indexes, status: 'ready' })
})

describe('groupMappings', () => {
  const gov01 = indexes.controlById.get('GOV-01')!
  const groups = groupMappings(gov01, indexes.frameworkById)

  it('groups frameworks by geography with items sorted by name', () => {
    expect(groups.length).toBeGreaterThan(1)
    const general = groups.find((g) => g.geography === 'General')
    expect(general).toBeDefined()
    expect(general!.items.length).toBeGreaterThan(0)
    const names = general!.items.map((i) => i.framework.name)
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names)
  })
  it('carries refs through', () => {
    const all = groups.flatMap((g) => g.items)
    const nist = all.find((i) => i.framework.id === 'nist-800-53-r5')
    expect(nist!.refs).toContain('PM-01')
  })
  it('drops frameworks with no refs for this control', () => {
    const all = groups.flatMap((g) => g.items)
    expect(all.every((i) => i.refs.length > 0)).toBe(true)
  })
})

describe('ControlDetailView', () => {
  const renderAt = (id: string) =>
    render(
      <MemoryRouter initialEntries={[`/controls/${id}`]}>
        <Routes>
          <Route path="/controls/:id" element={<ControlDetailView />} />
        </Routes>
      </MemoryRouter>,
    )

  it('renders GOV-01 header and maturity ladder by default', () => {
    renderAt('GOV-01')
    expect(screen.getByText('GOV-01')).toBeInTheDocument()
    expect(screen.getByText(/^Mechanisms exist to facilitate/)).toBeInTheDocument()
    expect(screen.getAllByText(/Performed Informally/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Continuously Improving/i).length).toBeGreaterThanOrEqual(1)
  })

  it('shows a not-found message for an unknown id', () => {
    renderAt('ZZZ-99')
    expect(screen.getByText(/not found/i)).toBeInTheDocument()
  })
})
