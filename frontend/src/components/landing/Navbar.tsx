import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import logoIcon from '../../assets/logos/logo-icon.png'

const LINKS = [
  { href: '#producto', label: 'Producto' },
  { href: '#funcionalidades', label: 'Funcionalidades' },
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#seguridad', label: 'Seguridad' },
  { href: '#faq', label: 'FAQ' },
  { href: '#contacto', label: 'Contacto' },
]

export default function Navbar() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const goToAnchor = (href: string) => {
    setMobileOpen(false)
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-200
        ${scrolled ? 'bg-surface-900/90 backdrop-blur border-b border-surface-600' : 'bg-transparent'}`}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <button onClick={() => goToAnchor('#top')} className="flex items-center gap-2">
          <img src={logoIcon} alt="GEF Secure" className="w-7 h-7" />
          <span className="text-sm font-semibold text-white tracking-wide">GEF Secure</span>
        </button>

        <nav className="hidden lg:flex items-center gap-1">
          {LINKS.map(l => (
            <button key={l.href} onClick={() => goToAnchor(l.href)} className="btn-ghost !px-3 !py-1.5 text-[13px]">
              {l.label}
            </button>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          <button onClick={() => navigate('/login')} className="btn-ghost !px-3 !py-1.5 text-[13px]">
            Iniciar sesión
          </button>
          <button onClick={() => goToAnchor('#contacto')} className="btn-primary !px-4 !py-1.5 text-[13px]">
            Solicitar demo
          </button>
        </div>

        <button onClick={() => setMobileOpen(o => !o)} className="lg:hidden btn-ghost !p-2" aria-label="Abrir menú">
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-surface-900 border-b border-surface-600 px-4 pb-4 space-y-1">
          {LINKS.map(l => (
            <button key={l.href} onClick={() => goToAnchor(l.href)} className="btn-ghost w-full justify-start text-sm">
              {l.label}
            </button>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <button onClick={() => navigate('/login')} className="btn-ghost w-full justify-center text-sm border border-surface-600">
              Iniciar sesión
            </button>
            <button onClick={() => goToAnchor('#contacto')} className="btn-primary w-full justify-center text-sm">
              Solicitar demo
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
