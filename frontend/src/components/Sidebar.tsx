import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, KanbanSquare,
  Settings, ShieldCheck, Activity, ScanLine, Server, LogOut, FileText,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/scans',      icon: ScanLine,        label: 'Escaneos'   },
  { to: '/assets',     icon: Server,           label: 'Activos'    },
  { to: '/kanban',     icon: KanbanSquare,      label: 'Auditoría'  },
  { to: '/informes',   icon: FileText,          label: 'Informes'   },
  { to: '/settings',   icon: Settings,          label: 'Config', adminOnly: true },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const visibleLinks = links.filter(l => !l.adminOnly || user?.role === 'ADMIN')

  return (
    <aside className="fixed inset-y-0 left-0 w-56 bg-surface-800 border-r border-surface-600 flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-surface-600">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shadow-lg flex-shrink-0">
          <ShieldCheck size={17} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-wide text-white">GEF Secure</p>
          <p className="text-[10px] text-slate-500 font-mono">UTN Tesis v1.0</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 mt-1">
        {visibleLinks.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
               ${isActive
                 ? 'bg-brand-600/20 text-brand-400 border border-brand-600/30'
                 : 'text-slate-400 hover:text-white hover:bg-surface-700'}`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-surface-600 space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Activity size={11} className="text-emerald-500 animate-pulse" />
          Sistema activo
        </div>
        {user && (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{user.fullName || user.username}</p>
              <p className="text-[10px] text-slate-500">{user.role}</p>
            </div>
            <button onClick={handleLogout} className="btn-ghost !p-1.5" title="Cerrar sesión">
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
