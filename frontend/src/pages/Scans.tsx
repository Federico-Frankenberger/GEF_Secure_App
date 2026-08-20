import { useEffect, useState, useCallback, useMemo, ReactNode } from 'react'
import { GitCompare, RefreshCw, ScanLine, Search, ChevronDown, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { softwareComponentApi, environmentApi, assetApi, vulnApi, scanApi, reportApi } from '../services/api'
import type { SoftwareComponent, Environment, Asset, VulnerabilityAudit, ScanReport, ScanComparison, ScanTargetType } from '../types'
import PageHeader from '../components/PageHeader'
import Table, { Column } from '../components/Table'
import Modal from '../components/Modal'
import { useScanPolling } from '../hooks/useScanPolling'
import { useAuth } from '../contexts/AuthContext'
import { downloadBlob } from '../utils/downloadFile'

const PRIORITY_BADGE: Record<string, string> = {
  CRITICAL: 'bg-[#bd1e1e]/20 text-[#bd1e1e] border border-[#bd1e1e]/40',
  HIGH:     'bg-[#f95c5c]/15 text-[#f95c5c] border border-[#f95c5c]/30',
  MEDIUM:   'bg-[#f9f15c]/15 text-yellow-200 border border-[#f9f15c]/30',
  LOW:      'bg-[#44a024]/15 text-[#44a024] border border-[#44a024]/30',
}
const STATUS_BADGE: Record<string, string> = {
  DETECTADA:   'bg-slate-600/30 text-slate-300 border border-slate-500/30',
  EN_ANALISIS: 'bg-amber-600/20 text-amber-400 border border-amber-600/30',
  RESUELTA:    'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30',
}
// Menor índice = más severo. Cualquier prioridad no reconocida cae al final.
const PRIORITY_RANK = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const rank = (p: string) => {
  const i = PRIORITY_RANK.indexOf(p)
  return i === -1 ? PRIORITY_RANK.length : i
}

type Tab = 'escaneos' | 'historial'
type ScanMode = Extract<ScanTargetType, 'ACTIVO' | 'HOST' | 'ENTORNO' | 'GLOBAL'>

const MODE_LABEL: Record<ScanMode, string> = {
  ACTIVO: 'Componente',
  HOST: 'Activo',
  ENTORNO: 'Entorno',
  GLOBAL: 'Global',
}
const EMPTY_RESULT_MESSAGE: Record<ScanMode, string> = {
  ACTIVO: 'No se encontraron vulnerabilidades para este componente.',
  HOST: 'No se encontraron vulnerabilidades para este activo.',
  ENTORNO: 'No se encontraron vulnerabilidades para este entorno.',
  GLOBAL: 'No se encontraron vulnerabilidades en este escaneo.',
}
const NO_SCAN_YET_MESSAGE = 'Todavía no se disparó ningún escaneo. Elegí un objetivo y presioná "Escanear" para ver los resultados acá.'

interface GroupedResult {
  label: string
  count: number
  topPriority: string
}

type GroupField = 'environmentName' | 'asset' | 'componentName'

/** Agrupa por `field` (segun el nivel de la jerarquia) -- ver GroupedVulnerabilityResult. */
function groupVulns(vulns: VulnerabilityAudit[], field: GroupField, fallback: string): GroupedResult[] {
  const map = new Map<string, GroupedResult>()
  for (const v of vulns) {
    const key = v[field] ?? fallback
    const entry = map.get(key) ?? { label: key, count: 0, topPriority: v.priority ?? '' }
    entry.count += 1
    if (rank(v.priority ?? '') < rank(entry.topPriority)) entry.topPriority = v.priority ?? ''
    map.set(key, entry)
  }
  return Array.from(map.values()).sort((a, b) => rank(a.topPriority) - rank(b.topPriority))
}

const GROUP_LEVEL_LABEL: Record<GroupField, string> = { environmentName: 'Entorno', asset: 'Activo', componentName: 'Componente' }
const GROUP_LEVEL_FALLBACK: Record<GroupField, string> = { environmentName: 'Sin entorno', asset: 'Sin activo', componentName: 'Sin componente' }

/** Jerarquia de agrupamiento por modo, de mas general a mas especifico:
 *  ACTIVO (un solo componente) -- sin niveles, detalle directo.
 *  HOST (un activo, varios componentes) -- 1 nivel: Componente.
 *  ENTORNO (un entorno fijo, varios activos) -- 2 niveles: Activo -> Componente.
 *  GLOBAL (varios entornos, cada uno con varios activos) -- 3 niveles:
 *  Entorno -> Activo -> Componente. `path` guarda el valor elegido en cada nivel a
 *  medida que el usuario hace drill-down; cuando path.length llega a levels.length
 *  se muestra el detalle plano de vulnerabilidades ya filtrado por todos los niveles
 *  elegidos. */
function GroupedVulnerabilityResult({ vulns, mode, emptyMessage, vulnColumns }: {
  vulns: VulnerabilityAudit[]
  mode: ScanMode
  emptyMessage: string
  vulnColumns: Column<VulnerabilityAudit>[]
}) {
  const [path, setPath] = useState<string[]>([])
  const levels: GroupField[] = useMemo(() => {
    if (mode === 'HOST') return ['componentName']
    if (mode === 'ENTORNO') return ['asset', 'componentName']
    if (mode === 'GLOBAL') return ['environmentName', 'asset', 'componentName']
    return []
  }, [mode])

  // Si cambia el resultado (otro reporte del historial, o un escaneo nuevo) el
  // drill-down previo ya no es valido -- se vuelve al nivel mas alto.
  useEffect(() => { setPath([]) }, [vulns])

  const filtered = useMemo(
    () => path.reduce((acc, value, i) => acc.filter(v => (v[levels[i]] ?? GROUP_LEVEL_FALLBACK[levels[i]]) === value), vulns),
    [vulns, path, levels]
  )

  const backButton = path.length > 0 && (
    <div className="px-4 py-2 flex items-center justify-between border-b border-surface-600">
      <p className="text-sm font-medium text-white">{path.join(' › ')}</p>
      <button onClick={() => setPath(p => p.slice(0, -1))} className="btn-ghost !py-1">← Volver</button>
    </div>
  )

  if (path.length === levels.length) {
    return (
      <div>
        {backButton}
        <Table columns={vulnColumns} data={filtered} emptyMessage={path.length ? 'Sin resultados' : emptyMessage} pageSize={20} />
      </div>
    )
  }

  const field = levels[path.length]
  const grouped = groupVulns(filtered, field, GROUP_LEVEL_FALLBACK[field])
  const groupedColumns: Column<GroupedResult>[] = [
    { key: 'label', label: GROUP_LEVEL_LABEL[field] },
    { key: 'count', label: 'Vulnerabilidades', render: v => <span className="font-mono text-xs">{String(v)}</span> },
    { key: 'topPriority', label: 'Severidad más alta', render: v => <span className={`badge ${PRIORITY_BADGE[String(v)] ?? ''}`}>{String(v) || 'SIN PRIORIDAD'}</span> },
  ]

  return (
    <div>
      {backButton}
      <Table
        columns={groupedColumns}
        data={grouped}
        emptyMessage={emptyMessage}
        keyField="label"
        onRowClick={row => setPath(p => [...p, row.label])}
      />
    </div>
  )
}

/** Sección desplegable del comparador de escaneos (Nuevas/Persistentes/Resueltas/Cambios
 *  de severidad) -- colapsada por defecto para no tirar las 4 tablas de una. */
function CompareSection({ title, count, colorClass, children }: {
  title: string
  count: number
  colorClass: string
  children: ReactNode
}) {
  return (
    <details className="group">
      <summary className="px-5 py-2 flex items-center justify-between cursor-pointer select-none list-none marker:content-none [&::-webkit-details-marker]:hidden">
        <span className={`text-xs font-semibold uppercase tracking-wider ${colorClass}`}>{title} ({count})</span>
        <ChevronDown size={14} className="text-slate-500 transition-transform group-open:rotate-180" />
      </summary>
      {count === 0
        ? <p className="text-center py-6 text-sm text-slate-500">Sin novedades.</p>
        : children}
    </details>
  )
}

export default function Scans() {
  const { user } = useAuth()
  const canScan = user?.role === 'ADMIN' || user?.role === 'SECURITY_ANALYST'

  const [tab, setTab] = useState<Tab>('escaneos')
  const [components, setComponents] = useState<SoftwareComponent[]>([])
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [assets, setAssets] = useState<Asset[]>([])

  useEffect(() => {
    softwareComponentApi.getAll().then(r => setComponents(r.data)).catch(() => toast.error('Error al cargar componentes'))
    environmentApi.getAll().then(r => setEnvironments(r.data)).catch(() => toast.error('Error al cargar entornos'))
    assetApi.getAll().then(r => setAssets(r.data)).catch(() => toast.error('Error al cargar activos'))
  }, [])

  // ── Tab "Escaneos" ────────────────────────────────────────────────────────
  const [scanMode, setScanMode] = useState<ScanMode>('ACTIVO')
  const [componentId, setComponentId] = useState<number | ''>('')
  const [hostAssetId, setHostAssetId] = useState<number | ''>('')
  const [envId, setEnvId] = useState<number | ''>('')
  const [triggering, setTriggering] = useState(false)
  const [resultLoading, setResultLoading] = useState(false)
  const [scanResult, setScanResult] = useState<VulnerabilityAudit[] | null>(null)
  const [resultMode, setResultMode] = useState<ScanMode | null>(null)
  const poll = useScanPolling()

  const canLaunch =
    (scanMode === 'ACTIVO' && componentId !== '') ||
    (scanMode === 'HOST' && hostAssetId !== '') ||
    (scanMode === 'ENTORNO' && envId !== '') ||
    scanMode === 'GLOBAL'

  const clearScanFilters = () => {
    setComponentId('')
    setHostAssetId('')
    setEnvId('')
    setScanResult(null)
    setResultMode(null)
    poll.stop()
  }

  const handleScan = async () => {
    if (!canLaunch) return
    setTriggering(true)
    setScanResult(null)
    const baselineAt = new Date().toISOString()
    let targetName = 'TODOS'

    try {
      if (scanMode === 'ACTIVO') {
        const component = components.find(c => c.id === componentId)
        if (!component) return
        targetName = component.name
        await softwareComponentApi.triggerScan(component.id)
      } else if (scanMode === 'HOST') {
        const asset = assets.find(a => a.id === hostAssetId)
        if (!asset) return
        targetName = asset.name
        await assetApi.triggerScan(asset.id)
      } else if (scanMode === 'ENTORNO') {
        const env = environments.find(e => e.id === envId)
        if (!env) return
        targetName = env.name
        await scanApi.triggerEnvironment(env.id)
      } else {
        await scanApi.triggerGlobal()
      }
      toast(`Escaneando ${MODE_LABEL[scanMode].toLowerCase()}…`)

      poll.start(scanMode, targetName, async () => {
        setResultLoading(true)
        setResultMode(scanMode)
        try {
          const { data } = await vulnApi.scanResult({
            since: baselineAt,
            assetId: scanMode === 'ACTIVO' ? Number(componentId) : undefined,
            environmentId: scanMode === 'ENTORNO' ? Number(envId) : undefined,
            hostAssetId: scanMode === 'HOST' ? Number(hostAssetId) : undefined,
          })
          setScanResult(data)
          if (data.length === 0) {
            toast(EMPTY_RESULT_MESSAGE[scanMode], { icon: 'ℹ️' })
          } else {
            toast.success('Escaneo completo')
          }
        } catch {
          toast.error('Error al cargar el resultado del escaneo')
        } finally {
          setResultLoading(false)
        }
      }, () => {
        toast.error(`El escaneo de ${MODE_LABEL[scanMode].toLowerCase()} no respondió a tiempo. Puede seguir corriendo en segundo plano; revisá el Historial más tarde.`)
      })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al disparar el escaneo')
    } finally {
      setTriggering(false)
    }
  }

  const vulnColumns: Column<VulnerabilityAudit>[] = [
    { key: 'cveId', label: 'CVE / GHSA', render: (_v, row) => <span className="font-mono text-xs">{row.cveId || row.ghsaId || 'Sin identificador'}</span> },
    { key: 'cvss', label: 'CVSS', render: v => <span className="font-mono text-xs">{v ? String(v) : '—'}</span> },
    { key: 'priority', label: 'Prioridad', render: v => <span className={`badge ${PRIORITY_BADGE[String(v)] ?? ''}`}>{String(v) || 'SIN PRIORIDAD'}</span> },
    { key: 'status', label: 'Estado', render: v => <span className={`badge ${STATUS_BADGE[String(v)] ?? ''}`}>{String(v)}</span> },
    { key: 'detectedAt', label: 'Detectado', render: v => new Date(String(v)).toLocaleString('es-AR') },
  ]

  // ── Tab "Historial" ──────────────────────────────────────────────────────
  const HISTORY_PAGE_SIZE = 20
  const [histFrom, setHistFrom] = useState('')
  const [histTo, setHistTo] = useState('')
  const [histType, setHistType] = useState<'' | ScanMode>('')
  const [histTarget, setHistTarget] = useState('')
  const [histCode, setHistCode] = useState('')
  const [history, setHistory] = useState<ScanReport[]>([])
  const [historyTotal, setHistoryTotal] = useState(0)
  const [histPage, setHistPage] = useState(0)
  const [loadingHistory, setLoadingHistory] = useState(false)

  const historyFilters = useCallback((): Omit<Parameters<typeof scanApi.history>[0], 'page' | 'size'> => ({
    targetType: histType || undefined,
    targetName: histTarget || undefined,
    publicCode: histCode.trim() || undefined,
    from: histFrom ? new Date(histFrom).toISOString() : undefined,
    to:   histTo   ? new Date(histTo + 'T23:59:59').toISOString() : undefined,
  }), [histType, histTarget, histCode, histFrom, histTo])

  const fetchHistory = useCallback((filters: Omit<Parameters<typeof scanApi.history>[0], 'page' | 'size'>, page: number) => {
    setLoadingHistory(true)
    scanApi.history({ ...filters, page, size: HISTORY_PAGE_SIZE })
      .then(r => { setHistory(r.data.content); setHistoryTotal(r.data.totalElements); setHistPage(page) })
      .catch(() => toast.error('Error al cargar el historial'))
      .finally(() => setLoadingHistory(false))
  }, [])

  // "Buscar"/"Recargar"/entrar a la pestaña siempre vuelven a la primera página --
  // el paginado en sí usa handleHistoryPageChange, que mantiene los filtros actuales.
  const loadHistory = useCallback(() => {
    fetchHistory(historyFilters(), 0)
  }, [fetchHistory, historyFilters])

  const handleHistoryPageChange = (page: number) => fetchHistory(historyFilters(), page)

  // Los filtros se aplican solo al presionar "Buscar" (o "Recargar"), no en cada
  // cambio -- por eso este efecto depende únicamente de `tab`, no de `loadHistory`.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (tab === 'historial') loadHistory() }, [tab])

  const clearHistoryFilters = () => {
    setHistFrom(''); setHistTo(''); setHistType(''); setHistTarget(''); setHistCode('')
    fetchHistory({}, 0)
  }

  const [selectedReportId, setSelectedReportId] = useState<number | null>(null)
  const [reportVulns, setReportVulns] = useState<VulnerabilityAudit[] | null>(null)
  const [loadingReportVulns, setLoadingReportVulns] = useState(false)
  const selectedReport = history.find(r => r.id === selectedReportId) ?? null

  const closeReport = () => {
    setSelectedReportId(null)
    setReportVulns(null)
  }

  const handleSelectReport = (report: ScanReport) => {
    if (selectedReportId === report.id) {
      closeReport()
      return
    }
    setSelectedReportId(report.id)
    setReportVulns(null)
    setLoadingReportVulns(true)
    scanApi.reportVulnerabilities(report.id)
      .then(r => setReportVulns(r.data))
      .catch(() => toast.error('Error al cargar las vulnerabilidades de este escaneo'))
      .finally(() => setLoadingReportVulns(false))
  }

  // Comparación entre dos escaneos (Etapa 5 de trazabilidad) -- usa su propia lista
  // de opciones (independiente de `history`, que ahora solo trae la página visible
  // de la tabla) para poder elegir entre más escaneos de los que entran en una página.
  const [compareModalOpen, setCompareModalOpen] = useState(false)
  const [compareOptions, setCompareOptions] = useState<ScanReport[]>([])
  const [compareAId, setCompareAId] = useState<number | ''>('')
  const [compareBId, setCompareBId] = useState<number | ''>('')
  const [comparing, setComparing] = useState(false)
  const [comparison, setComparison] = useState<ScanComparison | null>(null)

  const scanOptionLabel = (r: ScanReport) =>
    `${r.publicCode} · ${new Date(r.executedAt).toLocaleString('es-AR')} · ${MODE_LABEL[r.targetType as ScanMode] ?? r.targetType}${r.targetName !== 'TODOS' ? ` — ${r.targetName}` : ''}`

  const openCompareModal = () => {
    setCompareModalOpen(true)
    scanApi.history({ ...historyFilters(), page: 0, size: 100 })
      .then(r => setCompareOptions(r.data.content))
      .catch(() => toast.error('Error al cargar los escaneos para comparar'))
  }

  const closeCompareModal = () => {
    setCompareModalOpen(false)
    setCompareAId('')
    setCompareBId('')
    setComparison(null)
  }

  const backToCompareSelection = () => setComparison(null)

  const [exportingReport, setExportingReport] = useState(false)
  const exportSelectedReport = async () => {
    if (!selectedReport) return
    setExportingReport(true)
    try {
      const { data } = await reportApi.scan(selectedReport.id)
      downloadBlob(data, `informe-escaneo-${selectedReport.id}.pdf`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al generar el informe')
    } finally {
      setExportingReport(false)
    }
  }

  const [exportingComparison, setExportingComparison] = useState(false)
  const exportComparison = async () => {
    if (!comparison) return
    setExportingComparison(true)
    try {
      const { data } = await reportApi.comparison(comparison.scanAId, comparison.scanBId)
      downloadBlob(data, `informe-comparativo-${comparison.scanAId}-${comparison.scanBId}.pdf`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al generar el informe')
    } finally {
      setExportingComparison(false)
    }
  }

  const handleCompare = () => {
    if (compareAId === '' || compareBId === '' || compareAId === compareBId) return
    setComparing(true)
    scanApi.compare(Number(compareAId), Number(compareBId))
      .then(r => setComparison(r.data))
      .catch(() => toast.error('Error al comparar los escaneos'))
      .finally(() => setComparing(false))
  }

  const severityChangeColumns: Column<ScanComparison['severityChanges'][number]>[] = [
    { key: 'cveId', label: 'CVE / GHSA', render: v => <span className="font-mono text-xs">{String(v)}</span> },
    { key: 'priorityBefore', label: 'Prioridad antes', render: v => <span className={`badge ${PRIORITY_BADGE[String(v)] ?? ''}`}>{String(v) || 'SIN PRIORIDAD'}</span> },
    { key: 'priorityAfter', label: 'Prioridad después', render: v => <span className={`badge ${PRIORITY_BADGE[String(v)] ?? ''}`}>{String(v) || 'SIN PRIORIDAD'}</span> },
  ]

  const historyColumns: Column<ScanReport>[] = [
    { key: 'publicCode', label: 'Código', render: v => <span className="font-mono text-xs text-slate-300">{String(v)}</span> },
    { key: 'executedAt', label: 'Fecha', render: v => new Date(String(v)).toLocaleString('es-AR') },
    { key: 'targetType', label: 'Tipo', render: v => <span className="badge bg-slate-700 text-slate-300">{v ? MODE_LABEL[v as ScanMode] ?? String(v) : '—'}</span> },
    { key: 'targetName', label: 'Objetivo' },
    { key: 'totalDetected', label: 'Total', render: v => <span className="font-mono text-xs">{String(v ?? 0)}</span> },
    { key: 'criticals', label: 'Crít.', render: v => <span className="font-mono text-xs text-[#bd1e1e]">{String(v ?? 0)}</span> },
    { key: 'highs', label: 'Altas', render: v => <span className="font-mono text-xs text-[#f95c5c]">{String(v ?? 0)}</span> },
    { key: 'mediums', label: 'Medias', render: v => <span className="font-mono text-xs text-yellow-300">{String(v ?? 0)}</span> },
    { key: 'lows', label: 'Bajas', render: v => <span className="font-mono text-xs text-[#44a024]">{String(v ?? 0)}</span> },
    { key: 'systemStatus', label: 'Estado' },
  ]

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Centro de Escaneos"
        subtitle="Disparar escaneos y revisar el historial de resultados"
      />

      <div className="flex gap-1 mb-5 bg-surface-800 border border-surface-600 rounded-xl p-1 w-fit">
        {([
          { key: 'escaneos', label: 'Escaneos' },
          { key: 'historial', label: 'Historial' },
        ] as { key: Tab; label: string }[]).map(t => (
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

      {tab === 'escaneos' && (
        <>
          {canScan && (
            <div className="card mb-6 w-fit">
              <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Nuevo escaneo</p>

              <div className="flex items-center gap-3">
                <div className="flex gap-1 bg-surface-900 border border-surface-600 rounded-lg p-1 w-fit">
                  {(['ACTIVO', 'HOST', 'ENTORNO', 'GLOBAL'] as ScanMode[]).map(m => (
                    <button
                      key={m}
                      onClick={() => setScanMode(m)}
                      className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all
                        ${scanMode === m ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                      {MODE_LABEL[m]}
                    </button>
                  ))}
                </div>

                {scanMode === 'ACTIVO' && (
                  <select className="input w-64" value={componentId} onChange={e => setComponentId(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">Seleccionar componente…</option>
                    {components.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
                {scanMode === 'HOST' && (
                  <select className="input w-64" value={hostAssetId} onChange={e => setHostAssetId(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">Seleccionar activo…</option>
                    {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                )}
                {scanMode === 'ENTORNO' && (
                  <select className="input w-64" value={envId} onChange={e => setEnvId(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">Seleccionar entorno…</option>
                    {environments.map(env => <option key={env.id} value={env.id}>{env.name}</option>)}
                  </select>
                )}
                {scanMode === 'GLOBAL' && (
                  <p className="text-xs text-slate-500 w-64">Todos los entornos, todos los activos.</p>
                )}

                <button onClick={clearScanFilters} className="btn-ghost">Limpiar</button>

                <button
                  onClick={handleScan}
                  disabled={!canLaunch || triggering || poll.state === 'running'}
                  className="btn-primary"
                >
                  <ScanLine size={14} />
                  {triggering || poll.state === 'running' ? 'Escaneando…' : 'Escanear'}
                </button>
              </div>
            </div>
          )}

          <div className="card p-0 overflow-hidden rounded-xl border border-surface-600">
            <div className="px-4 py-3 border-b border-surface-600">
              <p className="text-sm font-medium text-white">
                Resultado del escaneo · {MODE_LABEL[resultMode ?? scanMode]}
              </p>
            </div>
            {resultLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-10 w-full rounded-lg" />)}
              </div>
            ) : (
              <GroupedVulnerabilityResult
                vulns={scanResult ?? []}
                mode={resultMode ?? scanMode}
                emptyMessage={resultMode ? EMPTY_RESULT_MESSAGE[resultMode] : NO_SCAN_YET_MESSAGE}
                vulnColumns={vulnColumns}
              />
            )}
          </div>
        </>
      )}

      {tab === 'historial' && (
        <>
          <div className="card p-3 mb-4 w-fit">
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-40">
                <label className="block text-[11px] text-slate-400 mb-0.5">Código</label>
                <input
                  type="text"
                  className="input !py-1.5"
                  placeholder="ej: SCN-2026-000056"
                  value={histCode}
                  onChange={e => setHistCode(e.target.value)}
                />
              </div>
              <div className="w-36">
                <label className="block text-[11px] text-slate-400 mb-0.5">Desde</label>
                <input type="date" className="input !py-1.5" value={histFrom} onChange={e => setHistFrom(e.target.value)} />
              </div>
              <div className="w-36">
                <label className="block text-[11px] text-slate-400 mb-0.5">Hasta</label>
                <input type="date" className="input !py-1.5" value={histTo} onChange={e => setHistTo(e.target.value)} />
              </div>
              <div className="w-40">
                <label className="block text-[11px] text-slate-400 mb-0.5">Tipo</label>
                <select
                  className="input !py-1.5"
                  value={histType}
                  onChange={e => { setHistType(e.target.value as '' | ScanMode); setHistTarget('') }}
                >
                  <option value="">Todos</option>
                  <option value="ACTIVO">Componente</option>
                  <option value="HOST">Activo</option>
                  <option value="ENTORNO">Entorno</option>
                  <option value="GLOBAL">Global</option>
                </select>
              </div>
              <div className="w-48">
                <label className="block text-[11px] text-slate-400 mb-0.5">Objetivo</label>
                <select
                  className="input !py-1.5"
                  value={histTarget}
                  onChange={e => setHistTarget(e.target.value)}
                  disabled={histType !== 'ACTIVO' && histType !== 'HOST' && histType !== 'ENTORNO'}
                >
                  <option value="">Todos</option>
                  {histType === 'ACTIVO' && components.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  {histType === 'HOST' && assets.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                  {histType === 'ENTORNO' && environments.map(env => <option key={env.id} value={env.name}>{env.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={clearHistoryFilters} className="btn-ghost !py-1.5">Limpiar</button>
                <button onClick={loadHistory} className="btn-primary !py-1.5"><Search size={14} /> Buscar</button>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-slate-500">{historyTotal} escaneo(s)</p>
            <div className="flex gap-2">
              {historyTotal >= 2 && (
                <button onClick={openCompareModal} className="btn-ghost">
                  <GitCompare size={13} /> Comparar escaneos
                </button>
              )}
              <button onClick={loadHistory} disabled={loadingHistory} className="btn-ghost">
                <RefreshCw size={13} className={loadingHistory ? 'animate-spin' : ''} /> Recargar
              </button>
            </div>
          </div>
          <div className="card p-0 overflow-hidden rounded-xl border border-surface-600 mb-6">
            <Table
              columns={historyColumns}
              data={history}
              loading={loadingHistory}
              emptyMessage="No hay escaneos registrados para este filtro"
              onRowClick={handleSelectReport}
              selectedKey={selectedReportId}
              pageSize={HISTORY_PAGE_SIZE}
              page={histPage}
              totalItems={historyTotal}
              onPageChange={handleHistoryPageChange}
            />
          </div>

          <Modal
            title="Comparar escaneos"
            open={compareModalOpen}
            onClose={closeCompareModal}
            size={comparison ? 'xl' : 'md'}
          >
            {!comparison ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Escaneo A</label>
                  <select className="input w-full" value={compareAId} onChange={e => setCompareAId(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">Elegir escaneo…</option>
                    {compareOptions.map(r => <option key={r.id} value={r.id}>{scanOptionLabel(r)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Escaneo B</label>
                  <select className="input w-full" value={compareBId} onChange={e => setCompareBId(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">Elegir escaneo…</option>
                    {compareOptions.map(r => <option key={r.id} value={r.id}>{scanOptionLabel(r)}</option>)}
                  </select>
                </div>
                {compareAId !== '' && compareAId === compareBId && (
                  <p className="text-xs text-red-400">Elegí dos escaneos distintos.</p>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={closeCompareModal} className="btn-ghost">Cancelar</button>
                  <button
                    onClick={handleCompare}
                    disabled={compareAId === '' || compareBId === '' || compareAId === compareBId || comparing}
                    className="btn-primary"
                  >
                    {comparing ? 'Comparando…' : 'Comparar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="-m-5 space-y-6">
                <div className="px-5 pt-1 flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    A: {scanOptionLabel(compareOptions.find(r => r.id === comparison.scanAId)!)} → B: {scanOptionLabel(compareOptions.find(r => r.id === comparison.scanBId)!)}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={exportComparison} disabled={exportingComparison} className="btn-ghost !py-1">
                      <Download size={12} /> {exportingComparison ? 'Generando…' : 'Exportar PDF'}
                    </button>
                    <button onClick={backToCompareSelection} className="btn-ghost !py-1">Elegir otros</button>
                  </div>
                </div>

                <CompareSection title="Nuevas en B" count={comparison.newInB.length} colorClass="text-emerald-400">
                  <Table columns={vulnColumns} data={comparison.newInB} emptyMessage="Sin resultados" />
                </CompareSection>

                <CompareSection title="Persistentes" count={comparison.persisting.length} colorClass="text-slate-300">
                  <Table columns={vulnColumns} data={comparison.persisting} emptyMessage="Sin resultados" />
                </CompareSection>

                <CompareSection title="Resueltas desde A" count={comparison.resolvedSinceA.length} colorClass="text-sky-400">
                  <Table columns={vulnColumns} data={comparison.resolvedSinceA} emptyMessage="Sin resultados" />
                </CompareSection>

                <CompareSection title="Cambios de severidad" count={comparison.severityChanges.length} colorClass="text-amber-400">
                  <Table columns={severityChangeColumns} data={comparison.severityChanges} emptyMessage="Sin resultados" keyField="cveId" />
                </CompareSection>
              </div>
            )}
          </Modal>

          <Modal
            title={selectedReport
              ? `${selectedReport.publicCode} · ${MODE_LABEL[selectedReport.targetType as ScanMode] ?? selectedReport.targetType}${selectedReport.targetName !== 'TODOS' ? ` — ${selectedReport.targetName}` : ''}`
              : 'Vulnerabilidades del escaneo'}
            open={!!selectedReport}
            onClose={closeReport}
            size="lg"
          >
            {selectedReport && (
              <div className="-m-5">
                <div className="px-5 pt-1 pb-3 flex items-center justify-between">
                  <p className="text-xs text-slate-500">{new Date(selectedReport.executedAt).toLocaleString('es-AR')}</p>
                  <button onClick={exportSelectedReport} disabled={exportingReport} className="btn-ghost !py-1">
                    <Download size={12} /> {exportingReport ? 'Generando…' : 'Exportar PDF'}
                  </button>
                </div>
                {loadingReportVulns ? (
                  <div className="px-5 pb-5 space-y-2">
                    {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-10 w-full rounded-lg" />)}
                  </div>
                ) : (
                  <GroupedVulnerabilityResult
                    vulns={reportVulns ?? []}
                    mode={(selectedReport.targetType as ScanMode) ?? 'ACTIVO'}
                    emptyMessage={EMPTY_RESULT_MESSAGE[(selectedReport.targetType as ScanMode) ?? 'ACTIVO']}
                    vulnColumns={vulnColumns}
                  />
                )}
              </div>
            )}
          </Modal>
        </>
      )}
    </div>
  )
}
