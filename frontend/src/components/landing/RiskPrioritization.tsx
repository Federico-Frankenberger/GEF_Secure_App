import Reveal from './Reveal'

const QUESTIONS = [
  '¿Qué vulnerabilidades tengo?',
  '¿Qué activos están afectados?',
  '¿Qué tan graves son realmente?',
  '¿Cuáles debería resolver primero?',
]

const REASONS = [
  { label: 'CVSS 9.8', tone: 'text-severity-critical' },
  { label: 'Explotación conocida', tone: 'text-severity-critical' },
  { label: 'Incluida en CISA KEV', tone: 'text-severity-high' },
  { label: 'Activo de criticidad crítica', tone: 'text-severity-high' },
  { label: 'SLA vencido', tone: 'text-severity-critical' },
]

export default function RiskPrioritization() {
  return (
    <section className="max-w-5xl mx-auto px-4 md:px-6 py-16 md:py-24">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <Reveal>
          <div>
            <p className="text-xs font-semibold text-brand-400 uppercase tracking-wider mb-2">Priorización del riesgo</p>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 text-balance">
              Detectar no alcanza. Hay que saber qué atender primero.
            </h2>
            <p className="text-sm text-slate-400 mb-5">
              El valor real no está solo en encontrar vulnerabilidades, sino en poder responder:
            </p>
            <ul className="space-y-2">
              {QUESTIONS.map(q => (
                <li key={q} className="flex items-center gap-2 text-sm text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />
                  {q}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="badge bg-severity-critical/20 text-severity-critical border border-severity-critical/40">Crítica</span>
              <span className="font-mono text-xs text-slate-500">CVE-2024-XXXXX</span>
            </div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Motivos</p>
            <div className="flex flex-wrap gap-1.5">
              {REASONS.map(r => (
                <span key={r.label} className={`text-xs font-medium ${r.tone}`}>• {r.label}</span>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-4 pt-4 border-t border-surface-600">
              Esto aporta mucho más contexto que mostrar únicamente <span className="font-mono text-slate-400">CVSS: 9.8</span>.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
