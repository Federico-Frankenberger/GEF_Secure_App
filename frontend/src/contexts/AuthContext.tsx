import { createContext, useContext, useState, ReactNode } from 'react'
import { authApi, TOKEN_KEY } from '../services/api'
import type { AuthUser } from '../types'

const USER_KEY = 'gef_user'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser)

  const login = async (username: string, password: string) => {
    const { data } = await authApi.login(username, password)
    const authUser: AuthUser = { username: data.username, fullName: data.fullName, role: data.role }
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(authUser))
    setUser(authUser)
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }

  // FE-05 (docs/20-08-26/AUDITORIA_END_TO_END.md): antes isAuthenticated dependía de
  // `user` (localStorage `gef_user`), no del token real. Si por lo que sea quedaba
  // `gef_user` en localStorage sin `gef_token` (ej. el interceptor 401 corta a mitad de
  // camino entre los dos `removeItem`), la UI seguía mostrando al usuario como logueado
  // aunque cada request al backend fuera a devolver 401.
  const isAuthenticated = !!user && !!localStorage.getItem(TOKEN_KEY)

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
