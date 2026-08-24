import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import Layout      from './components/Layout'
import RequireAuth  from './components/RequireAuth'
import Landing   from './pages/Landing'
import Login      from './pages/Login'

// Code-splitting (auditoría docs/bitacora/24-08-26/AUDITORIA_END_TO_END.md): estas 6
// páginas solo se cargan tras login -- diferirlas evita que compartan el mismo bundle
// inicial de 938KB con Landing/Login, que sí deben quedar disponibles de entrada.
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Scans     = lazy(() => import('./pages/Scans'))
const Assets     = lazy(() => import('./pages/Assets'))
const Kanban     = lazy(() => import('./pages/Kanban'))
const Informes   = lazy(() => import('./pages/Informes'))
const Settings   = lazy(() => import('./pages/Settings'))

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-900">
      <Loader2 size={28} className="animate-spin text-slate-500" />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="login" element={<Login />} />

      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="dashboard"   element={<Suspense fallback={<RouteFallback />}><Dashboard /></Suspense>} />
          <Route path="scans"       element={<Suspense fallback={<RouteFallback />}><Scans /></Suspense>} />
          <Route path="inventory"   element={<Navigate to="/assets" replace />} />
          <Route path="assets"      element={<Suspense fallback={<RouteFallback />}><Assets /></Suspense>} />
          <Route path="kanban"      element={<Suspense fallback={<RouteFallback />}><Kanban /></Suspense>} />
          <Route path="informes"    element={<Suspense fallback={<RouteFallback />}><Informes /></Suspense>} />
          <Route path="settings"    element={<Suspense fallback={<RouteFallback />}><Settings /></Suspense>} />
        </Route>
      </Route>
    </Routes>
  )
}
