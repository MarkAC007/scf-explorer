import { createStore, useStore, type StoreApi } from 'zustand'
import { db } from '../store/db'
import type { ModelIndexes } from '../model/indexes'
import type { ScfModel } from '../model/types'
import { scopeControlIds, type ScopeDef } from './scopeMath'

const ACTIVE_KEY = 'scf-explorer:active-scope'

const newId = (): string =>
  `scope-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export interface ScopeState {
  scopes: ScopeDef[]
  activeScope: ScopeDef | null
  /** Membership set for the active scope, or null when no scope is active. */
  activeControlIds: Set<string> | null
  /** Revalidation messages (e.g. frameworks dropped after a workbook change). */
  notices: string[]
  init: (model: ScfModel, ix: ModelIndexes) => Promise<void>
  createScope: (name: string, frameworkIds: string[]) => Promise<ScopeDef>
  renameScope: (id: string, name: string) => Promise<void>
  updateFrameworks: (id: string, frameworkIds: string[]) => Promise<void>
  duplicateScope: (id: string) => Promise<ScopeDef>
  deleteScope: (id: string) => Promise<void>
  setActive: (id: string | null) => Promise<void>
  dismissNotices: () => void
}

export const createScopeStore = (): StoreApi<ScopeState> => {
  let model: ScfModel | null = null
  let ix: ModelIndexes | null = null

  return createStore<ScopeState>((set, get) => {
    const recompute = (scope: ScopeDef | null): Set<string> | null =>
      scope && ix ? scopeControlIds(scope.frameworkIds, ix) : null

    const persistActive = (id: string | null): void => {
      try {
        if (id) localStorage.setItem(ACTIVE_KEY, id)
        else localStorage.removeItem(ACTIVE_KEY)
      } catch {
        // localStorage unavailable — activation just won't survive reload
      }
    }

    return {
      scopes: [],
      activeScope: null,
      activeControlIds: null,
      notices: [],

      init: async (m, indexes) => {
        model = m
        ix = indexes
        const rows = await db.scopes.toArray()
        const notices: string[] = []
        // Revalidate against the loaded workbook: drop frameworks it doesn't know.
        for (const s of rows) {
          const valid = s.frameworkIds.filter((fw) => ix!.frameworkById.has(fw))
          if (valid.length !== s.frameworkIds.length) {
            const dropped = s.frameworkIds.filter((fw) => !ix!.frameworkById.has(fw))
            notices.push(
              `Scope “${s.name}”: dropped ${dropped.length} framework(s) not present in SCF ${m.version} (${dropped.join(', ')})`,
            )
            s.frameworkIds = valid
            await db.scopes.put(s)
          }
        }
        let activeScope: ScopeDef | null = null
        try {
          const activeId = localStorage.getItem(ACTIVE_KEY)
          activeScope =
            rows.find((s) => s.id === activeId && s.frameworkIds.length > 0) ?? null
        } catch {
          activeScope = null
        }
        set({
          scopes: rows,
          notices,
          activeScope,
          activeControlIds: recompute(activeScope),
        })
      },

      createScope: async (name, frameworkIds) => {
        const scope: ScopeDef = {
          id: newId(),
          name: name.trim() || 'Untitled scope',
          frameworkIds: [...new Set(frameworkIds)],
          createdAt: new Date().toISOString(),
          scfVersion: model?.version ?? 'unknown',
        }
        await db.scopes.put(scope)
        set({ scopes: [...get().scopes, scope] })
        return scope
      },

      renameScope: async (id, name) => {
        const scopes = get().scopes.map((s) => (s.id === id ? { ...s, name } : s))
        const target = scopes.find((s) => s.id === id)
        if (!target) return
        await db.scopes.put(target)
        set({
          scopes,
          activeScope: get().activeScope?.id === id ? target : get().activeScope,
        })
      },

      updateFrameworks: async (id, frameworkIds) => {
        const deduped = [...new Set(frameworkIds)]
        const scopes = get().scopes.map((s) =>
          s.id === id ? { ...s, frameworkIds: deduped } : s,
        )
        const target = scopes.find((s) => s.id === id)
        if (!target) return
        await db.scopes.put(target)
        const isActive = get().activeScope?.id === id
        set({
          scopes,
          activeScope: isActive ? target : get().activeScope,
          activeControlIds: isActive ? recompute(target) : get().activeControlIds,
        })
      },

      duplicateScope: async (id) => {
        const src = get().scopes.find((s) => s.id === id)
        if (!src) throw new Error(`Unknown scope: ${id}`)
        return get().createScope(`${src.name} (copy)`, src.frameworkIds)
      },

      deleteScope: async (id) => {
        await db.scopes.delete(id)
        const wasActive = get().activeScope?.id === id
        if (wasActive) persistActive(null)
        set({
          scopes: get().scopes.filter((s) => s.id !== id),
          activeScope: wasActive ? null : get().activeScope,
          activeControlIds: wasActive ? null : get().activeControlIds,
        })
      },

      setActive: async (id) => {
        if (id === null) {
          persistActive(null)
          set({ activeScope: null, activeControlIds: null })
          return
        }
        const scope = get().scopes.find((s) => s.id === id)
        if (!scope) throw new Error(`Unknown scope: ${id}`)
        if (scope.frameworkIds.length === 0)
          throw new Error('Cannot activate an empty scope')
        persistActive(id)
        set({ activeScope: scope, activeControlIds: recompute(scope) })
      },

      dismissNotices: () => set({ notices: [] }),
    }
  })
}

export const scopeStore = createScopeStore()

export const useScope = <T>(selector: (s: ScopeState) => T): T =>
  useStore(scopeStore, selector)
