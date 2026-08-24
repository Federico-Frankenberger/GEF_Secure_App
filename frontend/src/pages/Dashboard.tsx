import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  ShieldAlert, ShieldCheck, Package, AlertOctagon, CheckCircle2, Flame, ChevronRight,
} from 'lucide-react'
import { dashboardApi, vulnApi } from '../services/api'
import type { DashboardStats, VulnerabilityAudit } from '../types'
import StatCard from '../components/StatCard'
import PageHeader from '../components/PageHeader'
import Table, { Column } from '../components/Table'
import toast from 'react-hot-toast'
import { SEVERITY_HEX, STATUS_HEX, PRIORITY_BADGE, PRIORITY_LABEL, rank } from '../constants/badges'

// Design System "Centro de Operaciones" (P-03 de la auditoría UX/UI): antes
// duplicado como hex crudo acá y en 4 archivos más -- ahora una sola fuente
// en constants/badges.ts, reusada tal cual (Recharts pinta a SVG/canvas via
// prop `fill`, así que necesita hex, no clases Tailwind).
const SEVERITY_COLORS = SEVERITY_HEX
// Bar únicas (una sola serie, un solo color) para Aging y Abiertas por responsable --
// no son categóricas, así que no necesitan una paleta, solo un color neutral/de marca
// consistente con el resto del dashboard. Antes salían de un array categórico genérico
// (CATEGORY_COLORS) que además incluía un violeta sin relación semántica con nada --
// esa paleta se sacó del todo (ver STATUS_HEX para el reemplazo de "Distribución por
// Estado", que si es categórica pero con significado fijo, no decorativo).
const BRAND_BAR = '#0284c7'
const NEUTRAL_BAR = '#64748b'
const CHART_STYLE = { fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 11 }

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

function formatMttr(days?: number | null): string {
  if (days === null || days === undefined) return '—'
  if (days < 1) return `${Math.round(days * 24)} h`
  return `${days.toFixed(1)} d`
}

// Fase 2 (docs/21-08-26/Plan_Implementacion_Tracking_Solido.md): recurrenceRate llega
// como proporcion 0-1 -- se muestra como porcentaje.
function formatRecurrenceRate(rate?: number | null): string {
  if (rate === null || rate === undefined) return '—'
  return `${(rate * 100).toFixed(1)}%`
}

function daysOpen(detectedAt: string): number {
  const ms = Date.now() - new Date(detectedAt).getTime()
  return Math.max(0, Math.floor(ms / 86_400_000))
}

export default function Dashboard() {
  const [stats,   setStats]   = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    dashboardApi.getStats()
      .then(r => setStats(r.data))
      .catch(() => toast.error('Error al cargar estadísticas'))
      .finally(() => setLoading(false))
  }, [])

  // Auditoría de Dashboard (docs/bitacora/23-08-26): "requiere atención" no
  // existía como sección -- el dashboard solo mostraba agregados, nunca CUÁLES
  // vulnerabilidades puntuales necesitan acción. Se deriva client-side de
  // vulnApi.getAll() (mismo endpoint que ya usa Kanban.tsx) -- no hace falta
  // ningún endpoint nuevo. Ver auditoria-dashboard.md, sección "Pendiente":
  // esto trae TODAS las vulnerabilidades al navegador para filtrar/ordenar acá;
  // no es un problema al volumen actual, pero un endpoint agregado sería más
  // correcto si la base crece mucho.
  const [attentionVulns, setAttentionVulns] = useState<VulnerabilityAudit[] | null>(null)
  useEffect(() => {
    vulnApi.getAll()
      .then(r => setAttentionVulns(r.data))
      .catch(() => toast.error('Error al cargar vulnerabilidades prioritarias'))
  }, [])

  const attentionList = useMemo(() => {
    if (!attentionVulns) return []
    return attentionVulns
      .filter(v => (v.priority === 'CRITICAL' || v.priority === 'HIGH')
        && (v.status === 'DETECTADA' || v.status === 'EN_ANALISIS'))
      .sort((a, b) => rank(a.priority) - rank(b.priority) || +new Date(a.detectedAt) - +new Date(b.detectedAt))
      .slice(0, 6)
  }, [attentionVulns])

  const attentionColumns: Column<VulnerabilityAudit>[] = [
    { key: 'cveId', label: 'CVE', render: (_v, row) => <span className="font-mono text-xs">{row.cveId || row.ghsaId || 'Sin identificador'}</span> },
    { key: 'asset', label: 'Activo', render: v => <span className="text-slate-300">{String(v ?? '—')}</span> },
    { key: 'priority', label: 'Prioridad', render: v => <span className={`badge ${PRIORITY_BADGE[String(v)] ?? ''}`}>{PRIORITY_LABEL[String(v)] ?? String(v)}</span> },
    { key: 'detectedAt', label: 'Días abierta', render: (v) => <span className="font-mono text-xs text-slate-400">{daysOpen(String(v))} d</span> },
  ]

  // Nivel 1 (auditoría de Dashboard): "Estado del sistema" deja de competir en
  // igualdad con el resto de los KPIs -- pasa a ser el banner de arriba de
  // todo. Bug real encontrado al verificar visualmente (no solo compilar):
  // `stats.systemStatus` es un agregado del backend que puede desincronizarse
  // de `attentionList` (ej. viene del último ScanReport, no se recalcula en
  // vivo) -- se vio el banner en verde "ESTABLE" mientras la tabla de abajo
  // mostraba una vulnerabilidad CRITICAL sin resolver. El banner ahora deriva
  // de la MISMA lista que la tabla, para que nunca se contradigan entre sí.
  const systemOk = !attentionList.some(v => v.priority === 'CRITICAL')

  // Deep-links al módulo de Vulnerabilidades (docs/bitacora/23-08-26): antes las 5
  // cards mandaban todas a /kanban a secas -- con el rediseño en 4 vistas, cada una
  // ahora aterriza en la vista que mejor responde la pregunta que representa. Solo
  // "Críticas" tiene un filtro de un solo valor limpio (priority=CRITICAL); "Abiertas"
  // mezcla DETECTADA+EN_ANALISIS y el filtro del Listado es de un solo valor, así que
  // aterriza sin filtrar en vez de mentir con uno parcial.
  const kpis = [
    { title: 'Total Activos',      value: stats?.totalAssets,             icon: Package,      color: 'brand'   as const, onClick: () => navigate('/assets') },
    { title: 'Vulnerabilidades',   value: stats?.totalVulnerabilities,    icon: ShieldAlert,  color: 'amber'   as const, onClick: () => navigate('/kanban?tab=resumen') },
    { title: 'Abiertas',           value: stats?.openVulnerabilities,     icon: AlertOctagon, color: 'red'     as const, onClick: () => navigate('/kanban?tab=listado'), emphasize: true },
    { title: 'Críticas',           value: stats?.criticalVulnerabilities, icon: Flame,        color: 'red'     as const, onClick: () => navigate('/kanban?tab=listado&priority=CRITICAL'), emphasize: true },
    { title: 'Resueltas este mes', value: stats?.resolvedThisMonth,       icon: CheckCircle2, color: 'emerald' as const, onClick: () => navigate('/kanban?tab=listado&triageStatus=RESUELTA') },
  ]

  // Nivel 3: severidad pasa de donut a bar horizontal -- mismo lenguaje visual
  // que "Distribución por Estado" (ya era bar), y ordenado por severidad real
  // en vez del orden que devuelva el backend (ver auditoria-dashboard.md, #5).
  const severityBars = (stats?.severityDistribution ?? [])
    .slice()
    .sort((a, b) => rank(String(a.name)) - rank(String(b.name)))

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle="Vista general del estado de seguridad"
      />

      {/* Banner de estado -- Nivel 1, la primera cosa que se lee */}
      {loading ? (
        <div className="skeleton rounded-lg w-full h-14 mb-4" />
      ) : (
        <div className={`card mb-4 flex items-center gap-3 !py-3
          ${systemOk ? 'border-severity-low/40' : 'border-severity-critical/40'}`}
        >
          {systemOk
            ? <ShieldCheck size={20} className="text-severity-low flex-shrink-0" />
            : <ShieldAlert size={20} className="text-severity-critical flex-shrink-0" />}
          <div>
            <p className={`text-sm font-semibold ${systemOk ? 'text-severity-low' : 'text-severity-critical'}`}>
              {attentionVulns == null ? 'Cargando…' : systemOk ? 'Estable' : 'Acción requerida'}
            </p>
            <p className="text-xs text-slate-500">
              {systemOk
                ? 'No hay vulnerabilidades críticas sin resolver.'
                : 'Hay vulnerabilidades críticas que requieren acción.'}
            </p>
          </div>
        </div>
      )}

      {/* KPIs — Nivel 1 (5, no 8: Estado del sistema es el banner de arriba;
          MTTR/Recurrencia bajan al Nivel 2 como contexto de tendencia) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        {kpis.map(kpi => <StatCard key={kpi.title} {...kpi} loading={loading} />)}
      </div>

      {/* Nivel 2 — Evolución y tendencias */}
      <div className="card mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Detectadas vs Resueltas — 30 días
          </p>
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">MTTR declarado</p>
              <p className="text-sm font-semibold text-white font-mono">{loading ? '—' : formatMttr(stats?.mttrDeclaredDays)}</p>
            </div>
            {/* DT-01: antes siempre null (stub) -- ahora mide contra cierres con evidencia
                E4+ (verificación técnica real, no la declaración del analista). "—" cuando
                todavía no hay ningún cierre con ese nivel de evidencia, nunca un número
                inventado. */}
            <div className="text-right" title="Solo cuenta cierres con evidencia E4+ (verificación técnica real, ej. versión corregida confirmada)">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">MTTR verificado</p>
              <p className="text-sm font-semibold text-white font-mono">{loading ? '—' : formatMttr(stats?.mttrVerifiedDays)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Tasa de recurrencia</p>
              <p className="text-sm font-semibold text-white font-mono">{loading ? '—' : formatRecurrenceRate(stats?.recurrenceRate)}</p>
            </div>
          </div>
        </div>
        {loading ? <ChartSkeleton /> : !(stats?.trendsLast30Days ?? []).length ? (
          <EmptyChart message="Sin actividad de detección/resolución en los últimos 30 días." h={200} />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stats?.trendsLast30Days ?? []} style={CHART_STYLE}>
              <defs>
                <linearGradient id="gDet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0284c7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="gRes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2830" />
              <XAxis dataKey="date" tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#10161c', border: '1px solid #1c2830', borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Area type="monotone" dataKey="detectadas" stroke="#0284c7" fill="url(#gDet)" strokeWidth={2} />
              <Area type="monotone" dataKey="resueltas"  stroke="#10b981" fill="url(#gRes)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Nivel 3 — Distribución del riesgo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <p className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider">
            Distribución por Severidad
          </p>
          {loading ? <ChartSkeleton h={160} /> : !severityBars.length ? (
            <EmptyChart message="Sin vulnerabilidades registradas para distribuir por severidad." />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={severityBars} style={CHART_STYLE} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2830" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8' }} tickLine={false} axisLine={false} width={80}
                  tickFormatter={(v) => PRIORITY_LABEL[String(v)] ?? String(v)} />
                <Tooltip contentStyle={{ background: '#10161c', border: '1px solid #1c2830', borderRadius: 8 }}
                  formatter={(value: number, _n, item) => [value, PRIORITY_LABEL[String(item?.payload?.name)] ?? String(item?.payload?.name)]} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={24}>
                  {severityBars.map((entry) => (
                    <Cell key={String(entry.name)} fill={SEVERITY_COLORS[String(entry.name)] ?? '#0284c7'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <p className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider">
            Distribución por Estado
          </p>
          {loading ? <ChartSkeleton h={160} /> : !(stats?.statusDistribution ?? []).length ? (
            <EmptyChart message="Sin vulnerabilidades registradas por estado." />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={stats?.statusDistribution ?? []} style={CHART_STYLE} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2830" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8' }} tickLine={false} axisLine={false} width={100} />
                <Tooltip contentStyle={{ background: '#10161c', border: '1px solid #1c2830', borderRadius: 8 }} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={24}>
                  {(stats?.statusDistribution ?? []).map((entry) => (
                    <Cell key={String(entry.name)} fill={STATUS_HEX[String(entry.name)] ?? NEUTRAL_BAR} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Nivel 4 — Requiere atención */}
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-2 mb-2 flex items-center gap-2">
        <Flame size={12} className="text-severity-high" /> Requiere atención
      </p>

      <div className="card p-0 overflow-hidden mb-4">
        <div className="px-5 pt-4 pb-1 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Vulnerabilidades prioritarias sin resolver
          </p>
          {attentionList.length > 0 && (
            <button onClick={() => navigate('/kanban?tab=listado')} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-0.5">
              Ver todas <ChevronRight size={12} />
            </button>
          )}
        </div>
        {attentionVulns === null ? (
          <div className="p-4 space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-9 w-full rounded-lg" />)}
          </div>
        ) : attentionList.length === 0 ? (
          <div className="flex items-center gap-2 px-5 py-6 text-sm text-severity-low">
            <ShieldCheck size={16} /> Sin vulnerabilidades críticas o altas pendientes.
          </div>
        ) : (
          <Table columns={attentionColumns} data={attentionList} onRowClick={() => navigate('/kanban?tab=listado')} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="card">
          <p className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider">
            Antigüedad de lo abierto (aging)
          </p>
          {loading ? <ChartSkeleton h={160} /> : !(stats?.agingBuckets ?? []).length ? (
            <EmptyChart message="Sin vulnerabilidades abiertas para medir antigüedad." />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={stats?.agingBuckets ?? []} style={CHART_STYLE}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2830" />
                <XAxis dataKey="bucket" tick={{ fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#10161c', border: '1px solid #1c2830', borderRadius: 8 }} />
                <Bar dataKey="count" fill={NEUTRAL_BAR} radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <p className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider">
            MTTR declarado por criticidad
          </p>
          {loading ? <ChartSkeleton h={160} /> : !(stats?.mttrByCriticality ?? []).length ? (
            <EmptyChart message="Sin resoluciones registradas para calcular MTTR por criticidad." />
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={(stats?.mttrByCriticality ?? []).map(r => ({ ...r, avgDays: Number(r.avgDays.toFixed(1)) }))} style={CHART_STYLE} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1c2830" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} unit="d" />
                <YAxis type="category" dataKey="priority" tick={{ fill: '#94a3b8' }} tickLine={false} axisLine={false} width={80}
                  tickFormatter={(v) => PRIORITY_LABEL[String(v)] ?? String(v)} />
                <Tooltip contentStyle={{ background: '#10161c', border: '1px solid #1c2830', borderRadius: 8 }}
                  formatter={(value: number, _n, item) => [value, PRIORITY_LABEL[String(item?.payload?.priority)] ?? String(item?.payload?.priority)]} />
                <Bar dataKey="avgDays" radius={[0, 6, 6, 0]} maxBarSize={24}>
                  {(stats?.mttrByCriticality ?? []).map((entry, i) => (
                    <Cell key={i} fill={SEVERITY_COLORS[entry.priority] ?? '#0284c7'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Fase 9 (docs/21-08-26/Plan_Implementacion_Tracking_Solido.md): por responsable,
          ahora confiable porque assignedToUser es una FK real, no texto libre. */}
      <div className="card">
        <p className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider">
          Abiertas por responsable
        </p>
        {loading ? <ChartSkeleton h={160} /> : (stats?.byResponsible ?? []).length === 0 ? (
          <EmptyChart message="Sin casos abiertos con responsable asignado." />
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={stats?.byResponsible ?? []} style={CHART_STYLE} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1c2830" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8' }} tickLine={false} axisLine={false} width={120} />
              <Tooltip contentStyle={{ background: '#10161c', border: '1px solid #1c2830', borderRadius: 8 }} />
              <Bar dataKey="value" fill={BRAND_BAR} radius={[0, 6, 6, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
