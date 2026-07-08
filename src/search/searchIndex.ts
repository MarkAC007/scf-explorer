import MiniSearch from 'minisearch'
import type { Control } from '../model/types'

export const buildSearch = (controls: Control[]): MiniSearch => {
  const ms = new MiniSearch({
    fields: ['id', 'name', 'description', 'question'],
    storeFields: [],
    searchOptions: {
      prefix: true,
      fuzzy: 0.15,
      boost: { id: 3, name: 2 },
      combineWith: 'AND',
    },
  })
  ms.addAll(controls)
  return ms
}
