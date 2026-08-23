import { Server, PackageSearch, Target, ListChecks } from 'lucide-react'
import Reveal from './Reveal'

const STEPS = [
  {
    icon: Server,
    title: 'Registrá tus activos y su software',
    text: 'Centralizá servidores, aplicaciones y el software instalado en cada uno dentro de una única plataforma.',
  },
  {
    icon: PackageSearch,
    title: 'Detectá vulnerabilidades automáticamente',
    text: 'Un escaneo automático corre todos los días y correlaciona tu inventario contra CVE, GitHub Advisories y el catálogo CISA KEV. También podés escanear bajo demanda cuando lo necesites.',
  },
  {
    icon: Target,
    title: 'Priorizá con criterio, no a ojo',
    text: 'Cada vulnerabilidad recibe una prioridad explicada: severidad, explotación conocida, presencia en CISA KEV y criticidad del activo afectado — nunca solo un número de CVSS.',
  },
  {
    icon: ListChecks,
    title: 'Gestioná la remediación',
    text: 'Un tablero de trabajo con plazos automáticos por severidad y trazabilidad completa de cada cambio de estado, desde la detección hasta el cierre.',
  },
]

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="bg-surface-800/40 border-y border-surface-600">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-16 md:py-24">
        <Reveal>
          <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-2 text-center">Cómo funciona</p>
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12 text-balance">
            De activo desconocido a riesgo gestionado
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={i * 90}>
              <div className="card h-full flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-brand-600/10 border border-brand-600/30 flex items-center justify-center flex-shrink-0">
                  <step.icon size={18} className="text-brand-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white mb-1">
                    <span className="text-brand-500 font-mono mr-1.5">{String(i + 1).padStart(2, '0')}</span>
                    {step.title}
                  </p>
                  <p className="text-sm text-slate-400">{step.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
