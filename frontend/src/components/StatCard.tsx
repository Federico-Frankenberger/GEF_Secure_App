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
      <div className="card flex gap-4">
        <div className="skeleton w-11 h-11 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="skeleton h-3 w-24 rounded" />
          <div className="skeleton h-7 w-16 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="card flex gap-4 items-start hover:border-surface-500 transition-colors">
      {Icon && (
        <div className={`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
          <Icon size={19} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">{title}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value ?? '—'}</p>
        {delta !== undefined && (
          <p className={`text-xs mt-1 ${delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} este mes
          </p>
        )}
      </div>
    </div>
  )
}
