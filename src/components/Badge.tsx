const TONES: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-700',
  sky: 'bg-sky-100 text-sky-700',
}

export default function Badge({
  children,
  tone = 'gray',
  title,
}: {
  children: React.ReactNode
  tone?: keyof typeof TONES
  title?: string
}) {
  return (
    <span
      title={title}
      className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}
