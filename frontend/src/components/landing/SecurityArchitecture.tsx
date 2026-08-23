import { KeyRound, Users, ShieldCheck, GitCommit } from 'lucide-react'
import Reveal from './Reveal'

const SECURITY_POINTS = [
  { icon: KeyRound, title: 'Autenticación con JWT', text: 'Sesiones sin estado, sin credenciales guardadas en el cliente más allá del token.' },
  { icon: Users, title: '4 roles diferenciados', text: 'Administrador, analista de seguridad, responsable de activo y auditor — cada uno ve y puede hacer solo lo que le corresponde.' },
  { icon: ShieldCheck, title: 'Rutas protegidas', text: 'El acceso a la aplicación requiere sesión válida; cada acción respeta el permiso del rol.' },
  { icon: GitCommit, title: 'Auditoría de cada cambio', text: 'Toda transición de estado de una vulnerabilidad queda registrada: quién, cuándo y con qué respaldo.' },
]

const ARCH = ['Infraestructura', 'Activos', 'Software detectado', 'GEF Secure']
const ARCH_OUTPUTS = ['Vulnerabilidades', 'Priorización', 'Alertas', 'Seguimiento']

export default function SecurityArchitecture() {
  return (
    <section id="seguridad" className="max-w-5xl mx-auto px-4 md:px-6 py-16 md:py-24">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <Reveal>
          <div>
            <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-2">Seguridad</p>
            <h2 className="text-2xl font-bold text-white mb-6 text-balance">
              Construido con seguridad desde la base
            </h2>
            <div className="space-y-4">
              {SECURITY_POINTS.map(p => (
                <div key={p.title} className="flex gap-3">
                  <p.icon size={18} className="text-brand-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-white">{p.title}</p>
                    <p className="text-sm text-slate-400">{p.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div>
            <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-2">Arquitectura conceptual</p>
            <h3 className="text-xl font-bold text-white mb-6 text-balance">
              De la infraestructura al riesgo gestionado
            </h3>
            <div className="card">
              <div className="flex flex-col items-center gap-1">
                {ARCH.map((step, i) => (
                  <div key={step} className="flex flex-col items-center">
                    <span className={`px-4 py-2 rounded-lg text-sm font-medium
                      ${i === ARCH.length - 1 ? 'bg-brand-600 text-white' : 'bg-surface-700 text-slate-300 border border-surface-600'}`}>
                      {step}
                    </span>
                    {i < ARCH.length - 1 && <span className="text-slate-600 my-1">↓</span>}
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-surface-600 grid grid-cols-2 gap-2">
                {ARCH_OUTPUTS.map(o => (
                  <span key={o} className="text-center text-xs text-slate-400 bg-surface-900/60 rounded-lg py-2 border border-surface-600">
                    {o}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
