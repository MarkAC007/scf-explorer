import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseWorkbook } from '../../src/parser/parseWorkbook'
import { buildIndexes } from '../../src/model/indexes'
import { modelStore } from '../../src/store/modelStore'
import { scopeStore } from '../../src/scope/scopeStore'
import { db } from '../../src/store/db'
import ProgramView from '../../src/views/ProgramView'

const buf = readFileSync(join(__dirname, '../fixtures/scf-fixture.xlsx'))
const model = parseWorkbook(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  'f.xlsx',
)
const indexes = buildIndexes(model)

beforeAll(async () => {
  modelStore.setState({ model, indexes, status: 'ready' })
})

beforeEach(async () => {
  await db.scopes.clear()
  localStorage.clear()
  await scopeStore.getState().init(model, indexes)
})

const renderAt = (path = '/program') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ProgramView />
    </MemoryRouter>,
  )

describe('ProgramView', () => {
  it('renders the builder with framework rows and counts', () => {
    renderAt()
    expect(screen.getByText('Program scopes')).toBeInTheDocument()
    expect(screen.getAllByText(/\d+ ctrls/).length).toBeGreaterThan(10)
  })

  it('selecting frameworks shows scope size, shape and rollups', () => {
    renderAt()
    const nist = document.querySelector('label[data-fw="nist-800-53-r5"]')!
    fireEvent.click(nist.querySelector('input')!)
    expect(screen.getByText(/% of the SCF/)).toBeInTheDocument()
    expect(screen.getByText('Program shape')).toBeInTheDocument()
    expect(screen.getByText('Rollups')).toBeInTheDocument()
    expect(screen.getByText(/distinct evidence artifacts/)).toBeInTheDocument()
  })

  it('seeds the selection from a share URL', () => {
    renderAt('/program?fw=nist-800-53-r5&fw=iso-27002-2022')
    const selected = screen.getByTestId('selected-frameworks')
    expect(selected.textContent).toMatch(/800-53/)
    expect(selected.textContent).toMatch(/27002/)
    expect(screen.getByText(/Spine — required by every framework/)).toBeInTheDocument()
  })
})
