import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseWorkbook } from '../../src/parser/parseWorkbook'
import { buildIndexes } from '../../src/model/indexes'
import { db } from '../../src/store/db'
import { createScopeStore } from '../../src/scope/scopeStore'
import type { ModelIndexes } from '../../src/model/indexes'
import type { ScfModel } from '../../src/model/types'
import { fixtureExpectations } from '../helpers/fixture'

const buf = readFileSync(join(__dirname, '../fixtures/scf-fixture.xlsx'))
const model: ScfModel = parseWorkbook(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  'f.xlsx',
)
const ix: ModelIndexes = buildIndexes(model)

const { nist: FW_A, iso: FW_B } = fixtureExpectations()

describe('scopeStore', () => {
  beforeEach(async () => {
    await db.scopes.clear()
    localStorage.clear()
  })

  it('migrates renamed framework slugs on init and reports it', async () => {
    // "iso-27002" is how a pre-rename release would have slugged ISO 27002; the fixture knows
    // only "iso-27002-2022". "ghost-framework" has no match and is dropped.
    await db.scopes.put({
      id: 'scope-old',
      name: 'Legacy',
      frameworkIds: ['iso-27002', FW_A, 'ghost-framework'],
      createdAt: '2026-01-01T00:00:00.000Z',
      scfVersion: '2025.4',
    })
    const store = createScopeStore()
    await store.getState().init(model, ix)
    const s = store.getState().scopes[0]
    expect(s.frameworkIds).toEqual([FW_B, FW_A])
    expect(s.scfVersion).toBe('2026.1')
    expect(store.getState().notices).toHaveLength(1)
    expect(store.getState().notices[0]).toMatch(/iso-27002 → iso-27002-2022/)
    expect(store.getState().notices[0]).toMatch(/dropped 1 framework\(s\).*ghost-framework/)
    // persisted, so the next init is quiet
    const store2 = createScopeStore()
    await store2.getState().init(model, ix)
    expect(store2.getState().notices).toEqual([])
  })

  it('creates, persists and lists scopes', async () => {
    const store = createScopeStore()
    await store.getState().init(model, ix)
    const s = await store.getState().createScope('ISO+NIST', [FW_A, FW_B])
    expect(store.getState().scopes).toHaveLength(1)
    expect(s.scfVersion).toBe(model.version)
    const store2 = createScopeStore()
    await store2.getState().init(model, ix)
    expect(store2.getState().scopes).toHaveLength(1)
    expect(store2.getState().scopes[0].name).toBe('ISO+NIST')
  })

  it('activates a scope, computes control ids, persists activation', async () => {
    const store = createScopeStore()
    await store.getState().init(model, ix)
    const s = await store.getState().createScope('P', [FW_A])
    await store.getState().setActive(s.id)
    expect(store.getState().activeScope?.id).toBe(s.id)
    expect(store.getState().activeControlIds!.size).toBe(
      ix.controlsByFramework.get(FW_A)!.length,
    )
    const store2 = createScopeStore()
    await store2.getState().init(model, ix)
    expect(store2.getState().activeScope?.id).toBe(s.id)
    await store.getState().setActive(null)
    expect(store.getState().activeControlIds).toBeNull()
  })

  it('refuses to activate an empty scope', async () => {
    const store = createScopeStore()
    await store.getState().init(model, ix)
    const s = await store.getState().createScope('Empty', [])
    await expect(store.getState().setActive(s.id)).rejects.toThrow(/empty/i)
  })

  it('rename, duplicate, delete; deleting active scope deactivates', async () => {
    const store = createScopeStore()
    await store.getState().init(model, ix)
    const s = await store.getState().createScope('P', [FW_A])
    await store.getState().renameScope(s.id, 'Prog')
    expect(store.getState().scopes[0].name).toBe('Prog')
    const d = await store.getState().duplicateScope(s.id)
    expect(store.getState().scopes).toHaveLength(2)
    expect(d.frameworkIds).toEqual([FW_A])
    await store.getState().setActive(s.id)
    await store.getState().deleteScope(s.id)
    expect(store.getState().scopes).toHaveLength(1)
    expect(store.getState().activeScope).toBeNull()
  })

  it('revalidates on init: unknown framework ids are dropped with a notice', async () => {
    await db.scopes.put({
      id: 'legacy',
      name: 'Old',
      frameworkIds: [FW_A, 'gone-framework'],
      createdAt: '2026-01-01T00:00:00Z',
      scfVersion: '2025.4',
    })
    const store = createScopeStore()
    await store.getState().init(model, ix)
    const s = store.getState().scopes.find((x) => x.id === 'legacy')!
    expect(s.frameworkIds).toEqual([FW_A])
    expect(store.getState().notices.some((n) => /gone-framework|Old/.test(n))).toBe(true)
  })
})
