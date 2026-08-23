import { ShieldAlert, Flame, Bug, Server } from 'lucide-react'
import StatCard from '../StatCard'
import Reveal from './Reveal'

const SEVERITY_BARS = [
  { label: 'Crítica', value: 12, pct: 100, color: 'bg-severity-critical' },
  { label: 'Alta',    value: 28, pct: 75,  color: 'bg-severity-high' },
  { label: 'Media',   value: 54, pct: 45,  color: 'bg-severity-medium' },
  { label: 'Baja',    value: 19, pct: 20,  color: 'bg-severity-low' },
]

/** Vista previa del producto real (sección 3 del prompt de landing): reutiliza el
 *  mismo StatCard del Dashboard autenticado, con datos ilustrativos fijos -- no es
 *  un iframe ni datos de un cliente real, se aclara explícitamente en el rótulo. */
export default function ProductPreview() {
  return (
    <section id="producto" className="max-w-5xl mx-auto px-4 md:px-6 -mt-4 md:-mt-8 relative z-10">
      <Reveal>
        <div className="card !p-0 overflow-hidden shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between px-5 py-3 border-b border-surface-600 bg-surface-900/60">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-severity-critical/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-severity-medium/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-severity-low/60" />
            </div>
            <p className="text-[11px] text-slate-500 font-mono">Vista previa ilustrativa · Dashboard de GEF Secure</p>
          </div>

          <div className="p-5 md:p-6 space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard title="Activos monitoreados" value={41} icon={Server} color="brand" />
              <StatCard title="Vulnerabilidades críticas" value={12} icon={Flame} color="critical" emphasize />
              <StatCard title="Vulnerabilidades altas" value={28} icon={Bug} color="high" />
              <StatCard title="Explotación conocida" value={7} icon={ShieldAlert} color="critical" emphasize />
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Riesgo por severidad
              </p>
              <div className="space-y-2">
                {SEVERITY_BARS.map(bar => (
                  <div key={bar.label} className="flex items-center gap-3">
                    <span className="w-14 text-xs text-slate-400 flex-shrink-0">{bar.label}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-surface-700 overflow-hidden">
                      <div className={`h-full rounded-full ${bar.color}`} style={{ width: `${bar.pct}%` }} />
                    </div>
                    <span className="w-8 text-right text-xs font-mono text-slate-300 flex-shrink-0">{bar.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
