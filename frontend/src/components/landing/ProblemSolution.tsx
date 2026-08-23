import { Boxes, FileWarning, Search, ListTree, Bell, Layers } from 'lucide-react'
import Reveal from './Reveal'

const PROBLEMS = [
  { icon: Boxes, text: 'Múltiples activos y versiones de software difíciles de mantener bajo control.' },
  { icon: FileWarning, text: 'Vulnerabilidades nuevas publicadas constantemente en distintas fuentes.' },
  { icon: ListTree, text: 'Seguimiento manual en planillas, sin trazabilidad de qué se decidió y por qué.' },
  { icon: Search, text: 'Difícil saber con certeza qué vulnerabilidad afecta a qué activo puntual.' },
  { icon: Layers, text: 'Todo se ve igual de urgente sin un criterio real de priorización.' },
  { icon: Bell, text: 'Información dispersa entre distintas fuentes de vulnerabilidades.' },
]

const FLOW = ['Activos', 'Software', 'Detección', 'Priorización', 'Alertas', 'Seguimiento', 'Remediación']

export default function ProblemSolution() {
  return (
    <section className="max-w-5xl mx-auto px-4 md:px-6 py-16 md:py-24">
      <Reveal>
        <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-2 text-center">El problema</p>
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-10 text-balance">
          Controlar vulnerabilidades a mano no escala
        </h2>
      </Reveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
        {PROBLEMS.map((p, i) => (
          <Reveal key={p.text} delay={i * 60}>
            <div className="card h-full flex items-start gap-3">
              <p.icon size={18} className="text-slate-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-300">{p.text}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-2 text-center">La solución</p>
        <h3 className="text-xl md:text-2xl font-bold text-white text-center mb-8 text-balance">
          Un único flujo, de punta a punta
        </h3>
      </Reveal>

      <Reveal>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {FLOW.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <span className="badge bg-surface-700 text-slate-200 border border-surface-600 !px-3 !py-1.5 text-xs">
                {step}
              </span>
              {i < FLOW.length - 1 && <span className="text-slate-600">→</span>}
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  )
}
