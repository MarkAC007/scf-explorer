export default function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="font-display text-2xl font-bold tabular-nums text-ink-900">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="mt-0.5 eyebrow">
        {label}
      </div>
    </div>
  )
}
