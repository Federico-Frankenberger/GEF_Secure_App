import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, KanbanSquare,
  Settings, Activity, ScanLine, Server, LogOut, FileText,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import logoIcon from '../assets/logos/logo-icon.png'

const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/scans',      icon: ScanLine,        label: 'Escaneos'   },
  { to: '/assets',     icon: Server,           label: 'Activos'    },
  { to: '/kanban',     icon: KanbanSquare,      label: 'Vulnerabilidades'  },
  // FE-13 (docs/20-08-26/AUDITORIA_END_TO_END.md): "Informes" incluye el resumen
  // ejecutivo y la exportación de cualquier escaneo del historial -- antes era visible
  // para todos los roles, incluido ASSET_OWNER/AUDITOR, sin ninguna restricción acá.
  { to: '/informes',   icon: FileText,          label: 'Informes', roles: ['ADMIN', 'SECURITY_ANALYST', 'AUDITOR'] },
  // P-11 (auditoría UX/UI): Settings.tsx ya tenía una vista de solo-lectura de
  // Entornos para SECURITY_ANALYST/AUDITOR (`canViewEnvironments`), pero era
  // inalcanzable porque este link solo era visible para ADMIN -- quedaba
  // "vestigial", código sin forma de llegar a él desde la navegación.
  { to: '/settings',   icon: Settings,          label: 'Config', roles: ['ADMIN', 'SECURITY_ANALYST', 'AUDITOR'] },
]

interface Props {
  /** P-02/responsive (auditoría UX/UI): en mobile el sidebar era `fixed` con
   *  `main` corrido `ml-56` sin ningún breakpoint -- el contenido quedaba
   *  comprimido en una franja angosta con texto cortado, aunque la grilla del
   *  Kanban ya se apilara correctamente. Ahora es un drawer fuera de pantalla
   *  por defecto en mobile, controlado por Layout.tsx. */
  open?: boolean
  onClose?: () => void
}

export default function Sidebar({ open = false, onClose }: Props) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const visibleLinks = links.filter(l => !l.roles || (user?.role != null && l.roles.includes(user.role)))

  return (
    <>
      {/* Backdrop -- solo mobile, solo cuando el drawer esta abierto */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 w-56 bg-surface-800 border-r border-surface-600 flex flex-col z-30
          transition-transform duration-200 ease-out
          ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-surface-600">
          <img src={logoIcon} alt="" className="w-8 h-8 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold tracking-wide text-white">GEF Secure</p>
            <p className="text-[10px] text-slate-500 font-mono">v2.0.0</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 mt-1">
          {visibleLinks.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
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
    </>
  )
}
