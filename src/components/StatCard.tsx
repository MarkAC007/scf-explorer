export default function StatCard({
  label,
  value,
  ghost,
}: {
  label: string
  value: number | string
  ghost?: number
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="font-display text-2xl font-bold tabular-nums text-ink-900">
        {typeof value === 'number' ? value.toLocaleString() : value}
        {ghost != null && (
          <span className="ml-1 text-sm font-normal text-gray-400">
            / {ghost.toLocaleString()}
          </span>
        )}
      </div>
      <div className="mt-0.5 eyebrow">
        {label}
      </div>
    </div>
  )
}
