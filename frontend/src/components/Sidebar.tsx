import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Package, KanbanSquare,
  Settings, ShieldCheck, Activity, ScanLine,
} from 'lucide-react'

const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/scans',      icon: ScanLine,        label: 'Escaneos'   },
  { to: '/inventory',  icon: Package,          label: 'Inventario' },
  { to: '/kanban',     icon: KanbanSquare,      label: 'Auditoría'  },
  { to: '/settings',   icon: Settings,          label: 'Config'     },
]

export default function Sidebar() {
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
        {links.map(({ to, icon: Icon, label }) => (
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
      <div className="p-4 border-t border-surface-600">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Activity size={11} className="text-emerald-500 animate-pulse" />
          Sistema activo
        </div>
      </div>
    </aside>
  )
}
