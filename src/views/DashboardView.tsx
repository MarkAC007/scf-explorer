import { Link } from 'react-router-dom'
import { useModel } from '../store/modelStore'
import StatCard from '../components/StatCard'

export default function DashboardView() {
  const model = useModel((s) => s.model)
  const indexes = useModel((s) => s.indexes)
  if (!model || !indexes) return null
  const { stats } = indexes

  return (
    <div className="mx-auto max-w-6xl p-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Secure Controls Framework{' '}
          <span className="rounded bg-pine-100 px-2 py-0.5 text-sm font-semibold text-pine-700 align-middle">
            {model.version}
          </span>
        </h1>
        <p className="mt-2 max-w-3xl text-gray-600">
          The SCF is a <strong>meta-framework</strong> — a superset of cybersecurity and
          privacy controls mapped to {stats.mappedFrameworks.toLocaleString()} laws,
          regulations and frameworks. Comply once, align everywhere: browse the controls,
          then use the crosswalk to see how one framework translates to another.
        </p>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Controls" value={stats.controls} />
        <StatCard label="Frameworks mapped" value={stats.mappedFrameworks} />
        <StatCard label="Domains" value={stats.domains} />
        <StatCard label="Risks" value={stats.risks} />
        <StatCard label="Threats" value={stats.threats} />
        <StatCard label="Assessment objectives" value={stats.aos} />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-gray-900">Domains</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {model.domains.map((d) => {
          const count = indexes.controlsByDomain.get(d.id)?.length ?? 0
          return (
            <Link
              key={d.id}
              to={`/controls?domain=${d.id}`}
              className="group rounded-lg border border-line bg-white p-4 transition hover:border-pine-300 hover:shadow-sm"
            >
              <div className="flex items-baseline justify-between">
                <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-gray-700 group-hover:bg-pine-100 group-hover:text-pine-700">
                  {d.id}
                </span>
                <span className="text-xs text-gray-400">
                  {count > 0 ? `${count} controls` : `${d.controlCount} controls`}
                </span>
              </div>
              <div className="mt-2 font-medium text-gray-900">{d.name}</div>
              <p className="mt-1 line-clamp-2 text-sm text-gray-500">{d.principle}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
