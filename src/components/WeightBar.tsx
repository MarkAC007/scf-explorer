/** Relative control weighting, 1–10. */
export default function WeightBar({ value }: { value: number | null }) {
  if (value == null) return <span className="text-xs text-gray-400">—</span>
  const tone = value >= 8 ? 'bg-rust-600' : value >= 5 ? 'bg-amber-500' : 'bg-sky-500'
  return (
    <span className="inline-flex items-center gap-1.5" title={`Relative control weighting: ${value}/10`}>
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-gray-200">
        <span className={`block h-full ${tone}`} style={{ width: `${value * 10}%` }} />
      </span>
      <span className="text-xs tabular-nums text-gray-500">{value}</span>
    </span>
  )
}
