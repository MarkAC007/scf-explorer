import Dexie, { type EntityTable } from 'dexie'
import type { ScfModel } from '../model/types'

interface ModelRow {
  id: string
  model: ScfModel
}

export const db = new Dexie('scf-explorer') as Dexie & {
  models: EntityTable<ModelRow, 'id'>
}

db.version(1).stores({ models: 'id' })

export const saveModel = async (model: ScfModel): Promise<void> => {
  await db.models.put({ id: 'current', model })
}

export const loadModel = async (): Promise<ScfModel | null> => {
  try {
    const row = await db.models.get('current')
    return row?.model ?? null
  } catch {
    return null
  }
}

export const clearModel = async (): Promise<void> => {
  await db.models.delete('current')
}
