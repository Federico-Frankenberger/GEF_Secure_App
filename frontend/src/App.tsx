import { Routes, Route, Navigate } from 'react-router-dom'
import Layout      from './components/Layout'
import RequireAuth  from './components/RequireAuth'
import Login      from './pages/Login'
import Dashboard from './pages/Dashboard'
import Scans     from './pages/Scans'
import Assets    from './pages/Assets'
import Kanban    from './pages/Kanban'
import Settings  from './pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />

      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route index              element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"   element={<Dashboard />} />
          <Route path="scans"       element={<Scans />} />
          <Route path="inventory"   element={<Navigate to="/assets" replace />} />
          <Route path="assets"      element={<Assets />} />
          <Route path="kanban"      element={<Kanban />} />
          <Route path="settings"    element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  )
}
