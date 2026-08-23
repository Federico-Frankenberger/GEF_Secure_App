import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import logoIcon from '../assets/logos/logo-icon.png'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-surface-900">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Barra superior -- solo mobile, donde el sidebar es un drawer oculto */}
      <div className="md:hidden fixed inset-x-0 top-0 z-10 h-14 bg-surface-800 border-b border-surface-600 flex items-center gap-3 px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="btn-ghost !p-2"
          aria-label="Abrir menú de navegación"
        >
          <Menu size={20} />
        </button>
        <img src={logoIcon} alt="" className="w-5 h-5" />
        <span className="text-sm font-semibold text-white">GEF Secure</span>
      </div>

      <main className="flex-1 md:ml-56 p-4 pt-20 md:p-7 overflow-y-auto animate-fade-in">
        <Outlet />
      </main>
    </div>
  )
}
