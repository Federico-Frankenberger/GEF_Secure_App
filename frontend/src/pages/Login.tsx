import { useEffect, useState, FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Wrench, ShieldAlert, Server, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import logoIcon from '../assets/logos/logo-icon.png'

// Usuarios semilla de demo (init/02-seed-data.sql + init/07-rbac-demo-users.sql),
// todos con la misma contraseña fija de desarrollo (init/05-auth.sql). Solo tiene
// sentido en un entorno de demo/desarrollo local — nunca en un despliegue real.
//
// P-10 (auditoría UX/UI): el bloque de acceso rápido (incluido ADMIN con un solo
// clic) quedaba visible siempre, sin gate de entorno. Se oculta detrás de una env
// var de build -- si no está en 'true', el bloque no se renderiza (no queda en el
// DOM ni en el bundle de forma condicional en runtime, es una rama de JSX que
// React directamente no monta).
const DEMO_LOGIN_ENABLED = import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true'
const DEMO_PASSWORD = 'GefSecure2026!'
const DEMO_USERS: { username: string; role: string; label: string; icon: typeof Wrench }[] = [
  { username: 'fede.frankenberger', role: 'ADMIN',             label: 'Administrador',        icon: Wrench },
  { username: 'analyst.demo',       role: 'SECURITY_ANALYST',  label: 'Analista de Seguridad', icon: ShieldAlert },
  { username: 'owner.demo',         role: 'ASSET_OWNER',       label: 'Responsable de Activo', icon: Server },
  { username: 'auditor.demo',       role: 'AUDITOR',           label: 'Auditor',               icon: Eye },
]

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [quickLoading, setQuickLoading] = useState<string | null>(null)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const goAfterLogin = () => {
    const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'
    navigate(from, { replace: true })
  }

  // FE-02 (docs/20-08-26/AUDITORIA_END_TO_END.md): bandera de un solo uso seteada por
  // el interceptor de api.ts cuando un 401 expulsa al usuario en medio de una acción --
  // antes no había ningún aviso, era indistinguible de haber navegado a /login solo.
  useEffect(() => {
    if (sessionStorage.getItem('gef_session_expired')) {
      sessionStorage.removeItem('gef_session_expired')
      toast.error('Tu sesión expiró. Iniciá sesión nuevamente.')
    }
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(username, password)
      goAfterLogin()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickLogin = async (demoUsername: string) => {
    setQuickLoading(demoUsername)
    try {
      await login(demoUsername, DEMO_PASSWORD)
      goAfterLogin()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setQuickLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-6">
          <img src={logoIcon} alt="" className="w-14 h-14" />
          <p className="text-lg font-semibold text-white">GEF Secure</p>
          <p className="text-xs text-slate-500">Iniciar sesión para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Usuario</label>
            <input
              className="input"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="ej: fede.frankenberger"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Contraseña</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button type="submit" disabled={loading || !username || !password} className="btn-primary w-full justify-center">
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        {DEMO_LOGIN_ENABLED && (
          <>
            <div className="mt-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-surface-600" />
              <p className="text-[11px] text-slate-500 uppercase tracking-wider">Acceso rápido (demo)</p>
              <div className="h-px flex-1 bg-surface-600" />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {DEMO_USERS.map(({ username: u, role, label, icon: Icon }) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => handleQuickLogin(u)}
                  disabled={quickLoading !== null || loading}
                  className="card !p-3 flex flex-col items-center gap-1.5 text-center hover:border-brand-600/50 hover:bg-surface-700 transition-colors disabled:opacity-50"
                >
                  <Icon size={16} className="text-brand-400" />
                  <span className="text-xs font-medium text-white">{quickLoading === u ? 'Ingresando…' : label}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{role}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-center text-[10px] text-slate-600">
              Entorno de demostración — todos los usuarios usan la misma contraseña de desarrollo.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
