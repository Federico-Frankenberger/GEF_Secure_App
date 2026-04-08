import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-surface-900">
      <Sidebar />
      <main className="flex-1 ml-56 p-7 overflow-y-auto animate-fade-in">
        <Outlet />
      </main>
    </div>
  )
}
