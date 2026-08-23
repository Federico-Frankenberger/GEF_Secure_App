import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import Landing from './Landing'
import { AuthProvider } from '../contexts/AuthContext'
import { TOKEN_KEY } from '../services/api'

// Landing es pública (docs/bitacora/23-08-26/prompt_landing_comercial_gef_secure.md).
// Un usuario ya logueado que entra a "/" no debe ver la landing -- se redirige a su
// dashboard, mismo criterio que cualquier SaaS. Usa AuthProvider real (no un mock de
// useAuth) para además cubrir la lógica real de `isAuthenticated` (FE-05: requiere
// user Y token en localStorage, no solo uno de los dos).

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<div>Dashboard privado</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('Landing — redirección por autenticación', () => {
  afterEach(() => localStorage.clear())

  it('muestra la landing pública si no hay sesión', () => {
    renderAt('/')
    expect(screen.getAllByText('GEF Secure').length).toBeGreaterThan(0)
    expect(screen.queryByText('Dashboard privado')).not.toBeInTheDocument()
  })

  it('redirige a /dashboard si hay usuario Y token (sesión completa)', () => {
    localStorage.setItem('gef_user', JSON.stringify({ username: 'demo', fullName: 'Demo', role: 'ADMIN' }))
    localStorage.setItem(TOKEN_KEY, 'fake-token')
    renderAt('/')
    expect(screen.getByText('Dashboard privado')).toBeInTheDocument()
  })

  it('NO redirige si solo hay usuario en localStorage sin token (regresión FE-05)', () => {
    localStorage.setItem('gef_user', JSON.stringify({ username: 'demo', fullName: 'Demo', role: 'ADMIN' }))
    renderAt('/')
    expect(screen.queryByText('Dashboard privado')).not.toBeInTheDocument()
  })
})
