import { useModel } from '../store/modelStore'
import CatalogList from '../components/CatalogList'

export default function ThreatsView() {
  const model = useModel((s) => s.model)
  const indexes = useModel((s) => s.indexes)
  if (!model || !indexes) return null

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">Threat catalog</h1>
      <p className="mt-2 max-w-3xl text-gray-600">
        {model.threats.length} natural and man-made threats, with the SCF controls that
        defend against each.
      </p>
      <div className="mt-6">
        <CatalogList
          tone="amber"
          entries={model.threats.map((t) => ({
            id: t.id,
            grouping: t.grouping,
            name: t.name,
            description: t.description,
            materiality: t.materiality,
            linked: indexes.controlsByThreat.get(t.id) ?? [],
          }))}
        />
      </div>
    </div>
  )
}
