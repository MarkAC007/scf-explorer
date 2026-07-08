import { describe, it, expect, beforeAll } from 'vitest'
import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseWorkbook } from '../../src/parser/parseWorkbook'
import { buildIndexes } from '../../src/model/indexes'
import { modelStore } from '../../src/store/modelStore'
import DashboardView from '../../src/views/DashboardView'

beforeAll(() => {
  const buf = readFileSync(join(__dirname, '../fixtures/scf-fixture.xlsx'))
  const model = parseWorkbook(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    'scf-fixture.xlsx',
  )
  modelStore.setState({ model, indexes: buildIndexes(model), status: 'ready' })
})

describe('DashboardView', () => {
  it('renders headline stats and all domain cards', () => {
    render(
      <MemoryRouter>
        <DashboardView />
      </MemoryRouter>,
    )
    expect(screen.getByText('101')).toBeInTheDocument() // controls stat
    expect(screen.getByText('33')).toBeInTheDocument() // domains stat
    expect(screen.getAllByRole('link', { name: /GOV/ }).length).toBeGreaterThanOrEqual(1)
    expect(
      screen.getByText(/Cybersecurity & Data Protection Governance/i),
    ).toBeInTheDocument()
  })
})
