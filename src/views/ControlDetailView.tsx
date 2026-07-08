import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useModel } from '../store/modelStore'
import { groupMappings } from './controlDetail.helpers'
import Badge from '../components/Badge'
import WeightBar from '../components/WeightBar'
import Tabs from '../components/Tabs'

const LEVEL_TONES = [
  'bg-gray-300',
  'bg-red-400',
  'bg-amber-400',
  'bg-yellow-400',
  'bg-lime-500',
  'bg-green-600',
]

export default function ControlDetailView() {
  const { id } = useParams()
  const model = useModel((s) => s.model)
  const indexes = useModel((s) => s.indexes)
  const [mappingFilter, setMappingFilter] = useState('')

  const control = id ? indexes?.controlById.get(id) : undefined

  const groups = useMemo(
    () => (control && indexes ? groupMappings(control, indexes.frameworkById) : []),
    [control, indexes],
  )

  if (!model || !indexes) return null
  if (!control) {
    return (
      <div className="p-12 text-center text-gray-500">
        Control “{id}” not found in this workbook.{' '}
        <Link to="/controls" className="text-pine-600 hover:underline">
          Browse controls
        </Link>
      </div>
    )
  }

  const domain = indexes.domainById.get(control.domainId)
  const ordered = model.controls
  const idx = ordered.findIndex((c) => c.id === control.id)
  const prev = idx > 0 ? ordered[idx - 1] : null
  const next = idx < ordered.length - 1 ? ordered[idx + 1] : null

  const risks = control.riskIds.map((r) => indexes.riskById.get(r)).filter(Boolean)
  const threats = control.threatIds.map((t) => indexes.threatById.get(t)).filter(Boolean)
  const aos = indexes.aosByControl.get(control.id) ?? []
  const comp = indexes.compensatingByControl.get(control.id)
  const erl = indexes.erlByControl.get(control.id) ?? []
  const mappingCount = Object.keys(control.mappings).length

  const filteredGroups = mappingFilter
    ? groups
        .map((g) => ({
          ...g,
          items: g.items.filter((i) =>
            i.framework.name.toLowerCase().includes(mappingFilter.toLowerCase()),
          ),
        }))
        .filter((g) => g.items.length > 0)
    : groups

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="flex items-center justify-between text-sm">
        <Link to="/controls" className="text-pine-600 hover:underline">
          ← All controls
        </Link>
        <div className="flex gap-3">
          {prev && (
            <Link to={`/controls/${prev.id}`} className="text-gray-500 hover:text-pine-600">
              ← {prev.id}
            </Link>
          )}
          {next && (
            <Link to={`/controls/${next.id}`} className="text-gray-500 hover:text-pine-600">
              {next.id} →
            </Link>
          )}
        </div>
      </div>

      <header className="mt-4 rounded-lg border border-line bg-white p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="id-plate text-xl">{control.id}</span>
          <h1 className="text-xl font-semibold text-gray-900">{control.name}</h1>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          {domain && (
            <Link to={`/controls?domain=${domain.id}`}>
              <Badge tone="indigo">{domain.id} — {domain.name}</Badge>
            </Link>
          )}
          {control.pptdf.map((p) => (
            <Badge key={p}>{p}</Badge>
          ))}
          {control.csfFunction && <Badge tone="sky">CSF: {control.csfFunction}</Badge>}
          {control.cadence && <Badge tone="green">Validate: {control.cadence}</Badge>}
          {control.scrmTiers.length > 0 && (
            <Badge tone="amber">SCRM tiers {control.scrmTiers.join(', ')}</Badge>
          )}
          <WeightBar value={control.weighting} />
        </div>
        <p className="mt-4 text-gray-700">{control.description}</p>
        {control.question && (
          <div className="mt-4 rounded border-l-4 border-pine-300 bg-pine-50 p-3 text-sm text-pine-700">
            <span className="font-semibold">Control question:</span> {control.question}
          </div>
        )}
        {control.baselines.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {control.baselines.map((b) => {
              const def = model.baselineDefs.find((d) => d.id === b)
              return (
                <Link key={b} to={`/controls?baseline=${b}`}>
                  <Badge tone="gray" title="SCF baseline membership">
                    {def?.label ?? b}
                  </Badge>
                </Link>
              )
            })}
          </div>
        )}
        {control.errata && (
          <p className="mt-3 text-xs text-gray-400">Errata {model.version}: {control.errata}</p>
        )}
      </header>

      <div className="mt-6">
        <Tabs
          tabs={[
            {
              id: 'maturity',
              label: 'Maturity',
              content: (
                <ol className="space-y-3">
                  {control.maturity.map((m) => (
                    <li key={m.level} className="flex gap-4 rounded-lg border border-line bg-white p-4">
                      <div className="flex flex-col items-center">
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${LEVEL_TONES[m.level]}`}
                        >
                          {m.level}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900">
                          Level {m.level} — {m.title}
                        </h3>
                        <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{m.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ),
            },
            {
              id: 'mappings',
              label: 'Mappings',
              count: mappingCount,
              content: (
                <div>
                  <input
                    type="search"
                    placeholder="Filter frameworks…"
                    className="mb-4 w-full max-w-sm rounded border-gray-300 text-sm"
                    value={mappingFilter}
                    onChange={(e) => setMappingFilter(e.target.value)}
                  />
                  {filteredGroups.map((g) => (
                    <section key={g.geography} className="mb-6">
                      <h3 className="mb-2 eyebrow">
                        {g.geography}
                      </h3>
                      <div className="space-y-2">
                        {g.items.map(({ framework, refs }) => (
                          <div
                            key={framework.id}
                            className="rounded-lg border border-line bg-white p-3"
                          >
                            <div className="flex items-baseline justify-between gap-2">
                              <Link
                                to={`/crosswalk?fw=${framework.id}`}
                                className="text-sm font-medium text-pine-700 hover:underline"
                              >
                                {framework.name}
                              </Link>
                              <span className="text-xs text-gray-400">{refs.length} refs</span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {refs.map((r) => (
                                <span
                                  key={r}
                                  className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-700"
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                  {filteredGroups.length === 0 && (
                    <p className="text-sm text-gray-500">No frameworks match the filter.</p>
                  )}
                </div>
              ),
            },
            {
              id: 'risks',
              label: 'Risks & Threats',
              count: risks.length + threats.length,
              content: (
                <div className="grid gap-6 lg:grid-cols-2">
                  <section>
                    <h3 className="mb-2 eyebrow">
                      Risks this control mitigates
                    </h3>
                    <div className="space-y-2">
                      {risks.map((r) => (
                        <div key={r!.id} className="rounded-lg border border-line bg-white p-3">
                          <div className="flex items-center gap-2">
                            <Badge tone="red">{r!.id}</Badge>
                            <span className="text-sm font-medium text-gray-900">{r!.name}</span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">{r!.description}</p>
                        </div>
                      ))}
                      {risks.length === 0 && <p className="text-sm text-gray-500">None linked.</p>}
                    </div>
                  </section>
                  <section>
                    <h3 className="mb-2 eyebrow">
                      Threats it defends against
                    </h3>
                    <div className="space-y-2">
                      {threats.map((t) => (
                        <div key={t!.id} className="rounded-lg border border-line bg-white p-3">
                          <div className="flex items-center gap-2">
                            <Badge tone="amber">{t!.id}</Badge>
                            <span className="text-sm font-medium text-gray-900">{t!.name}</span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">{t!.description}</p>
                        </div>
                      ))}
                      {threats.length === 0 && <p className="text-sm text-gray-500">None linked.</p>}
                    </div>
                  </section>
                </div>
              ),
            },
            {
              id: 'aos',
              label: 'Assessment Objectives',
              count: aos.length,
              content: (
                <div className="space-y-2">
                  {aos.map((ao) => (
                    <div key={ao.id} className="rounded-lg border border-line bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-gray-500">{ao.id}</span>
                        {ao.rigor != null && (
                          <Badge tone="sky" title="Assessment rigor">
                            Rigor {ao.rigor}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-700">{ao.text}</p>
                      {ao.origins.length > 0 && (
                        <p className="mt-1 text-xs text-gray-400">Origin: {ao.origins.join(', ')}</p>
                      )}
                    </div>
                  ))}
                  {aos.length === 0 && (
                    <p className="text-sm text-gray-500">No assessment objectives for this control.</p>
                  )}
                </div>
              ),
            },
            {
              id: 'compensating',
              label: 'Compensating',
              count: comp?.options.length ?? 0,
              content: (
                <div>
                  {comp ? (
                    <>
                      <p className="rounded-lg border border-line bg-white p-3 text-sm text-gray-700">
                        {comp.riskNote}
                      </p>
                      <div className="mt-3 space-y-2">
                        {comp.options.map((o) => (
                          <div key={o.id} className="rounded-lg border border-line bg-white p-3">
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/controls/${o.id}`}
                                className="font-mono text-sm font-semibold text-pine-700 hover:underline"
                              >
                                {o.id}
                              </Link>
                              <span className="text-sm font-medium text-gray-900">{o.name}</span>
                            </div>
                            {o.justification && (
                              <p className="mt-1 text-sm text-gray-600">{o.justification}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">No compensating-control data.</p>
                  )}
                </div>
              ),
            },
            {
              id: 'evidence',
              label: 'Evidence',
              count: erl.length,
              content: (
                <div className="space-y-2">
                  {erl.map((e) => (
                    <div key={e.id} className="rounded-lg border border-line bg-white p-3">
                      <div className="flex items-center gap-2">
                        <Badge tone="green">{e.id}</Badge>
                        <span className="text-sm font-medium text-gray-900">{e.artifact}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{e.description}</p>
                      <p className="mt-1 text-xs text-gray-400">{e.areaOfFocus}</p>
                    </div>
                  ))}
                  {erl.length === 0 && (
                    <p className="text-sm text-gray-500">No evidence artifacts referenced.</p>
                  )}
                </div>
              ),
            },
            {
              id: 'solutions',
              label: 'Solutions',
              content: (
                <div className="space-y-2">
                  {control.solutions.map((s) => (
                    <div key={s.sizeBand} className="rounded-lg border border-line bg-white p-3">
                      <h3 className="text-sm font-semibold text-gray-900">{s.sizeBand}</h3>
                      <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{s.text}</p>
                    </div>
                  ))}
                  {control.solutions.length === 0 && (
                    <p className="text-sm text-gray-500">No solution guidance for this control.</p>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  )
}
