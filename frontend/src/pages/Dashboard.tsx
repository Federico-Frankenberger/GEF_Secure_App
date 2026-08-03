import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { ShieldAlert, Package, AlertOctagon, CheckCircle2, TrendingDown, Wifi, Clock } from 'lucide-react'
import { dashboardApi } from '../services/api'
import type { DashboardStats } from '../types'
import StatCard from '../components/StatCard'
import PageHeader from '../components/PageHeader'
import toast from 'react-hot-toast'

const SEVERITY_COLORS: Record<string, string> = {
  'CRITICAL': '#bd1e1e', // Rojo Crítico (9.0-10.0)
  'HIGH':     '#f95c5c', // Rojo/Rosa Alto (7.0-8.9)
  'MEDIUM':   '#f9f15c', // Amarillo Medio (4.0-6.9)
  'LOW':      '#44a024', // Verde Bajo (0.1-3.9)
}
const STATUS_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#94a3b8']
const CHART_STYLE = { fontFamily: '"DM Sans", sans-serif', fontSize: 11 }

function ChartSkeleton({ h = 200 }: { h?: number }) {
  return <div className="skeleton rounded-xl w-full" style={{ height: h }} />
}

function formatMttr(days?: number | null): string {
  if (days === null || days === undefined) return '—'
  if (days < 1) return `${Math.round(days * 24)} h`
  return `${days.toFixed(1)} d`
}

export default function Dashboard() {
  const [stats,   setStats]   = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi.getStats()
      .then(r => setStats(r.data))
      .catch(() => toast.error('Error al cargar estadísticas'))
      .finally(() => setLoading(false))
  }, [])

  const kpis = [
    { title: 'Total Activos',       value: stats?.totalAssets,            icon: Package,      color: 'brand'   as const },
    { title: 'Vulnerabilidades',    value: stats?.totalVulnerabilities,   icon: ShieldAlert,  color: 'amber'   as const },
    { title: 'Abiertas',            value: stats?.openVulnerabilities,    icon: AlertOctagon, color: 'red'     as const },
    { title: 'Críticas',            value: stats?.criticalVulnerabilities,icon: TrendingDown, color: 'red'     as const },
    { title: 'Resueltas este mes',  value: stats?.resolvedThisMonth,      icon: CheckCircle2, color: 'emerald' as const },
    { title: 'MTTR',                value: formatMttr(stats?.mttrDays),   icon: Clock,        color: 'amber'   as const },
    { title: 'Estado del sistema',  value: stats?.systemStatus,           icon: Wifi,         color: 'sky'     as const },
  ]

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle="Vista general del estado de seguridad"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {kpis.map(kpi => <StatCard key={kpi.title} {...kpi} loading={loading} />)}
      </div>

      {/* Fila 1: Area + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <p className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider">
            Detectadas vs Resueltas — 30 días
          </p>
          {loading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats?.trendsLast30Days ?? []} style={CHART_STYLE}>
                <defs>
                  <linearGradient id="gDet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="gRes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#232639" />
                <XAxis dataKey="date" tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#1a1d2e', border: '1px solid #232639', borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                <Area type="monotone" dataKey="detectadas" stroke="#6366f1" fill="url(#gDet)" strokeWidth={2} />
                <Area type="monotone" dataKey="resueltas"  stroke="#10b981" fill="url(#gRes)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <p className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider">
            Distribución por Severidad
          </p>
          {loading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart style={CHART_STYLE}>
                <Pie
                  data={stats?.severityDistribution ?? []}
                  cx="50%" cy="50%" outerRadius={75} innerRadius={45}
                  dataKey="value" nameKey="name" paddingAngle={3}
                >
                  {(stats?.severityDistribution ?? []).map((entry) => (
                    <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] ?? '#6366f1'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1d2e', border: '1px solid #232639', borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Fila 2: Bar */}
      <div className="card">
        <p className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider">
          Distribución por Estado
        </p>
        {loading ? <ChartSkeleton h={160} /> : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={stats?.statusDistribution ?? []} style={CHART_STYLE} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#232639" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8' }} tickLine={false} axisLine={false} width={100} />
              <Tooltip contentStyle={{ background: '#1a1d2e', border: '1px solid #232639', borderRadius: 8 }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={24}>
                {(stats?.statusDistribution ?? []).map((_, i) => (
                  <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}