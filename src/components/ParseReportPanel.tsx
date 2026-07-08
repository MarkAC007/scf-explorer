import type { ParseReport } from '../model/types'

export default function ParseReportPanel({ report }: { report: ParseReport }) {
  const ok = report.warnings.length === 0 && report.unmappedColumns.length === 0
  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4 text-left text-sm">
      <h3 className="font-semibold text-gray-800">
        Parse report — SCF {report.version} {ok && <span className="text-green-600">✓ clean</span>}
      </h3>
      <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-gray-600 sm:grid-cols-3">
        {report.sheets.map((s) => (
          <li key={s.name}>
            <span className="text-gray-400">{s.name}:</span> {s.rows.toLocaleString()} rows
          </li>
        ))}
      </ul>
      {report.warnings.length > 0 && (
        <div className="mt-3">
          <h4 className="font-medium text-amber-700">Warnings</h4>
          <ul className="list-inside list-disc text-amber-700">
            {report.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      {report.unmappedColumns.length > 0 && (
        <div className="mt-3">
          <h4 className="font-medium text-amber-700">Unmapped columns</h4>
          <ul className="list-inside list-disc text-amber-700">
            {report.unmappedColumns.map((c) => (
              <li key={`${c.sheet}:${c.header}`}>
                {c.sheet}: {c.header}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
