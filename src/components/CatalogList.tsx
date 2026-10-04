import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Control } from '../model/types'
import Badge from './Badge'
import { useScope } from '../scope/scopeStore'

export interface CatalogEntry {
  id: string
  grouping: string
  name: string
  description: string
  materiality: string
  extra?: string
  linked: Control[]
  /** Controls rated "Unlikely" for this entry (SCF 2026.3+); shown only when the viewer opts in. */
  linkedUnlikely?: Control[]
}

/** Grouped, expandable catalog list shared by the Risks and Threats views. */
export default function CatalogList({
  entries,
  tone,
}: {
  entries: CatalogEntry[]
  tone: 'red' | 'amber'
}) {
  const [open, setOpen] = useState<string | null>(null)
  const [showUnlikely, setShowUnlikely] = useState(false)
  const scopeSet = useScope((s) => s.activeControlIds)
  const hasUnlikely = entries.some((e) => (e.linkedUnlikely?.length ?? 0) > 0)
  const linkedFor = (e: CatalogEntry): Control[] =>
    showUnlikely && e.linkedUnlikely ? [...e.linked, ...e.linkedUnlikely] : e.linked

  const groups = new Map<string, CatalogEntry[]>()
  for (const e of entries) {
    const g = groups.get(e.grouping)
    if (g) g.push(e)
    else groups.set(e.grouping, [e])
  }

  return (
    <div className="space-y-8">
      {hasUnlikely && (
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showUnlikely}
            onChange={(e) => setShowUnlikely(e.target.checked)}
            data-testid="show-unlikely"
          />
          Include controls the SCF rates &ldquo;Unlikely&rdquo; to affect each entry
        </label>
      )}
      {[...groups.entries()].map(([grouping, items]) => (
        <section key={grouping}>
          <h2 className="mb-2 eyebrow">
            {grouping}
          </h2>
          <div className="space-y-2">
            {items.map((e) => (
              <div key={e.id} className="rounded-lg border border-line bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={tone}>{e.id}</Badge>
                  <span className="font-medium text-gray-900">{e.name}</span>
                  {e.extra && <Badge tone="sky">{e.extra}</Badge>}
                  <button
                    type="button"
                    onClick={() => setOpen(open === e.id ? null : e.id)}
                    className="ml-auto text-sm text-pine-600 hover:underline"
                    aria-expanded={open === e.id}
                  >
                    {(() => {
                      const linked = linkedFor(e)
                      return scopeSet
                        ? `${linked.filter((c) => scopeSet.has(c.id)).length} of ${linked.length} in scope`
                        : `${linked.length} control${linked.length === 1 ? '' : 's'}`
                    })()}
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-600">{e.description}</p>
                {e.materiality && (
                  <p className="mt-2 text-xs text-gray-400">
                    <span className="font-medium">Materiality:</span> {e.materiality}
                  </p>
                )}
                {open === e.id && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line/60 pt-3">
                    {linkedFor(e).map((c) => (
                      <Link
                        key={c.id}
                        to={`/controls/${c.id}`}
                        className="rounded bg-pine-50 px-1.5 py-0.5 font-mono text-xs font-medium text-pine-700 hover:bg-pine-100"
                        title={c.name}
                      >
                        {c.id}
                      </Link>
                    ))}
                    {linkedFor(e).length === 0 && (
                      <span className="text-xs text-gray-400">
                        No controls in this workbook link here.
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
