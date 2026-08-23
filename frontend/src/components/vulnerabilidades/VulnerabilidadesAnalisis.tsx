import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import toast from 'react-hot-toast'
import { vulnApi } from '../../services/api'
import type { VulnerabilityAnalysis } from '../../types'

const CHART_STYLE = { fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 11 }
const PERIODS = [7, 30, 90] as const

function ChartSkeleton({ h = 200 }: { h?: number }) {
  return <div className="skeleton rounded-lg w-full" style={{ height: h }} />
}

function EmptyChart({ message, h = 160 }: { message: string; h?: number }) {
  return (
    <div className="flex items-center justify-center text-xs text-slate-500 italic" style={{ height: h }}>
      {message}
    </div>
  )
}

/** Vista "Análisis" del rediseño de Vulnerabilidades (docs/bitacora/23-08-26, sección 6
 *  del prompt). Solo cubre lo que el Dashboard general NO calcula (período configurable,
 *  SLA agregado, fuentes CISA KEV vs GHSA) -- severidad/estado/aging/MTTR/por responsable
 *  ya están en el Dashboard con exactamente el mismo cálculo, repetirlos acá violaría la
 *  sección 15 del prompt ("evitar duplicar el Dashboard general"). */
export default function VulnerabilidadesAnalisis({ refreshTick }: { refreshTick: number }) {
  const [days, setDays] = useState<7 | 30 | 90>(30)
  const [data, setData] = useState<VulnerabilityAnalysis | null>(null)
  const [loading, setLoading] = useState(true)

  // refreshTick en las deps (no un remount por key desde el padre) para que guardar/
  // eliminar algo desde el detalle refresque los números sin resetear el período elegido.
  useEffect(() => {
    setLoading(true)
    vulnApi.analysis(days)
      .then(r => setData(r.data))
      .catch(() => toast.error('Error al cargar el análisis de vulnerabilidades'))
      .finally(() => setLoading(false))
  }, [days, refreshTick])

  const slaRows = data ? [
    { name: 'Vencido', value: data.slaOverdueCount, color: '#f87171' },
    { name: 'Próximo a vencer', value: data.slaUpcomingCount, color: '#facc15' },
    { name: 'En plazo', value: data.slaOnTrackCount, color: '#4ade80' },
  ] : []

  const sourceRows = data ? [
    { name: 'CISA KEV', value: data.cisaKevCount, color: '#f87171' },
    { name: 'Solo GHSA', value: data.ghsaOnlyCount, color: '#0284c7' },
  ] : []

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Evolución del backlog
          </p>
          <div className="flex gap-1 bg-surface-900 border border-surface-600 rounded-lg p-1 w-fit">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setDays(p)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all
                  ${days === p ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {p}d
              </button>
            ))}
          </div>
        </div>
        {loading ? <ChartSkeleton /> : !data?.trend.length ? (
          <EmptyChart message={`Sin actividad de detección/resolución en los últimos ${days} días.`} h={200} />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.trend} style={CHART_STYLE}>
              <defs>
                <linearGradient id="gDetA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gResA" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2830" />
              <XAxis dataKey="date" tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#10161c', border: '1px solid #1c2830', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Area type="monotone" dataKey="detectadas" stroke="#0284c7" fill="url(#gDetA)" strokeWidth={2} />
              <Area type="monotone" dataKey="resueltas" stroke="#10b981" fill="url(#gResA)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <p className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider">
            Cumplimiento de SLA (abiertas)
          </p>
          {loading ? <ChartSkeleton h={140} /> : !slaRows.some(r => r.value > 0) ? (
            <EmptyChart message="Sin vulnerabilidades abiertas para medir SLA." h={140} />
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={slaRows} style={CHART_STYLE} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2830" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8' }} tickLine={false} axisLine={false} width={110} />
                <Tooltip contentStyle={{ background: '#10161c', border: '1px solid #1c2830', borderRadius: 8 }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={24}>
                  {slaRows.map(row => <Cell key={row.name} fill={row.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <p className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider">
            Fuentes de detección (abiertas)
          </p>
          {loading ? <ChartSkeleton h={140} /> : !sourceRows.some(r => r.value > 0) ? (
            <EmptyChart message="Sin vulnerabilidades abiertas con fuente identificada." h={140} />
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={sourceRows} style={CHART_STYLE} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2830" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8' }} tickLine={false} axisLine={false} width={110} />
                <Tooltip contentStyle={{ background: '#10161c', border: '1px solid #1c2830', borderRadius: 8 }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={24}>
                  {sourceRows.map(row => <Cell key={row.name} fill={row.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-500 italic px-1">
        Severidad, estado, antigüedad, MTTR y desglose por responsable ya están disponibles
        en el Dashboard general -- no se repiten acá para no duplicar la misma información
        dos veces con el mismo cálculo.
      </p>
    </div>
  )
}
