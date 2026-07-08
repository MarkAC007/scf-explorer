import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useModel } from '../store/modelStore'
import { useScope, scopeStore } from '../scope/scopeStore'
import {
  scopeControlIds,
  marginalAdds,
  spineEdge,
  domainCoverage,
  weightingProfile,
  pptdfSplit,
  evidenceRollup,
  solutionsRollup,
} from '../scope/scopeMath'
import { downloadCsv } from '../lib/csv'
import Badge from '../components/Badge'

export default function ProgramView() {
  const model = useModel((s) => s.model)
  const indexes = useModel((s) => s.indexes)
  const scopes = useScope((s) => s.scopes)
  const activeScope = useScope((s) => s.activeScope)
  const notices = useScope((s) => s.notices)
  const [params, setParams] = useSearchParams()

  const [selection, setSelection] = useState<string[]>([])
  const [loadedScopeId, setLoadedScopeId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [fwFilter, setFwFilter] = useState('')
  const [seeded, setSeeded] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  // Seed the builder once: shared URL wins, then the active scope.
  useEffect(() => {
    if (seeded || !indexes) return
    const fromUrl = params.getAll('fw').filter((fw) => indexes.frameworkById.has(fw))
    if (fromUrl.length > 0) {
      setSelection(fromUrl)
      setName('Shared scope')
    } else if (activeScope) {
      setSelection(activeScope.frameworkIds)
      setLoadedScopeId(activeScope.id)
      setName(activeScope.name)
    }
    setSeeded(true)
  }, [seeded, indexes, params, activeScope])

  const set = useMemo(
    () => (indexes ? scopeControlIds(selection, indexes) : new Set<string>()),
    [selection, indexes],
  )
  const marginal = useMemo(
    () => (indexes ? marginalAdds(selection, indexes) : new Map<string, number>()),
    [selection, indexes],
  )

  if (!model || !indexes) return null

  const mappedFrameworks = model.frameworks
    .filter((f) => indexes.controlsByFramework.has(f.id))
    .sort(
      (a, b) => a.geography.localeCompare(b.geography) || a.name.localeCompare(b.name),
    )
  const pickable = fwFilter
    ? mappedFrameworks.filter((f) =>
        f.name.toLowerCase().includes(fwFilter.toLowerCase()),
      )
    : mappedFrameworks

  const toggle = (fwId: string) =>
    setSelection((sel) =>
      sel.includes(fwId) ? sel.filter((f) => f !== fwId) : [...sel, fwId],
    )

  const loadScope = (id: string) => {
    const s = scopes.find((x) => x.id === id)
    if (!s) return
    setSelection(s.frameworkIds)
    setLoadedScopeId(s.id)
    setName(s.name)
    setParams(new URLSearchParams(), { replace: true })
  }

  const saveScope = async () => {
    if (loadedScopeId) {
      await scopeStore.getState().updateFrameworks(loadedScopeId, selection)
      await scopeStore.getState().renameScope(loadedScopeId, name || 'Untitled scope')
    } else {
      const s = await scopeStore.getState().createScope(name || 'Untitled scope', selection)
      setLoadedScopeId(s.id)
    }
  }

  const activate = async () => {
    let id = loadedScopeId
    if (!id) {
      const s = await scopeStore
        .getState()
        .createScope(name || 'Untitled scope', selection)
      setLoadedScopeId(s.id)
      id = s.id
    } else {
      await saveScope()
    }
    await scopeStore.getState().setActive(id)
  }

  const shareUrl = () => {
    const q = selection.map((fw) => `fw=${encodeURIComponent(fw)}`).join('&')
    return `${location.origin}${location.pathname}#/program?${q}`
  }

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl())
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {
      prompt('Copy the share link:', shareUrl())
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900">Program scopes</h1>
      <p className="mt-2 max-w-3xl text-gray-600">
        Pick the frameworks your organisation must satisfy and see the compliance
        program they imply — the SCF controls in scope, the shape of the program, and
        the evidence and solution guidance connected to those controls. Scopes are saved
        in your browser; a share link carries only framework ids, never data.
      </p>

      {notices.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          {notices.map((n) => (
            <p key={n}>{n}</p>
          ))}
          <button
            type="button"
            className="mt-1 text-xs underline"
            onClick={() => scopeStore.getState().dismissNotices()}
          >
            Dismiss
          </button>
        </div>
      )}

      {scopes.length > 0 && (
        <section className="mt-6">
          <h2 className="eyebrow">Saved scopes</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {scopes.map((s) => {
              const isActive = activeScope?.id === s.id
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm ${
                    isActive ? 'border-pine-500 ring-1 ring-pine-500' : 'border-line'
                  }`}
                >
                  <button
                    type="button"
                    className="font-medium text-gray-900 hover:text-pine-700"
                    onClick={() => loadScope(s.id)}
                    title="Load into builder"
                  >
                    {s.name}
                  </button>
                  <span className="text-xs text-gray-400">
                    {s.frameworkIds.length} fw
                  </span>
                  {isActive ? (
                    <button
                      type="button"
                      className="text-xs text-pine-700 hover:underline"
                      onClick={() => void scopeStore.getState().setActive(null)}
                    >
                      deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="text-xs text-gray-500 hover:text-pine-700 hover:underline disabled:opacity-40"
                      disabled={s.frameworkIds.length === 0}
                      onClick={() => void scopeStore.getState().setActive(s.id)}
                    >
                      activate
                    </button>
                  )}
                  <button
                    type="button"
                    className="text-xs text-gray-400 hover:text-gray-700"
                    onClick={() => void scopeStore.getState().duplicateScope(s.id)}
                  >
                    duplicate
                  </button>
                  <button
                    type="button"
                    className="text-xs text-gray-400 hover:text-rust-600"
                    onClick={() => {
                      if (confirm(`Delete scope “${s.name}”?`)) {
                        if (loadedScopeId === s.id) {
                          setLoadedScopeId(null)
                          setSelection([])
                          setName('')
                        }
                        void scopeStore.getState().deleteScope(s.id)
                      }
                    }}
                  >
                    delete
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="eyebrow">Builder</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Scope name…"
              className="rounded border-gray-300 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              type="button"
              onClick={() => void saveScope()}
              className="rounded border border-line bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              {loadedScopeId ? 'Update scope' : 'Save as scope'}
            </button>
            <button
              type="button"
              onClick={() => void activate()}
              disabled={selection.length === 0}
              className="rounded bg-pine-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-pine-700 disabled:opacity-40"
            >
              Activate
            </button>
            <button
              type="button"
              onClick={() => void copyShare()}
              disabled={selection.length === 0}
              className="rounded border border-line bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              {shareCopied ? 'Link copied ✓' : 'Copy share link'}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelection([])
                setLoadedScopeId(null)
                setName('')
              }}
              className="text-sm text-gray-400 hover:text-gray-700"
            >
              clear
            </button>
          </div>

          <input
            type="search"
            placeholder="Filter frameworks…"
            className="mt-3 w-full max-w-sm rounded border-gray-300 text-sm"
            value={fwFilter}
            onChange={(e) => setFwFilter(e.target.value)}
          />
          <div className="mt-2 max-h-96 overflow-y-auto rounded-lg border border-line bg-white">
            {pickable.map((f) => {
              const selected = selection.includes(f.id)
              return (
                <label
                  key={f.id}
                  data-fw={f.id}
                  className={`flex cursor-pointer items-center gap-2 border-b border-line/60 px-3 py-1.5 text-sm last:border-0 ${
                    selected ? 'bg-pine-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggle(f.id)}
                  />
                  <span className="min-w-0 flex-1 truncate text-gray-900">{f.name}</span>
                  <span className="hidden text-xs text-gray-400 sm:block">
                    {f.geography}
                  </span>
                  <span className="w-20 text-right text-xs tabular-nums text-gray-500">
                    {indexes.controlsByFramework.get(f.id)?.length ?? 0} ctrls
                  </span>
                </label>
              )
            })}
          </div>
        </div>

        <div>
          <h2 className="eyebrow">Selected · {selection.length}</h2>
          <div className="mt-2 space-y-1.5" data-testid="selected-frameworks">
            {selection.map((fwId) => {
              const f = indexes.frameworkById.get(fwId)
              const adds = marginal.get(fwId) ?? 0
              return (
                <div
                  key={fwId}
                  className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate text-gray-900">
                    {f?.name ?? fwId}
                  </span>
                  <span
                    className="text-xs tabular-nums text-gray-500"
                    title="Controls only this framework adds to the scope"
                  >
                    +{adds} unique
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${f?.name ?? fwId}`}
                    className="text-gray-400 hover:text-rust-600"
                    onClick={() => toggle(fwId)}
                  >
                    ✕
                  </button>
                </div>
              )
            })}
            {selection.length === 0 && (
              <p className="text-sm text-gray-400">
                Tick frameworks on the left to shape a program.
              </p>
            )}
          </div>
          {selection.length > 0 && (
            <div className="mt-3 rounded-lg border border-pine-300 bg-pine-50 p-3 text-sm text-pine-700">
              <span className="font-display text-xl font-bold tabular-nums">
                {set.size.toLocaleString()}
              </span>{' '}
              SCF controls in scope (
              {((set.size / indexes.stats.controls) * 100).toFixed(0)}% of the SCF)
            </div>
          )}
        </div>
      </section>

      {selection.length > 0 && <ShapeSection selection={selection} set={set} />}
      {selection.length > 0 && <RollupSection set={set} />}
    </div>
  )
}

function ShapeSection({ selection, set }: { selection: string[]; set: Set<string> }) {
  const model = useModel((s) => s.model)!
  const indexes = useModel((s) => s.indexes)!
  const [drill, setDrill] = useState<'spine' | 'edges' | null>(null)

  const cov = useMemo(
    () => domainCoverage(set, indexes, model),
    [set, indexes, model],
  )
  const weights = useMemo(() => weightingProfile(set, indexes), [set, indexes])
  const split = useMemo(() => pptdfSplit(set, indexes), [set, indexes])
  const se = useMemo(() => spineEdge(selection, indexes), [selection, indexes])

  const exportShape = () =>
    downloadCsv(
      'scf-program-scope.csv',
      [...set]
        .sort()
        .map((id) => {
          const c = indexes.controlById.get(id)!
          return {
            'SCF #': c.id,
            Name: c.name,
            Domain: c.domainId,
            Weighting: c.weighting ?? '',
            'Required by': selection.filter((fw) => fw in c.mappings).length,
            Spine: selection.every((fw) => fw in c.mappings) ? 'yes' : '',
          }
        }),
    )

  const drillList = drill === 'spine' ? se.spine : drill === 'edges' ? se.edges : []

  return (
    <section className="mt-10">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Program shape</h2>
        <button
          type="button"
          onClick={exportShape}
          className="ml-auto rounded border border-line bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          Export CSV
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setDrill(drill === 'spine' ? null : 'spine')}
          className={`rounded-lg border bg-white p-4 text-left ${drill === 'spine' ? 'border-pine-500 ring-1 ring-pine-500' : 'border-line'}`}
        >
          <div className="font-display text-2xl font-bold tabular-nums text-ink-900">
            {se.spine.length}
          </div>
          <div className="mt-0.5 eyebrow">Spine — required by every framework</div>
        </button>
        <button
          type="button"
          onClick={() => setDrill(drill === 'edges' ? null : 'edges')}
          className={`rounded-lg border bg-white p-4 text-left ${drill === 'edges' ? 'border-pine-500 ring-1 ring-pine-500' : 'border-line'}`}
        >
          <div className="font-display text-2xl font-bold tabular-nums text-ink-900">
            {se.edges.length}
          </div>
          <div className="mt-0.5 eyebrow">Edges — required by exactly one</div>
        </button>
      </div>
      {drill && (
        <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-line bg-white">
          {drillList.map((c) => (
            <Link
              key={c.id}
              to={`/controls/${c.id}`}
              className="flex items-center gap-3 border-b border-line/60 px-4 py-1.5 text-sm last:border-0 hover:bg-pine-50/60"
            >
              <span className="id-plate w-24 shrink-0 text-sm">{c.id}</span>
              <span className="truncate text-gray-900">{c.name}</span>
            </Link>
          ))}
        </div>
      )}

      <h3 className="mt-6 eyebrow">Domain coverage — scoped vs full SCF</h3>
      <div className="mt-2 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
        {cov.map(({ domain, scoped, total }) => (
          <div key={domain.id} className="flex items-center gap-2 text-sm">
            <span className="w-12 shrink-0 font-mono text-xs font-semibold text-gray-500">
              {domain.id}
            </span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
              <span
                className="block h-full bg-pine-500"
                style={{ width: `${total ? (scoped / total) * 100 : 0}%` }}
              />
            </span>
            <span className="w-14 shrink-0 text-right text-xs tabular-nums text-gray-500">
              {scoped}/{total}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="eyebrow">Weighting profile</h3>
          <div className="mt-2 flex h-24 items-end gap-1" aria-label="Weighting histogram">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((w) => {
              const count = weights.find((x) => x.weight === w)?.count ?? 0
              const max = Math.max(1, ...weights.map((x) => x.count))
              return (
                <div key={w} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-pine-500/80"
                    style={{ height: `${(count / max) * 80}px` }}
                    title={`Weighting ${w}: ${count} controls`}
                  />
                  <span className="text-[10px] text-gray-400">{w}</span>
                </div>
              )
            })}
          </div>
        </div>
        <div>
          <h3 className="eyebrow">PPTDF split</h3>
          <div className="mt-2 space-y-1.5">
            {split.map(({ label, count }) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                <span className="w-24 shrink-0 text-gray-600">{label}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                  <span
                    className="block h-full bg-ink-700"
                    style={{ width: `${(count / set.size) * 100}%` }}
                  />
                </span>
                <span className="w-12 shrink-0 text-right text-xs tabular-nums text-gray-500">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function RollupSection({ set }: { set: Set<string> }) {
  const model = useModel((s) => s.model)!
  const indexes = useModel((s) => s.indexes)!
  const bands = useMemo(() => {
    const first = model.controls.find((c) => c.solutions.length > 0)
    return first?.solutions.map((s) => s.sizeBand) ?? []
  }, [model])
  const [band, setBand] = useState('')
  const [tab, setTab] = useState<'evidence' | 'solutions'>('evidence')

  useEffect(() => {
    if (!band && bands.length) setBand(bands[0])
  }, [band, bands])

  const evidence = useMemo(() => evidenceRollup(set, indexes), [set, indexes])
  const solutions = useMemo(
    () => (band ? solutionsRollup(set, indexes, band) : []),
    [set, indexes, band],
  )
  const artifactCount = evidence.reduce((s, g) => s + g.items.length, 0)

  const exportEvidence = () =>
    downloadCsv(
      'scf-program-evidence.csv',
      evidence.flatMap((g) =>
        g.items.map((i) => ({
          'ERL #': i.erl.id,
          'Area of focus': g.areaOfFocus,
          Artifact: i.erl.artifact,
          Description: i.erl.description,
          'Driving controls': i.drivingControls.map((c) => c.id).join('; '),
        })),
      ),
    )

  const exportSolutions = () =>
    downloadCsv(
      'scf-program-solutions.csv',
      solutions.flatMap((g) =>
        g.entries.map((e) => ({
          'SCF #': e.control.id,
          Control: e.control.name,
          Domain: g.domain.id,
          'Org size': band,
          Guidance: e.text,
        })),
      ),
    )

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Rollups</h2>
        <div role="tablist" className="flex gap-1">
          <button
            role="tab"
            type="button"
            aria-selected={tab === 'evidence'}
            onClick={() => setTab('evidence')}
            className={`rounded px-3 py-1 text-sm font-medium ${tab === 'evidence' ? 'bg-pine-100 text-pine-700' : 'text-gray-500 hover:text-gray-800'}`}
          >
            Evidence · {artifactCount}
          </button>
          <button
            role="tab"
            type="button"
            aria-selected={tab === 'solutions'}
            onClick={() => setTab('solutions')}
            className={`rounded px-3 py-1 text-sm font-medium ${tab === 'solutions' ? 'bg-pine-100 text-pine-700' : 'text-gray-500 hover:text-gray-800'}`}
          >
            Solutions
          </button>
        </div>
        <button
          type="button"
          onClick={tab === 'evidence' ? exportEvidence : exportSolutions}
          className="ml-auto rounded border border-line bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          Export CSV
        </button>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        {tab === 'evidence'
          ? `A program of this shape implies ${artifactCount} distinct evidence artifacts (read-only reference — no tracking).`
          : 'Solution guidance connected to the in-scope controls, for your organisation size.'}
      </p>

      {tab === 'evidence' ? (
        <div className="mt-4 space-y-6">
          {evidence.map((g) => (
            <div key={g.areaOfFocus}>
              <h3 className="mb-2 eyebrow">{g.areaOfFocus}</h3>
              <div className="space-y-2">
                {g.items.map(({ erl, drivingControls }) => (
                  <div key={erl.id} className="rounded-lg border border-line bg-white p-3">
                    <div className="flex items-center gap-2">
                      <Badge tone="green">{erl.id}</Badge>
                      <span className="text-sm font-medium text-gray-900">
                        {erl.artifact}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{erl.description}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {drivingControls.map((c) => (
                        <Link
                          key={c.id}
                          to={`/controls/${c.id}`}
                          className="rounded bg-pine-50 px-1.5 py-0.5 font-mono text-xs font-medium text-pine-700 hover:bg-pine-100"
                        >
                          {c.id}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <label htmlFor="band" className="eyebrow">
            Organisation size
          </label>
          <select
            id="band"
            className="mt-1 block w-full max-w-md rounded border-gray-300 text-sm"
            value={band}
            onChange={(e) => setBand(e.target.value)}
          >
            {bands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <div className="mt-4 space-y-6">
            {solutions.map((g) => (
              <div key={g.domain.id}>
                <h3 className="mb-2 eyebrow">
                  {g.domain.id} — {g.domain.name}
                </h3>
                <div className="space-y-2">
                  {g.entries.map((e) => (
                    <div
                      key={e.control.id}
                      className="rounded-lg border border-line bg-white p-3"
                    >
                      <Link
                        to={`/controls/${e.control.id}`}
                        className="id-plate text-sm hover:underline"
                      >
                        {e.control.id}
                      </Link>
                      <span className="ml-2 text-sm font-medium text-gray-900">
                        {e.control.name}
                      </span>
                      <p className="mt-1 whitespace-pre-line text-sm text-gray-600">
                        {e.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
