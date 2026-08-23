import logoIcon from '../../assets/logos/logo-icon.png'

const scrollTo = (href: string) => document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })

export default function Footer() {
  return (
    <footer className="border-t border-surface-600 bg-surface-900">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <img src={logoIcon} alt="" className="w-6 h-6" />
            <span className="text-sm font-semibold text-white">GEF Secure</span>
          </div>
          <p className="text-xs text-slate-500">Gestión continua de vulnerabilidades y exposición tecnológica.</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Producto</p>
          <ul className="space-y-2">
            <li><button onClick={() => scrollTo('#funcionalidades')} className="text-sm text-slate-500 hover:text-white transition-colors">Funcionalidades</button></li>
            <li><button onClick={() => scrollTo('#como-funciona')} className="text-sm text-slate-500 hover:text-white transition-colors">Cómo funciona</button></li>
            <li><button onClick={() => scrollTo('#seguridad')} className="text-sm text-slate-500 hover:text-white transition-colors">Seguridad</button></li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Recursos</p>
          <ul className="space-y-2">
            <li><button onClick={() => scrollTo('#faq')} className="text-sm text-slate-500 hover:text-white transition-colors">FAQ</button></li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Empresa</p>
          <ul className="space-y-2">
            <li><button onClick={() => scrollTo('#contacto')} className="text-sm text-slate-500 hover:text-white transition-colors">Contacto</button></li>
          </ul>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-5 mb-3">Legal</p>
          <ul className="space-y-2">
            {/* Sección 17 del prompt: sin páginas legales reales todavía -- se deja
                el rótulo preparado en vez de simular contenido jurídico inexistente. */}
            <li className="text-sm text-slate-600">Privacidad <span className="text-[10px]">(próximamente)</span></li>
            <li className="text-sm text-slate-600">Términos <span className="text-[10px]">(próximamente)</span></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-surface-600 py-4 text-center">
        <p className="text-[11px] text-slate-600">© {new Date().getFullYear()} GEF Secure. Todos los derechos reservados.</p>
      </div>
    </footer>
  )
}
