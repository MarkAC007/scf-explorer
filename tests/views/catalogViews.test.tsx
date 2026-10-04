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
import { fixtureExpectations } from '../helpers/fixture'

const buf = readFileSync(join(__dirname, '../fixtures/scf-fixture.xlsx'))
const model = parseWorkbook(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  'f.xlsx',
)

beforeAll(() => {
  modelStore.setState({ model, indexes: buildIndexes(model), status: 'ready' })
})

const wrap = (el: React.ReactElement) => render(<MemoryRouter>{el}</MemoryRouter>)

describe('RisksView', () => {
  it('renders the risk catalog with linked-control counts', () => {
    wrap(<RisksView />)
    expect(screen.getByText(model.risks[0].id)).toBeInTheDocument()
    expect(screen.getAllByText(/\d+ controls?$/).length).toBeGreaterThan(5)
  })
})

describe('ThreatsView', () => {
  it('renders the threat catalog', () => {
    wrap(<ThreatsView />)
    expect(screen.getByText(model.threats[0].id)).toBeInTheDocument()
  })
})

describe('BaselinesView', () => {
  it('renders baseline cards with counts', () => {
    wrap(<BaselinesView />)
    expect(screen.getAllByText(model.baselineDefs[0].label).length).toBeGreaterThanOrEqual(1)
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
    const sample = fixtureExpectations().privacySample
    expect(screen.getAllByText(new RegExp(sample.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(sample.controlId).length).toBeGreaterThanOrEqual(1)
  })
})
