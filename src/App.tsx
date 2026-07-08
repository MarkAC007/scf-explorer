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
  const location = useLocation()

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
    <div className="flex min-h-screen">
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
  )
}

const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <DashboardView /> },
      { path: '/upload', element: <UploadView /> },
      { path: '/controls', element: <ControlsView /> },
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
