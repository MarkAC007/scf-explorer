import { useEffect } from 'react'
import {
  createHashRouter,
  NavLink,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
} from 'react-router-dom'
import { useModel, modelStore } from './store/modelStore'
import { useScope, scopeStore } from './scope/scopeStore'
import ProgramView from './views/ProgramView'
import UploadView from './views/UploadView'
import DashboardView from './views/DashboardView'
import ControlsView from './views/ControlsView'
import ControlDetailView from './views/ControlDetailView'
import CrosswalkView from './views/CrosswalkView'
import RisksView from './views/RisksView'
import ThreatsView from './views/ThreatsView'
import BaselinesView from './views/BaselinesView'
import SourcesView from './views/SourcesView'
import PrivacyView from './views/PrivacyView'

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/controls', label: 'Controls' },
  { to: '/program', label: 'Program' },
  { to: '/crosswalk', label: 'Crosswalk' },
  { to: '/risks', label: 'Risks' },
  { to: '/threats', label: 'Threats' },
  { to: '/baselines', label: 'Baselines' },
  { to: '/sources', label: 'Sources' },
  { to: '/privacy', label: 'Privacy' },
]

function Layout() {
  const status = useModel((s) => s.status)
  const model = useModel((s) => s.model)
  const indexes = useModel((s) => s.indexes)
  const activeScope = useScope((s) => s.activeScope)
  const activeControlIds = useScope((s) => s.activeControlIds)
  const location = useLocation()

  useEffect(() => {
    if (status === 'ready' && model && indexes) {
      void scopeStore.getState().init(model, indexes)
    }
  }, [status, model, indexes])

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        Loading cached workbook…
      </div>
    )
  }
  if (status !== 'ready' && location.pathname !== '/upload') {
    return <Navigate to="/upload" replace />
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1">
      {status === 'ready' && (
        <aside className="flex w-52 shrink-0 flex-col bg-ink-900 text-gray-400">
          <NavLink
            to="/"
            className="px-4 py-5 font-display text-lg font-bold tracking-tight text-white"
          >
            SCF <span className="text-pine-300">Explorer</span>
          </NavLink>
          <nav className="flex-1 space-y-0.5 px-2" aria-label="Main">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `block border-l-2 px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'border-pine-500 bg-ink-800 font-medium text-white'
                      : 'border-transparent hover:bg-ink-800/60 hover:text-gray-200'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          {activeScope && (
            <div className="mx-2 mb-2 rounded-lg bg-ink-800 p-2.5 text-xs" data-testid="scope-chip">
              <div className="flex items-center gap-1.5">
                <span className="text-pine-300">◉</span>
                <NavLink
                  to="/program"
                  className="min-w-0 flex-1 truncate font-medium text-white hover:underline"
                  title={activeScope.name}
                >
                  {activeScope.name}
                </NavLink>
                <button
                  type="button"
                  aria-label="Deactivate scope"
                  className="text-gray-500 hover:text-white"
                  onClick={() => void scopeStore.getState().setActive(null)}
                >
                  ✕
                </button>
              </div>
              <div className="mt-0.5 text-gray-400">
                {activeControlIds?.size.toLocaleString()} controls in scope
              </div>
            </div>
          )}
          <div className="border-t border-ink-700 p-3 text-xs">
            <div className="font-mono font-semibold text-pine-300">SCF {model?.version}</div>
            <div className="truncate text-gray-500" title={model?.sourceFileName}>
              {model?.sourceFileName}
            </div>
            <NavLink to="/upload" className="mt-1 block text-gray-300 hover:text-white hover:underline">
              Replace workbook
            </NavLink>
          </div>
        </aside>
      )}
        <main className="min-w-0 flex-1 bg-paper">
          <Outlet />
        </main>
      </div>
      <footer className="flex h-7 shrink-0 items-center justify-center gap-1.5 border-t border-line bg-paper text-xs text-gray-500">
        Developed by Mark Almeida-Cardy
        <span aria-hidden="true">·</span>
        <a
          href="https://github.com/MarkAC007"
          target="_blank"
          rel="noreferrer"
          className="text-pine-600 hover:underline"
        >
          GitHub
        </a>
      </footer>
    </div>
  )
}

const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <DashboardView /> },
      { path: '/upload', element: <UploadView /> },
      { path: '/controls', element: <ControlsView /> },
      { path: '/program', element: <ProgramView /> },
      { path: '/controls/:id', element: <ControlDetailView /> },
      { path: '/crosswalk', element: <CrosswalkView /> },
      { path: '/risks', element: <RisksView /> },
      { path: '/threats', element: <ThreatsView /> },
      { path: '/baselines', element: <BaselinesView /> },
      { path: '/sources', element: <SourcesView /> },
      { path: '/privacy', element: <PrivacyView /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function App() {
  useEffect(() => {
    void modelStore.getState().initFromCache()
  }, [])
  return <RouterProvider router={router} />
}
