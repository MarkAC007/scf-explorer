import { describe, it, expect, beforeAll } from 'vitest'
import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseWorkbook } from '../../src/parser/parseWorkbook'
import { buildIndexes } from '../../src/model/indexes'
import { modelStore } from '../../src/store/modelStore'
import RisksView from '../../src/views/RisksView'
import ThreatsView from '../../src/views/ThreatsView'
import BaselinesView from '../../src/views/BaselinesView'
import SourcesView from '../../src/views/SourcesView'
import PrivacyView from '../../src/views/PrivacyView'

beforeAll(() => {
  const buf = readFileSync(join(__dirname, '../fixtures/scf-fixture.xlsx'))
  const model = parseWorkbook(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    'f.xlsx',
  )
  modelStore.setState({ model, indexes: buildIndexes(model), status: 'ready' })
})

const wrap = (el: React.ReactElement) => render(<MemoryRouter>{el}</MemoryRouter>)

describe('RisksView', () => {
  it('renders the risk catalog with linked-control counts', () => {
    wrap(<RisksView />)
    expect(screen.getByText('R-AC-1')).toBeInTheDocument()
    expect(screen.getAllByText(/\d+ controls?$/).length).toBeGreaterThan(5)
  })
})

describe('ThreatsView', () => {
  it('renders the threat catalog', () => {
    wrap(<ThreatsView />)
    expect(screen.getByText('MT-1')).toBeInTheDocument()
  })
})

describe('BaselinesView', () => {
  it('renders baseline cards with counts', () => {
    wrap(<BaselinesView />)
    expect(screen.getByText(/ESP Level 1/i)).toBeInTheDocument()
  })
})

describe('SourcesView', () => {
  // ~250 framework rows: slow under full-suite parallel load, so extended timeout
  it('renders the sources directory grouped by geography', { timeout: 15_000 }, () => {
    wrap(<SourcesView />)
    expect(screen.getAllByText(/EMEA/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByRole('link', { name: /source/i }).length).toBeGreaterThan(10)
  })
})

describe('PrivacyView', () => {
  it('renders privacy principles with linked controls', () => {
    wrap(<PrivacyView />)
    expect(screen.getByText(/Data Privacy by Design/)).toBeInTheDocument()
    expect(screen.getAllByText('GOV-01').length).toBeGreaterThanOrEqual(1)
  })
})
