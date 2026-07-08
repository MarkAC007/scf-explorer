import { Link } from 'react-router-dom'
import { useModel } from '../store/modelStore'
import Badge from '../components/Badge'

export default function PrivacyView() {
  const model = useModel((s) => s.model)
  const indexes = useModel((s) => s.indexes)
  if (!model || !indexes) return null

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">
        Data privacy management principles
      </h1>
      <p className="mt-2 max-w-3xl text-gray-600">
        The SCF-DPMP principles distil privacy programme design into{' '}
        {model.privacyPrinciples.length} principles, each realised through SCF controls
        and mapped to the major privacy frameworks.
      </p>
      <div className="mt-6 space-y-4">
        {model.privacyPrinciples.map((p) => (
          <section key={p.num} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2">
              <Badge tone="indigo">#{p.num}</Badge>
              <h2 className="font-semibold text-gray-900">{p.name}</h2>
            </div>
            <p className="mt-2 text-sm text-gray-600">{p.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.controlIds.map((cid) =>
                indexes.controlById.has(cid) ? (
                  <Link
                    key={cid}
                    to={`/controls/${cid}`}
                    className="rounded bg-indigo-50 px-1.5 py-0.5 font-mono text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                  >
                    {cid}
                  </Link>
                ) : (
                  <span
                    key={cid}
                    className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-500"
                    title="Not present in this workbook slice"
                  >
                    {cid}
                  </span>
                ),
              )}
            </div>
            {Object.keys(p.mappings).length > 0 && (
              <p className="mt-3 text-xs text-gray-400">
                Mapped to {Object.keys(p.mappings).length} privacy frameworks
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
