import { useModel } from '../store/modelStore'
import CatalogList from '../components/CatalogList'

export default function RisksView() {
  const model = useModel((s) => s.model)
  const indexes = useModel((s) => s.indexes)
  if (!model || !indexes) return null

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">Risk catalog</h1>
      <p className="mt-2 max-w-3xl text-gray-600">
        The {model.risks.length} risks the SCF associates with control deficiencies. Each
        risk lists the controls whose absence exposes it.
      </p>
      <div className="mt-6">
        <CatalogList
          tone="red"
          entries={model.risks.map((r) => ({
            id: r.id,
            grouping: r.grouping,
            name: r.name,
            description: r.description,
            materiality: r.materiality,
            extra: r.csfFunction || undefined,
            linked: indexes.controlsByRisk.get(r.id) ?? [],
          }))}
        />
      </div>
    </div>
  )
}
