import { createStore, useStore, type StoreApi } from 'zustand'
import type { ScfModel } from '../model/types'
import { buildIndexes, type ModelIndexes } from '../model/indexes'
import { clearModel, loadModel, saveModel } from './db'
import type { WorkerResponse } from '../parser/worker'

export type ParseFn = (
  file: File,
  onProgress?: (stage: string, pct: number) => void,
) => Promise<ScfModel>

export interface ModelState {
  model: ScfModel | null
  indexes: ModelIndexes | null
  status: 'empty' | 'loading' | 'parsing' | 'ready' | 'error'
  progress: { stage: string; pct: number } | null
  error: string | null
  initFromCache: () => Promise<void>
  parseFile: (file: File) => Promise<void>
  clearWorkbook: () => Promise<void>
}

/** Production parse function: runs the SheetJS parse in a Web Worker. */
export const workerParse: ParseFn = (file, onProgress) =>
  new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../parser/worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data
      if (msg.type === 'progress') onProgress?.(msg.stage, msg.pct)
      else if (msg.type === 'done') {
        worker.terminate()
        resolve(msg.model)
      } else {
        worker.terminate()
        reject(new Error(msg.message))
      }
    }
    worker.onerror = (e) => {
      worker.terminate()
      reject(new Error(e.message || 'Worker failed'))
    }
    file.arrayBuffer().then((buffer) => {
      worker.postMessage({ type: 'parse', buffer, fileName: file.name }, [buffer])
    }, reject)
  })

export const createModelStore = (parseFn: ParseFn): StoreApi<ModelState> =>
  createStore<ModelState>((set) => ({
    model: null,
    indexes: null,
    status: 'empty',
    progress: null,
    error: null,

    initFromCache: async () => {
      set({ status: 'loading' })
      const model = await loadModel()
      if (model) set({ model, indexes: buildIndexes(model), status: 'ready' })
      else set({ status: 'empty' })
    },

    parseFile: async (file) => {
      set({ status: 'parsing', error: null, progress: { stage: 'Starting', pct: 0 } })
      try {
        const model = await parseFn(file, (stage, pct) => set({ progress: { stage, pct } }))
        const indexes = buildIndexes(model)
        set({ model, indexes, status: 'ready', progress: null })
        try {
          await saveModel(model)
        } catch {
          // IndexedDB unavailable (private browsing etc.) — keep the in-memory model.
          set((s) => ({
            model: s.model
              ? {
                  ...s.model,
                  parseReport: {
                    ...s.model.parseReport,
                    warnings: [
                      ...s.model.parseReport.warnings,
                      'Could not cache the workbook locally; it will need re-uploading next visit.',
                    ],
                  },
                }
              : s.model,
          }))
        }
      } catch (e) {
        set({
          status: 'error',
          error: e instanceof Error ? e.message : String(e),
          progress: null,
        })
      }
    },

    clearWorkbook: async () => {
      await clearModel()
      set({ model: null, indexes: null, status: 'empty', error: null, progress: null })
    },
  }))

export const modelStore = createModelStore(workerParse)

export const useModel = <T>(selector: (s: ModelState) => T): T =>
  useStore(modelStore, selector)
