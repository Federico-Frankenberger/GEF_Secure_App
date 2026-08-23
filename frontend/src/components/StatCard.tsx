import { ElementType } from 'react'
import { ChevronRight } from 'lucide-react'

type Color = 'brand' | 'red' | 'emerald' | 'amber' | 'sky' | 'critical' | 'high' | 'medium' | 'low'

interface Props {
  title: string
  value?: string | number | null
  icon?: ElementType
  color?: Color
  delta?: number
  loading?: boolean
  /** P-01 (auditoría UX/UI): un KPI que no lleva a ningún lado no sirve para
   *  "detectar y actuar rápido". Cuando se pasa, la card entera se vuelve
   *  interactiva y navega al hacer click. */
  onClick?: () => void
  /** Resalta la card (borde de color) para las 2-3 métricas de riesgo activo
   *  por sobre las descriptivas (P-14). */
  emphasize?: boolean
}

const colorMap: Record<Color, string> = {
  brand:    'text-brand-400   bg-brand-600/10   border-brand-600/20',
  red:      'text-red-400     bg-red-600/10     border-red-600/20',
  emerald:  'text-emerald-400 bg-emerald-600/10 border-emerald-600/20',
  amber:    'text-amber-400   bg-amber-600/10   border-amber-600/20',
  sky:      'text-sky-400     bg-sky-600/10     border-sky-600/20',
  // Variantes semánticas de severidad (P-09 de la auditoría UX/UI del Dashboard: "usa el
  // color como indicador semántico, no como decoración") -- para KPIs que representan
  // directamente Critical/High/Medium/Low, en vez de pedir prestado un color genérico
  // (ej. "sky" para Medias) que no coincide con severity-medium usado en el resto de la app.
  critical: 'text-severity-critical bg-severity-critical/10 border-severity-critical/20',
  high:     'text-severity-high     bg-severity-high/10     border-severity-high/20',
  medium:   'text-severity-medium   bg-severity-medium/10   border-severity-medium/20',
  low:      'text-severity-low      bg-severity-low/10      border-severity-low/20',
}

export default function StatCard({
  title, value, icon: Icon, color = 'brand', delta, loading, onClick, emphasize,
}: Props) {
  if (loading) {
    return (
      <div className="card !p-3 flex flex-col items-center gap-2">
        <div className="skeleton w-9 h-9 rounded-lg flex-shrink-0" />
        <div className="space-y-2 w-full flex flex-col items-center">
          <div className="skeleton h-2.5 w-16 rounded" />
          <div className="skeleton h-5 w-12 rounded" />
        </div>
      </div>
    )
  }

  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      onClick={onClick}
      type={onClick ? 'button' : undefined}
      className={`card !p-3 flex flex-col items-center text-center gap-2 transition-colors w-full relative
        ${emphasize ? 'border-2' : 'hover:border-surface-500'}
        ${emphasize && (color === 'red' || color === 'critical') ? 'border-severity-critical/50' : ''}
        ${onClick ? 'cursor-pointer hover:border-brand-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400' : ''}`}
    >
      {onClick && (
        <ChevronRight size={12} className="absolute top-2.5 right-2.5 text-slate-600" aria-hidden />
      )}
      {Icon && (
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
          <Icon size={16} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider leading-tight">{title}</p>
        <p className="text-lg font-bold text-white mt-0.5 leading-tight break-words">{value ?? '—'}</p>
        {delta !== undefined && (
          <p className={`text-[11px] mt-0.5 ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} este mes
          </p>
        )}
      </div>
    </Wrapper>
  )
}
