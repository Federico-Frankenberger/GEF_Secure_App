import { Layers, Eye, Target, Zap, History, Gauge } from 'lucide-react'
import Reveal from './Reveal'

const BENEFITS = [
  { icon: Layers, title: 'Centralización', text: 'Una única plataforma para consultar el estado de seguridad de tus activos.' },
  { icon: Eye, title: 'Visibilidad', text: 'Entendé qué activos pueden estar expuestos y por qué.' },
  { icon: Target, title: 'Priorización', text: 'Concentrá el esfuerzo del equipo en lo que realmente importa primero.' },
  { icon: Zap, title: 'Automatización', text: 'Menos controles manuales: el escaneo diario y la correlación corren solos.' },
  { icon: History, title: 'Trazabilidad', text: 'Historial de cada análisis, decisión y cierre, disponible cuando lo necesites.' },
  { icon: Gauge, title: 'Respuesta más rápida', text: 'Enterate de lo relevante apenas está disponible, no semanas después.' },
]

const USE_CASES = [
  { title: 'Equipos de IT', text: 'Controlar las vulnerabilidades relacionadas con el software que usa la organización.' },
  { title: 'Equipos de seguridad', text: 'Centralizar y priorizar la información de vulnerabilidades de toda la infraestructura.' },
  { title: 'Infraestructura y DevOps', text: 'Tener visibilidad real sobre qué tecnologías están desplegadas y cómo afectan al riesgo.' },
]

export default function BenefitsUseCases() {
  return (
    <section className="bg-surface-800/40 border-y border-surface-600">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-16 md:py-24">
        <Reveal>
          <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-2 text-center">Beneficios</p>
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12 text-balance">
            Pensado para resultados, no solo funciones
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
          {BENEFITS.map((b, i) => (
            <Reveal key={b.title} delay={(i % 3) * 70}>
              <div className="card h-full">
                <b.icon size={18} className="text-brand-400 mb-2" />
                <p className="text-sm font-semibold text-white mb-1">{b.title}</p>
                <p className="text-sm text-slate-400">{b.text}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-2 text-center">Casos de uso</p>
          <h3 className="text-xl md:text-2xl font-bold text-white text-center mb-8 text-balance">
            Quién lo usa día a día
          </h3>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {USE_CASES.map((u, i) => (
            <Reveal key={u.title} delay={i * 90}>
              <div className="card h-full border-l-2 border-l-brand-600">
                <p className="text-sm font-semibold text-white mb-1">{u.title}</p>
                <p className="text-sm text-slate-400">{u.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
