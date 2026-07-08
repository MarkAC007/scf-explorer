import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useModel } from '../store/modelStore'
import { coverage, overlap } from './crosswalk'
import { downloadCsv } from '../lib/csv'
import Badge from '../components/Badge'

type OverlapFilter = 'all' | 'shared' | 'onlyA' | 'onlyB'

function FrameworkSelect({
  id,
  label,
  value,
  onChange,
  frameworks,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  frameworks: { id: string; name: string; geography: string }[]
}) {
  const groups = useMemo(() => {
    const m = new Map<string, typeof frameworks>()
    for (const f of frameworks) {
      const g = m.get(f.geography)
      if (g) g.push(f)
      else m.set(f.geography, [f])
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [frameworks])

  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </label>
      <select
        id={id}
        className="mt-1 w-full rounded border-gray-300 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— none —</option>
        {groups.map(([geo, fws]) => (
          <optgroup key={geo} label={geo}>
            {fws
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </div>
  )
}

export default function CrosswalkView() {
  const model = useModel((s) => s.model)
  const indexes = useModel((s) => s.indexes)
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState<OverlapFilter>('all')

  const fwA = params.get('fw') ?? ''
  const fwB = params.get('fwB') ?? ''

  const mappedFrameworks = useMemo(
    () =>
      model && indexes
        ? model.frameworks.filter((f) => indexes.controlsByFramework.has(f.id))
        : [],
    [model, indexes],
  )

  const cov = useMemo(
    () => (fwA && model && indexes ? coverage(fwA, indexes, model) : null),
    [fwA, model, indexes],
  )
  const covB = useMemo(
    () => (fwB && model && indexes ? coverage(fwB, indexes, model) : null),
    [fwB, model, indexes],
  )
  const ovl = useMemo(
    () => (fwA && fwB && indexes ? overlap(fwA, fwB, indexes) : null),
    [fwA, fwB, indexes],
  )

  if (!model || !indexes) return null

  const setFw = (key: 'fw' | 'fwB', v: string) => {
    const next = new URLSearchParams(params)
    if (v) next.set(key, v)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const exportCoverage = () => {
    if (!cov) return
    downloadCsv(
      `scf-coverage-${cov.framework.id}.csv`,
      cov.controls.map((c) => ({
        'SCF #': c.id,
        Name: c.name,
        Domain: c.domainId,
        [`${cov.framework.name} refs`]: (c.mappings[cov.framework.id] ?? []).join('; '),
      })),
    )
  }

  const exportOverlap = () => {
    if (!ovl || !cov || !covB) return
    const rows = [
      ...ovl.shared.map((c) => ({ c, membership: 'shared' })),
      ...ovl.onlyA.map((c) => ({ c, membership: `only ${cov.framework.name}` })),
      ...ovl.onlyB.map((c) => ({ c, membership: `only ${covB.framework.name}` })),
    ]
    downloadCsv(
      `scf-overlap-${cov.framework.id}--${covB.framework.id}.csv`,
      rows.map(({ c, membership }) => ({
        'SCF #': c.id,
        Name: c.name,
        Membership: membership,
        [`${cov.framework.name} refs`]: (c.mappings[fwA] ?? []).join('; '),
        [`${covB.framework.name} refs`]: (c.mappings[fwB] ?? []).join('; '),
      })),
    )
  }

  const overlapRows =
    ovl && filter === 'shared'
      ? ovl.shared
      : ovl && filter === 'onlyA'
        ? ovl.onlyA
        : ovl && filter === 'onlyB'
          ? ovl.onlyB
          : ovl
            ? [...ovl.shared, ...ovl.onlyA, ...ovl.onlyB]
            : []

  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">Framework crosswalk</h1>
      <p className="mt-2 max-w-3xl text-gray-600">
        The SCF acts as a Rosetta stone between frameworks: every SCF control carries
        references into the frameworks it satisfies. Pick one framework to see its SCF
        coverage — pick two to see what they share and where they differ.
      </p>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row">
        <FrameworkSelect
          id="fw-a"
          label="Framework A"
          value={fwA}
          onChange={(v) => setFw('fw', v)}
          frameworks={mappedFrameworks}
        />
        <FrameworkSelect
          id="fw-b"
          label="Framework B (optional — enables overlap)"
          value={fwB}
          onChange={(v) => setFw('fwB', v)}
          frameworks={mappedFrameworks}
        />
      </div>

      {cov && !ovl && (
        <section className="mt-8">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900">{cov.framework.name}</h2>
            <Badge tone="indigo">{cov.controls.length} SCF controls</Badge>
            {cov.framework.url && (
              <a
                href={cov.framework.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-indigo-600 hover:underline"
              >
                Source ↗
              </a>
            )}
            {cov.framework.strmUrl && (
              <a
                href={cov.framework.strmUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-indigo-600 hover:underline"
              >
                STRM mapping ↗
              </a>
            )}
            <button
              type="button"
              onClick={exportCoverage}
              className="ml-auto rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Export CSV
            </button>
          </div>

          <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Domain coverage
          </h3>
          <div className="mt-2 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
            {cov.domainCoverage.map(({ domain, mapped, total }) => (
              <div key={domain.id} className="flex items-center gap-2 text-sm">
                <span className="w-12 shrink-0 font-mono text-xs font-semibold text-gray-500">
                  {domain.id}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                  <span
                    className="block h-full bg-indigo-500"
                    style={{ width: `${total ? (mapped / total) * 100 : 0}%` }}
                  />
                </span>
                <span className="w-14 shrink-0 text-right text-xs tabular-nums text-gray-500">
                  {mapped}/{total}
                </span>
              </div>
            ))}
          </div>

          <h3 className="mt-6 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Mapped controls
          </h3>
          <div className="mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white">
            {cov.controls.map((c) => (
              <Link
                key={c.id}
                to={`/controls/${c.id}`}
                className="flex items-center gap-4 border-b border-gray-100 px-4 py-2 last:border-0 hover:bg-indigo-50/50"
              >
                <span className="w-24 shrink-0 font-mono text-sm font-semibold text-indigo-700">
                  {c.id}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-gray-900">{c.name}</span>
                <span className="hidden max-w-[40%] truncate font-mono text-xs text-gray-500 md:block">
                  {(c.mappings[cov.framework.id] ?? []).join(' · ')}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {ovl && cov && covB && (
        <section className="mt-8">
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setFilter(filter === 'shared' ? 'all' : 'shared')}
              className={`rounded-lg border p-4 text-left ${filter === 'shared' ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200 bg-white'}`}
            >
              <div className="text-2xl font-bold tabular-nums text-gray-900">
                {ovl.shared.length}
              </div>
              <div className="text-xs text-gray-500">shared SCF controls</div>
            </button>
            <button
              type="button"
              onClick={() => setFilter(filter === 'onlyA' ? 'all' : 'onlyA')}
              className={`rounded-lg border p-4 text-left ${filter === 'onlyA' ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200 bg-white'}`}
            >
              <div className="text-2xl font-bold tabular-nums text-gray-900">
                {ovl.onlyA.length}
              </div>
              <div className="truncate text-xs text-gray-500">only {cov.framework.name}</div>
            </button>
            <button
              type="button"
              onClick={() => setFilter(filter === 'onlyB' ? 'all' : 'onlyB')}
              className={`rounded-lg border p-4 text-left ${filter === 'onlyB' ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200 bg-white'}`}
            >
              <div className="text-2xl font-bold tabular-nums text-gray-900">
                {ovl.onlyB.length}
              </div>
              <div className="truncate text-xs text-gray-500">only {covB.framework.name}</div>
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              e.g. “already aligned to {cov.framework.name}? The{' '}
              <button
                type="button"
                className="text-indigo-600 hover:underline"
                onClick={() => setFilter('onlyB')}
              >
                {ovl.onlyB.length} controls unique to {covB.framework.name}
              </button>{' '}
              are your gap.”
            </p>
            <button
              type="button"
              onClick={exportOverlap}
              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Export CSV
            </button>
          </div>

          <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="grid grid-cols-[6rem_1fr_1fr_1fr] gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <span>SCF #</span>
              <span>Control</span>
              <span className="truncate">{cov.framework.name}</span>
              <span className="truncate">{covB.framework.name}</span>
            </div>
            {overlapRows.map((c) => (
              <Link
                key={c.id}
                to={`/controls/${c.id}`}
                className="grid grid-cols-[6rem_1fr_1fr_1fr] items-center gap-2 border-b border-gray-100 px-4 py-2 text-sm last:border-0 hover:bg-indigo-50/50"
              >
                <span className="font-mono font-semibold text-indigo-700">{c.id}</span>
                <span className="truncate text-gray-900">{c.name}</span>
                <span className="truncate font-mono text-xs text-gray-500">
                  {(c.mappings[fwA] ?? []).join(' · ') || '—'}
                </span>
                <span className="truncate font-mono text-xs text-gray-500">
                  {(c.mappings[fwB] ?? []).join(' · ') || '—'}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!cov && (
        <p className="mt-10 text-center text-sm text-gray-400">
          Select a framework above to begin.
        </p>
      )}
    </div>
  )
}
