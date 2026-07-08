import { useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useModel } from '../store/modelStore'
import { useScope } from '../scope/scopeStore'
import { buildSearch } from '../search/searchIndex'
import { applyFilters, type ControlFilters } from './controlsFilter'
import { downloadCsv } from '../lib/csv'
import Badge from '../components/Badge'
import WeightBar from '../components/WeightBar'

const PPTDF = ['People', 'Process', 'Technology', 'Data', 'Facility']
const CSF = ['Govern', 'Identify', 'Protect', 'Detect', 'Respond', 'Recover']

export default function ControlsView() {
  const model = useModel((s) => s.model)
  const indexes = useModel((s) => s.indexes)
  const activeScope = useScope((s) => s.activeScope)
  const scopeSet = useScope((s) => s.activeControlIds)
  const [params, setParams] = useSearchParams()
  const showAll = params.get('all') === '1'
  const scrollRef = useRef<HTMLDivElement>(null)

  const search = useMemo(
    () => (model ? buildSearch(model.controls) : null),
    [model],
  )

  const filters: ControlFilters = useMemo(
    () => ({
      domain: params.get('domain') ?? undefined,
      pptdf: params.getAll('pptdf'),
      csf: params.getAll('csf'),
      baseline: params.get('baseline') ?? undefined,
      framework: params.get('framework') ?? undefined,
      weightMin: params.get('weightMin') ? Number(params.get('weightMin')) : undefined,
      query: params.get('q') ?? undefined,
    }),
    [params],
  )

  const filtered = useMemo(() => {
    if (!model || !search) return []
    const base = applyFilters(model.controls, filters, search)
    return scopeSet && !showAll ? base.filter((c) => scopeSet.has(c.id)) : base
  }, [model, search, filters, scopeSet, showAll])

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 64,
    overscan: 10,
  })

  if (!model || !indexes) return null

  const setParam = (key: string, value: string | string[] | null) => {
    const next = new URLSearchParams(params)
    next.delete(key)
    if (Array.isArray(value)) value.forEach((v) => next.append(key, v))
    else if (value) next.set(key, value)
    setParams(next, { replace: true })
  }

  const toggleMulti = (key: string, value: string) => {
    const current = params.getAll(key)
    setParam(key, current.includes(value) ? current.filter((v) => v !== value) : [...current, value])
  }

  const exportCsv = () =>
    downloadCsv(
      'scf-controls.csv',
      filtered.map((c) => ({
        'SCF #': c.id,
        Name: c.name,
        Domain: c.domainId,
        Description: c.description,
        Weighting: c.weighting ?? '',
        PPTDF: c.pptdf.join('; '),
        'NIST CSF Function': c.csfFunction,
        'Mapped frameworks': Object.keys(c.mappings).length,
      })),
    )

  const sortedFrameworks = [...model.frameworks]
    .filter((f) => indexes.controlsByFramework.has(f.id))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="flex h-full">
      <aside className="w-64 shrink-0 space-y-5 overflow-y-auto border-r border-line bg-white p-4">
        <div>
          <label htmlFor="f-domain" className="eyebrow">
            Domain
          </label>
          <select
            id="f-domain"
            className="mt-1 w-full rounded border-gray-300 text-sm"
            value={filters.domain ?? ''}
            onChange={(e) => setParam('domain', e.target.value || null)}
          >
            <option value="">All domains</option>
            {model.domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id} — {d.name}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="eyebrow">PPTDF</legend>
          <div className="mt-1 space-y-1">
            {PPTDF.map((p) => (
              <label key={p} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={filters.pptdf?.includes(p) ?? false}
                  onChange={() => toggleMulti('pptdf', p)}
                />
                {p}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="eyebrow">CSF Function</legend>
          <div className="mt-1 space-y-1">
            {CSF.map((f) => (
              <label key={f} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={filters.csf?.includes(f) ?? false}
                  onChange={() => toggleMulti('csf', f)}
                />
                {f}
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="f-baseline" className="eyebrow">
            Baseline
          </label>
          <select
            id="f-baseline"
            className="mt-1 w-full rounded border-gray-300 text-sm"
            value={filters.baseline ?? ''}
            onChange={(e) => setParam('baseline', e.target.value || null)}
          >
            <option value="">Any</option>
            {model.baselineDefs.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="f-framework" className="eyebrow">
            Mapped to framework
          </label>
          <select
            id="f-framework"
            className="mt-1 w-full rounded border-gray-300 text-sm"
            value={filters.framework ?? ''}
            onChange={(e) => setParam('framework', e.target.value || null)}
          >
            <option value="">Any</option>
            {sortedFrameworks.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="f-weight" className="eyebrow">
            Min weighting: {filters.weightMin ?? 1}
          </label>
          <input
            id="f-weight"
            type="range"
            min={1}
            max={10}
            className="mt-1 w-full"
            value={filters.weightMin ?? 1}
            onChange={(e) => setParam('weightMin', e.target.value === '1' ? null : e.target.value)}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-line bg-white px-4 py-3">
          <input
            type="search"
            placeholder="Search controls — id, name, description, question…"
            className="w-full max-w-md rounded border-gray-300 text-sm"
            value={filters.query ?? ''}
            onChange={(e) => setParam('q', e.target.value || null)}
          />
          <span className="text-sm tabular-nums text-gray-500" data-testid="control-count">
            {filtered.length.toLocaleString()} controls
          </span>
          {activeScope && (
            <label className="flex items-center gap-1.5 text-sm text-pine-700">
              <input
                type="checkbox"
                checked={!showAll}
                onChange={() => setParam('all', showAll ? null : '1')}
              />
              scope: {activeScope.name}
            </label>
          )}
          <button
            type="button"
            onClick={exportCsv}
            className="ml-auto rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-paper"
          >
            Export CSV
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((vi) => {
              const c = filtered[vi.index]
              return (
                <Link
                  key={c.id}
                  to={`/controls/${c.id}`}
                  className="absolute left-0 flex w-full items-center gap-4 border-b border-line/60 bg-white px-4 hover:bg-pine-50/60"
                  style={{ top: vi.start, height: vi.size }}
                >
                  <span className="id-plate w-24 shrink-0 text-sm">
                    {c.id}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-900">{c.name}</span>
                    <span className="block truncate text-xs text-gray-500">{c.description}</span>
                  </span>
                  <span className="hidden shrink-0 gap-1 md:flex">
                    {c.pptdf.map((p) => (
                      <Badge key={p}>{p}</Badge>
                    ))}
                  </span>
                  <span className="hidden w-20 shrink-0 text-right text-xs text-gray-400 lg:block">
                    {Object.keys(c.mappings).length} maps
                  </span>
                  <span className="shrink-0">
                    <WeightBar value={c.weighting} />
                  </span>
                </Link>
              )
            })}
          </div>
          {filtered.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              No controls match the current filters.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
