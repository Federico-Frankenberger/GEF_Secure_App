import { useEffect, useState, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Download, Search, TrendingUp, TrendingDown, Minus, ShieldAlert, ArrowRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { vulnApi, reportApi } from '../services/api'
import type {
  VulnerabilitySummary, VulnerabilityAnalysis, RemediationAnalysis, CvePreview,
} from '../types'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import { downloadBlob } from '../utils/downloadFile'
import { PRIORITY_BADGE, PRIORITY_LABEL } from '../constants/badges'

// Centro de Informes de Seguridad (docs/bitacora/23-08-26,
// prompt_mejora_informes_gef_secure.md): distinto del Dashboard ("¿cómo estamos ahora?"),
// esto responde "¿qué pasó en un período y cómo lo comunico?". 3 pestañas -- 2 retiradas
// del diseño original (Informe de escaneo puntual / comparativo) porque ya viven, mejor
// resueltas con vista previa real, en Escaneos → Historial. La vista "Vulnerabilidades"
// (tendencia/SLA/fuentes) tampoco vive acá -- se probó embebida y quedaba duplicada con
// la pestaña Análisis del módulo Vulnerabilidades (mismo gráfico, dos rutas); se dejó
// solo en su lugar nativo, con export agregado ahí, y acá solo se linkea.
type Tab = 'resumen' | 'remediacion' | 'cve'
const TABS: { key: Tab; label: string }[] = [
  { key: 'resumen', label: 'Resumen Ejecutivo' },
  { key: 'remediacion', label: 'Remediación' },
  { key: 'cve', label: 'Ficha de CVE/GHSA' },
]

function ChartSkeleton({ h = 80 }: { h?: number }) {
  return <div className="skeleton rounded-lg w-full" style={{ height: h }} />
}

function formatMttr(days?: number | null): string {
  if (days === null || days === undefined) return '—'
  if (days < 1) return `${Math.round(days * 24)} h`
  return `${days.toFixed(1)} d`
}

function exportPdf(promise: Promise<{ data: Blob }>, filename: string, setBusy: (v: boolean) => void) {
  setBusy(true)
  promise
    .then(r => downloadBlob(r.data, filename))
    .catch(() => toast.error('Error al generar el PDF'))
    .finally(() => setBusy(false))
}

export default function Informes() {
  const [tab, setTab] = useState<Tab>('resumen')

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Informes"
        subtitle="Centro de Informes de Seguridad — evolución en un período y documentos para compartir"
      />

      <div className="flex gap-1 mb-5 bg-surface-800 border border-surface-600 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === t.key ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'resumen' && <ResumenEjecutivoTab />}
      {tab === 'remediacion' && <RemediacionTab />}
      {tab === 'cve' && <FichaCveTab />}

      {/* Retiradas del rediseño (docs/bitacora/23-08-26): informe de escaneo puntual y
          comparativo ya viven, con vista previa real antes de exportar, en el historial
          de Escaneos; la evolución de vulnerabilidades por período (tendencia/SLA/
          fuentes) ya vive en la pestaña Análisis de Vulnerabilidades, con su propio
          export -- acá solo se avisa dónde encontrar cada uno, no se duplican. */}
      <div className="text-xs text-slate-500 mt-6 space-y-1.5">
        <p className="flex items-center gap-1.5">
          <ArrowRight size={12} className="flex-shrink-0" />
          ¿Buscás el informe de un escaneo puntual o una comparación entre dos? Anda a{' '}
          <Link to="/scans" className="text-brand-400 hover:text-brand-300 font-medium">Escaneos → Historial</Link>,
          {' '}abrí el resultado que te interesa y exportá desde ahí — vas a ver los datos antes de descargar.
        </p>
        <p className="flex items-center gap-1.5">
          <ArrowRight size={12} className="flex-shrink-0" />
          ¿Buscás la evolución de vulnerabilidades por período (tendencia, SLA, fuentes)? Anda a{' '}
          <Link to="/kanban?tab=analisis" className="text-brand-400 hover:text-brand-300 font-medium">Vulnerabilidades → Análisis</Link>,
          {' '}el botón "Exportar PDF" ya está ahí mismo.
        </p>
      </div>
    </div>
  )
}

// ── Resumen Ejecutivo ────────────────────────────────────────────────────────────────

function trendDirection(trend: { detectadas: number; resueltas: number }[]): 'up' | 'down' | 'flat' {
  if (trend.length < 4) return 'flat'
  const mid = Math.floor(trend.length / 2)
  const net = (rows: typeof trend) => rows.reduce((s, d) => s + d.detectadas - d.resueltas, 0)
  const delta = net(trend.slice(mid)) - net(trend.slice(0, mid))
  if (delta > 0) return 'up'
  if (delta < 0) return 'down'
  return 'flat'
}

function ResumenEjecutivoTab() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<VulnerabilitySummary | null>(null)
  const [analysis, setAnalysis] = useState<VulnerabilityAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([vulnApi.summary(), vulnApi.analysis(30)])
      .then(([sum, an]) => { setSummary(sum.data); setAnalysis(an.data) })
      .catch(() => toast.error('Error al cargar el resumen ejecutivo'))
      .finally(() => setLoading(false))
  }, [])

  const slaPercent = summary && summary.openCount > 0
    ? Math.round((Math.max(0, summary.openCount - summary.slaOverdueCount - summary.slaUpcomingCount) / summary.openCount) * 100)
    : null

  const direction = analysis ? trendDirection(analysis.trend) : 'flat'
  const trendMeta = {
    up:   { icon: TrendingUp, color: 'text-severity-critical', label: 'Riesgo en aumento en los últimos 30 días' },
    down: { icon: TrendingDown, color: 'text-severity-low', label: 'Riesgo en baja en los últimos 30 días' },
    flat: { icon: Minus, color: 'text-slate-400', label: 'Riesgo estable en los últimos 30 días' },
  }[direction]

  return (
    <div className="space-y-4">
      <div className="card flex items-center gap-3 !py-3">
        <trendMeta.icon size={20} className={`${trendMeta.color} flex-shrink-0`} />
        <p className={`text-sm font-medium ${trendMeta.color}`}>{trendMeta.label}</p>
      </div>

      {/* Corrección de diseño (docs/bitacora/23-08-26): esta fila mostraba antes Total
          Activos/Vulnerabilidades/Abiertas/Críticas/Resueltas/MTTR -- exactamente los
          mismos KPIs, con el mismo cálculo, que ya están en el Dashboard a un click de
          acá. Un "resumen ejecutivo" que repite el Dashboard no aporta nada nuevo. Estos
          6 campos sí son exclusivos de esta vista (VulnerabilitySummaryDTO ya los traía,
          nunca se habían mostrado): exposición real, explotación conocida y el delta del
          período -- no "cuánto hay en total", sino "qué cambió y qué tan grave es". */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? [...Array(6)].map((_, i) => <StatCard key={i} title="" loading />) : <>
          <StatCard title="Activos con exposición" value={summary?.affectedAssetsCount} color="amber" onClick={() => navigate('/assets')} />
          <StatCard title="Explotación conocida" value={summary?.exploitedCount} color="critical" emphasize />
          <StatCard title="Nuevas (7 días)" value={summary?.newLast7Days} color="red" onClick={() => navigate('/kanban?tab=listado')} />
          <StatCard title="Resueltas (7 días)" value={summary?.resolvedLast7Days} color="emerald" onClick={() => navigate('/kanban?tab=listado&triageStatus=RESUELTA')} />
          <StatCard title="Cumplimiento SLA" value={slaPercent !== null ? `${slaPercent}%` : '—'} color={slaPercent !== null && slaPercent < 70 ? 'critical' : 'emerald'} />
          <StatCard title="En catálogo CISA KEV" value={summary?.cisaKevCount} color="critical" />
        </>}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Activos con mayor riesgo</p>
          <button
            onClick={() => exportPdf(reportApi.executive(), 'resumen-ejecutivo.pdf', setExporting)}
            disabled={exporting}
            className="btn-primary !py-1.5"
          >
            <Download size={13} /> {exporting ? 'Generando…' : 'Exportar PDF'}
          </button>
        </div>
        {loading ? <ChartSkeleton h={140} /> : !summary?.topRiskAssets.length ? (
          <p className="text-sm text-slate-500 italic py-4">Sin vulnerabilidades abiertas para rankear activos.</p>
        ) : (
          <div className="space-y-1.5">
            {summary.topRiskAssets.map(a => (
              <div key={a.assetId} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-surface-800">
                <span className="text-slate-300">{a.assetName}</span>
                <span className="text-xs text-slate-500 font-mono">{a.criticals} críticas · {a.highs} altas · {a.total} total</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Remediación ──────────────────────────────────────────────────────────────────────

const PERIODS = [7, 30, 90] as const

function RemediacionTab() {
  const [days, setDays] = useState<7 | 30 | 90>(30)
  const [data, setData] = useState<RemediationAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    setLoading(true)
    vulnApi.remediationAnalysis(days)
      .then(r => setData(r.data))
      .catch(() => toast.error('Error al cargar el análisis de remediación'))
      .finally(() => setLoading(false))
  }, [days])

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">MTTR y cumplimiento de SLA</p>
          <div className="flex items-center gap-3">
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
            <button
              onClick={() => exportPdf(reportApi.remediation(days), `informe-remediacion-${days}d.pdf`, setExporting)}
              disabled={exporting}
              className="btn-primary !py-1.5"
            >
              <Download size={13} /> {exporting ? 'Generando…' : 'Exportar PDF'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {loading ? [...Array(3)].map((_, i) => <StatCard key={i} title="" loading />) : <>
            <StatCard title="MTTR declarado" value={formatMttr(data?.mttrDeclaredDays)} color="brand" />
            <StatCard title="MTTR verificado" value={formatMttr(data?.mttrVerifiedDays)} color="brand" />
            <StatCard title="Casos reabiertos" value={data?.reopenedCasesCount} color="amber" />
          </>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <p className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider">
            Cierres por tipo de resolución (VEX, {days}d)
          </p>
          {loading ? <ChartSkeleton h={120} /> : !data?.outcomeBreakdown.length ? (
            <p className="text-sm text-slate-500 italic">Sin cierres en el período elegido.</p>
          ) : (
            <div className="space-y-1.5">
              {data.outcomeBreakdown.map(row => (
                <div key={row.outcome} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-surface-800">
                  <span className="text-slate-300">{row.outcome === 'SIN_CLASIFICAR' ? 'Sin clasificar' : row.outcome}</span>
                  <span className="text-xs text-slate-500 font-mono">{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <p className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider">
            Cierres por nivel de evidencia ({days}d)
          </p>
          {loading ? <ChartSkeleton h={120} /> : !data?.evidenceLevelBreakdown.length ? (
            <p className="text-sm text-slate-500 italic">Sin cierres en el período elegido.</p>
          ) : (
            <div className="space-y-1.5">
              {data.evidenceLevelBreakdown.map(row => (
                <div key={row.evidenceLevel} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-surface-800">
                  <span className="text-slate-300 font-mono">{row.evidenceLevel === 'SIN_EVIDENCIA' ? 'Sin evidencia' : row.evidenceLevel}</span>
                  <span className="text-xs text-slate-500 font-mono">{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {!loading && data && data.mttrByCriticality.length > 0 && (
        <div className="card">
          <p className="text-xs font-semibold text-slate-400 mb-4 uppercase tracking-wider">MTTR declarado por criticidad</p>
          <div className="space-y-1.5">
            {data.mttrByCriticality.map(row => (
              <div key={row.priority} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-surface-800">
                <span className={`badge ${PRIORITY_BADGE[row.priority] ?? ''}`}>{PRIORITY_LABEL[row.priority] ?? row.priority}</span>
                <span className="text-xs text-slate-500 font-mono">{formatMttr(row.avgDays)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Ficha de CVE/GHSA ────────────────────────────────────────────────────────────────

function FichaCveTab() {
  const [identifier, setIdentifier] = useState('')
  const [preview, setPreview] = useState<CvePreview | null>(null)
  const [checking, setChecking] = useState(false)
  const [exporting, setExporting] = useState(false)

  const checkPreview = useCallback((value: string) => {
    const trimmed = value.trim()
    if (!trimmed) { setPreview(null); return }
    setChecking(true)
    reportApi.cvePreview(trimmed)
      .then(r => setPreview(r.data))
      .catch(() => toast.error('Error al buscar el identificador'))
      .finally(() => setChecking(false))
  }, [])

  // Búsqueda al tipear, con un debounce corto -- no hace falta un botón "Buscar" aparte
  // para algo tan liviano como este preview.
  useEffect(() => {
    const id = setTimeout(() => checkPreview(identifier), 350)
    return () => clearTimeout(id)
  }, [identifier, checkPreview])

  return (
    <div className="card max-w-xl space-y-4">
      <div>
        <label className="block text-xs text-slate-400 mb-1">CVE o GHSA</label>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input !pl-9"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            placeholder="ej: CVE-2024-12345 o GHSA-xxxx-xxxx-xxxx"
          />
        </div>
      </div>

      {checking && <p className="text-xs text-slate-500">Buscando…</p>}

      {!checking && identifier.trim() && preview && !preview.found && (
        <div className="flex items-center gap-2 text-sm text-slate-400 bg-surface-800 rounded-lg px-3 py-2.5">
          <ShieldAlert size={14} className="text-slate-500 flex-shrink-0" />
          No se encontraron activos afectados por "{identifier.trim()}".
        </div>
      )}

      {!checking && preview?.found && (
        <div className="space-y-3">
          <div className="bg-surface-800 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Activos afectados</span>
              <span className="text-white font-semibold">{preview.affectedAssetsCount}</span>
            </div>
            {preview.priority && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Prioridad</span>
                <span className={`badge ${PRIORITY_BADGE[preview.priority] ?? ''}`}>{PRIORITY_LABEL[preview.priority] ?? preview.priority}</span>
              </div>
            )}
            {preview.cvss && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">CVSS</span>
                <span className="text-white font-mono">{preview.cvss}</span>
              </div>
            )}
            {preview.summary && <p className="text-xs text-slate-500 pt-1 border-t border-surface-600">{preview.summary}</p>}
          </div>
          <button
            onClick={() => exportPdf(reportApi.cve(identifier.trim()), `ficha-${identifier.trim()}.pdf`, setExporting)}
            disabled={exporting}
            className="btn-primary w-full justify-center"
          >
            <Download size={14} /> {exporting ? 'Generando…' : 'Exportar PDF'}
          </button>
        </div>
      )}
    </div>
  )
}
