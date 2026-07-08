import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useModel, modelStore } from '../store/modelStore'
import ParseReportPanel from '../components/ParseReportPanel'

export default function UploadView() {
  const status = useModel((s) => s.status)
  const progress = useModel((s) => s.progress)
  const error = useModel((s) => s.error)
  const model = useModel((s) => s.model)
  const [dragOver, setDragOver] = useState(false)
  const navigate = useNavigate()

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return
      if (!/\.xlsx$/i.test(file.name)) {
        modelStore.setState({
          status: 'error',
          error: `"${file.name}" is not an .xlsx file. Upload the official SCF Excel workbook.`,
        })
        return
      }
      await modelStore.getState().parseFile(file)
      if (modelStore.getState().status === 'ready') navigate('/')
    },
    [navigate],
  )

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center p-8 text-center">
      <h1 className="text-3xl font-bold tracking-tight">
        SCF <span className="text-pine-600">Explorer</span>
      </h1>
      <p className="mt-2 text-gray-600">
        A read-only, feature-rich viewer for the{' '}
        <a
          className="text-pine-600 hover:underline"
          href="https://securecontrolsframework.com"
          target="_blank"
          rel="noreferrer"
        >
          Secure Controls Framework
        </a>{' '}
        — browse 1,400+ controls, ~250 framework mappings, maturity criteria, risks and
        threats. Everything stays in your browser; nothing is uploaded anywhere.
      </p>

      {status === 'parsing' ? (
        <div className="mt-8 w-full">
          <div className="h-2 w-full overflow-hidden rounded bg-gray-200">
            <div
              className="h-full bg-pine-600 transition-all"
              style={{ width: `${progress?.pct ?? 0}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">{progress?.stage ?? 'Parsing…'}</p>
        </div>
      ) : (
        <label
          className={`mt-8 block w-full cursor-pointer rounded-xl border-2 border-dashed p-10 transition ${
            dragOver ? 'border-pine-500 bg-pine-50' : 'border-gray-300 bg-white hover:border-pine-500'
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            void handleFile(e.dataTransfer.files[0])
          }}
        >
          <input
            type="file"
            accept=".xlsx"
            className="sr-only"
            data-testid="file-input"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <span className="text-lg font-medium text-gray-700">
            Drop the SCF workbook here
          </span>
          <span className="mt-1 block text-sm text-gray-500">or click to choose the .xlsx</span>
        </label>
      )}

      {error && (
        <div className="mt-4 w-full rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <p className="mt-6 text-sm text-gray-500">
        Get the latest workbook from the{' '}
        <a
          className="text-pine-600 hover:underline"
          href="https://github.com/securecontrolsframework/securecontrolsframework/releases"
          target="_blank"
          rel="noreferrer"
        >
          SCF GitHub releases
        </a>
        .
      </p>

      <p className="mt-2 text-xs text-gray-400">
        SCF content © SCF Council,{' '}
        <a
          className="hover:underline"
          href="https://creativecommons.org/licenses/by-nd/4.0/"
          target="_blank"
          rel="noreferrer"
        >
          CC BY-ND 4.0
        </a>{' '}
        — rendered unmodified. Not affiliated with the SCF Council.
      </p>

      {status === 'ready' && model && <ParseReportPanel report={model.parseReport} />}
    </div>
  )
}
