import { ElementType } from 'react'

type Color = 'brand' | 'red' | 'emerald' | 'amber' | 'sky'

interface Props {
  title: string
  value?: string | number | null
  icon?: ElementType
  color?: Color
  delta?: number
  loading?: boolean
}

const colorMap: Record<Color, string> = {
  brand:   'text-brand-400   bg-brand-600/10   border-brand-600/20',
  red:     'text-red-400     bg-red-600/10     border-red-600/20',
  emerald: 'text-emerald-400 bg-emerald-600/10 border-emerald-600/20',
  amber:   'text-amber-400   bg-amber-600/10   border-amber-600/20',
  sky:     'text-sky-400     bg-sky-600/10     border-sky-600/20',
}

export default function StatCard({
  title, value, icon: Icon, color = 'brand', delta, loading,
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

  return (
    <div className="card !p-3 flex flex-col items-center text-center gap-2 hover:border-surface-500 transition-colors">
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
    </div>
  )
}
