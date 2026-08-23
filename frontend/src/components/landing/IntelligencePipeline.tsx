import { ShieldCheck, Github, ArrowRight } from 'lucide-react'
import Reveal from './Reveal'

const FLOW = [
  'Nueva vulnerabilidad publicada',
  'GEF Secure la detecta',
  'Correlaciona con tu software registrado',
  'Identifica los activos afectados',
  'Genera una alerta',
  'Tu equipo actúa',
]

export default function IntelligencePipeline() {
  return (
    <section className="bg-surface-800/40 border-y border-surface-600">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <Reveal>
            <div>
              <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-2">Fuentes de inteligencia</p>
              <h2 className="text-2xl font-bold text-white mb-4 text-balance">
                Información de fuentes públicas reconocidas
              </h2>
              <p className="text-sm text-slate-400 mb-6">
                GEF Secure no inventa datos de vulnerabilidades: consume información pública
                publicada por organismos y catálogos reconocidos del ecosistema de seguridad.
              </p>
              <div className="space-y-3">
                <div className="card flex items-center gap-3">
                  <ShieldCheck size={18} className="text-severity-critical flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-white">CISA KEV</p>
                    <p className="text-xs text-slate-500">Catálogo de vulnerabilidades con explotación conocida en el mundo real.</p>
                  </div>
                </div>
                <div className="card flex items-center gap-3">
                  <Github size={18} className="text-slate-300 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-white">GitHub Security Advisories</p>
                    <p className="text-xs text-slate-500">Advisories de seguridad por paquete y ecosistema.</p>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 mt-4">
                GEF Secure utiliza información pública de estas fuentes — no implica afiliación,
                certificación ni acuerdo comercial con ellas.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div>
              <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-2">Alertas y monitoreo</p>
              <h3 className="text-xl font-bold text-white mb-4 text-balance">
                De la publicación a la acción de tu equipo
              </h3>
              <div className="card space-y-0">
                {FLOW.map((step, i) => (
                  <div key={step} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0 border-b border-surface-600 last:border-0">
                    <span className="w-6 h-6 rounded-full bg-brand-600/10 border border-brand-600/30 text-brand-400 text-[11px] font-mono flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-sm text-slate-300">{step}</p>
                    {i < FLOW.length - 1 && <ArrowRight size={12} className="text-slate-600 ml-auto flex-shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
