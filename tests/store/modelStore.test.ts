import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createModelStore } from '../../src/store/modelStore'
import { db } from '../../src/store/db'
import { parseWorkbook } from '../../src/parser/parseWorkbook'

const fixtureBuffer = (): ArrayBuffer => {
  const buf = readFileSync(join(__dirname, '../fixtures/scf-fixture.xlsx'))
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

// Test parse function bypasses the Web Worker (unavailable in jsdom).
const directParse = async (file: File) =>
  parseWorkbook(await file.arrayBuffer(), file.name)

const makeFile = (): File =>
  new File([fixtureBuffer()], 'scf-fixture.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

describe('modelStore', () => {
  beforeEach(async () => {
    await db.models.clear()
  })

  it('starts empty when no cache', async () => {
    const store = createModelStore(directParse)
    await store.getState().initFromCache()
    expect(store.getState().status).toBe('empty')
  })

  it('parseFile loads model, builds indexes, caches', async () => {
    const store = createModelStore(directParse)
    await store.getState().parseFile(makeFile())
    const s = store.getState()
    expect(s.status).toBe('ready')
    expect(s.model!.controls).toHaveLength(101)
    expect(s.indexes!.controlById.get('GOV-01')).toBeDefined()
    expect(await db.models.get('current')).toBeDefined()
  })

  it('initFromCache restores a previously parsed model', async () => {
    const store1 = createModelStore(directParse)
    await store1.getState().parseFile(makeFile())
    const store2 = createModelStore(directParse)
    await store2.getState().initFromCache()
    expect(store2.getState().status).toBe('ready')
    expect(store2.getState().model!.version).toBe('2026.1')
  })

  it('clearWorkbook empties store and cache', async () => {
    const store = createModelStore(directParse)
    await store.getState().parseFile(makeFile())
    await store.getState().clearWorkbook()
    expect(store.getState().status).toBe('empty')
    expect(store.getState().model).toBeNull()
    expect(await db.models.get('current')).toBeUndefined()
  })

  it('surfaces parse errors as error status', async () => {
    const store = createModelStore(directParse)
    const bad = new File([new ArrayBuffer(10)], 'nonsense.xlsx')
    await store.getState().parseFile(bad)
    expect(store.getState().status).toBe('error')
    expect(store.getState().error).toBeTruthy()
  })
})
