import { useState, type ReactNode } from 'react'

export interface TabDef {
  id: string
  label: string
  count?: number
  content: ReactNode
}

export default function Tabs({ tabs }: { tabs: TabDef[] }) {
  const [active, setActive] = useState(tabs[0]?.id)
  const current = tabs.find((t) => t.id === active) ?? tabs[0]

  return (
    <div>
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={t.id === current.id}
            onClick={() => setActive(t.id)}
            className={`rounded-t px-3 py-2 text-sm font-medium ${
              t.id === current.id
                ? 'border-b-2 border-pine-600 text-pine-700'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
            {t.count != null && (
              <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 text-xs tabular-nums text-gray-600">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="pt-4">
        {current.content}
      </div>
    </div>
  )
}
