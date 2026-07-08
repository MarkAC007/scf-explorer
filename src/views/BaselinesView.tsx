import { Link } from 'react-router-dom'
import { useModel } from '../store/modelStore'

export default function BaselinesView() {
  const model = useModel((s) => s.model)
  const indexes = useModel((s) => s.indexes)
  if (!model || !indexes) return null

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">SCF baselines</h1>
      <p className="mt-2 max-w-3xl text-gray-600">
        Curated control subsets published inside the SCF — starting points sized to a
        purpose rather than the full catalog.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {model.baselineDefs.map((b) => {
          const count = indexes.controlsByBaseline.get(b.id)?.length ?? 0
          return (
            <Link
              key={b.id}
              to={`/controls?baseline=${b.id}`}
              className="rounded-lg border border-line bg-white p-4 transition hover:border-pine-300 hover:shadow-sm"
            >
              <div className="font-medium text-gray-900">{b.label}</div>
              <div className="mt-1 text-sm text-gray-500">
                {count.toLocaleString()} controls in this workbook
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
