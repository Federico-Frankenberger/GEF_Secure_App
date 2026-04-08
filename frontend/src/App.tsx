import { Routes, Route, Navigate } from 'react-router-dom'
import Layout    from './components/Layout'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Kanban    from './pages/Kanban'
import Settings  from './pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index              element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"   element={<Dashboard />} />
        <Route path="inventory"   element={<Inventory />} />
        <Route path="kanban"      element={<Kanban />} />
        <Route path="settings"    element={<Settings />} />
      </Route>
    </Routes>
  )
}
