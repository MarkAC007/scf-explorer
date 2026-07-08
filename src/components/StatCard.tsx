export default function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-2xl font-bold tabular-nums text-gray-900">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="mt-0.5 text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </div>
    </div>
  )
}
