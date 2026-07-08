import { Link } from 'react-router-dom'
import { useModel } from '../store/modelStore'

export default function SourcesView() {
  const model = useModel((s) => s.model)
  const indexes = useModel((s) => s.indexes)
  if (!model || !indexes) return null

  const byGeo = new Map<string, typeof model.frameworks>()
  for (const f of model.frameworks) {
    const g = byGeo.get(f.geography)
    if (g) g.push(f)
    else byGeo.set(f.geography, [f])
  }

  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">Authoritative sources</h1>
      <p className="mt-2 max-w-3xl text-gray-600">
        Every law, regulation and framework the SCF maps to, with links to the source
        document and the SCF's set-theory relationship mapping (STRM) where published.
      </p>
      {[...byGeo.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([geo, fws]) => (
          <section key={geo} className="mt-8">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {geo}
            </h2>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              {fws
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((f) => {
                  const count = indexes.controlsByFramework.get(f.id)?.length ?? 0
                  return (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 border-b border-gray-100 px-4 py-2 text-sm last:border-0"
                    >
                      {count > 0 ? (
                        <Link
                          to={`/crosswalk?fw=${f.id}`}
                          className="min-w-0 flex-1 truncate font-medium text-indigo-700 hover:underline"
                        >
                          {f.name}
                        </Link>
                      ) : (
                        <span className="min-w-0 flex-1 truncate text-gray-500">{f.name}</span>
                      )}
                      <span className="hidden w-40 truncate text-xs text-gray-400 sm:block">
                        {f.source}
                      </span>
                      <span className="w-24 text-right text-xs tabular-nums text-gray-500">
                        {count > 0 ? `${count} controls` : '—'}
                      </span>
                      <span className="flex w-28 justify-end gap-2 text-xs">
                        {f.url && (
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:underline"
                          >
                            source ↗
                          </a>
                        )}
                        {f.strmUrl && (
                          <a
                            href={f.strmUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:underline"
                          >
                            STRM ↗
                          </a>
                        )}
                      </span>
                    </div>
                  )
                })}
            </div>
          </section>
        ))}
    </div>
  )
}
