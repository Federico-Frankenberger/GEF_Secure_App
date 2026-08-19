import { useEffect, useState, useCallback, useMemo } from 'react'
import { GitCompare, RefreshCw, ScanLine, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { softwareComponentApi, environmentApi, assetApi, vulnApi, scanApi } from '../services/api'
import type { SoftwareComponent, Environment, Asset, VulnerabilityAudit, ScanReport, ScanComparison, ScanTargetType } from '../types'
import PageHeader from '../components/PageHeader'
import Table, { Column } from '../components/Table'
import Modal from '../components/Modal'
import { useScanPolling } from '../hooks/useScanPolling'
import { useAuth } from '../contexts/AuthContext'

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
  assetId: number | null
  asset: string
  count: number
  topPriority: string
}

function groupByAsset(vulns: VulnerabilityAudit[]): GroupedResult[] {
  const map = new Map<string, GroupedResult>()
  for (const v of vulns) {
    const key = v.asset ?? 'Sin activo'
    const entry = map.get(key) ?? { assetId: v.assetId, asset: key, count: 0, topPriority: v.priority ?? '' }
    entry.count += 1
    if (rank(v.priority ?? '') < rank(entry.topPriority)) entry.topPriority = v.priority ?? ''
    map.set(key, entry)
  }
  return Array.from(map.values()).sort((a, b) => rank(a.topPriority) - rank(b.topPriority))
}

const COMPONENT_NAME_COLUMN: Column<VulnerabilityAudit> = { key: 'componentName', label: 'Componente' }

/** GLOBAL/ENTORNO: resumen agrupado por activo, con drill-down al detalle de un activo
 *  puntual (misma tabla que ya se usa para ACTIVO) al hacer click en una fila. ACTIVO
 *  muestra el detalle directo, sin resumen intermedio. HOST (escaneo por Activo/host
 *  completo) también muestra el detalle directo -- agrupar no aporta nada porque ya está
 *  acotado a 1 solo host -- pero con una columna extra "Componente" al frente, porque a
 *  diferencia de ACTIVO puede haber varios componentes distintos en el mismo resultado. */
function GroupedVulnerabilityResult({ vulns, mode, emptyMessage, vulnColumns, groupedColumns }: {
  vulns: VulnerabilityAudit[]
  mode: ScanMode
  emptyMessage: string
  vulnColumns: Column<VulnerabilityAudit>[]
  groupedColumns: Column<GroupedResult>[]
}) {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null)
  const grouped = useMemo(() => groupByAsset(vulns), [vulns])

  if (mode === 'ACTIVO' || mode === 'HOST') {
    const columns = mode === 'HOST' ? [COMPONENT_NAME_COLUMN, ...vulnColumns] : vulnColumns
    return <Table columns={columns} data={vulns} emptyMessage={emptyMessage} />
  }
  if (selectedAsset !== null) {
    const detail = vulns.filter(v => (v.asset ?? 'Sin activo') === selectedAsset)
    return (
      <div>
        <div className="px-4 py-2 flex items-center justify-between border-b border-surface-600">
          <p className="text-sm font-medium text-white">{selectedAsset}</p>
          <button onClick={() => setSelectedAsset(null)} className="btn-ghost !py-1">← Volver al resumen</button>
        </div>
        <Table columns={vulnColumns} data={detail} emptyMessage="Sin resultados" />
      </div>
    )
  }
  return (
    <Table
      columns={groupedColumns}
      data={grouped}
      emptyMessage={emptyMessage}
      keyField="asset"
      onRowClick={row => setSelectedAsset(row.asset)}
    />
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

  const groupedColumns: Column<GroupedResult>[] = [
    { key: 'asset', label: 'Activo' },
    { key: 'count', label: 'Vulnerabilidades', render: v => <span className="font-mono text-xs">{String(v)}</span> },
    { key: 'topPriority', label: 'Severidad más alta', render: v => <span className={`badge ${PRIORITY_BADGE[String(v)] ?? ''}`}>{String(v) || 'SIN PRIORIDAD'}</span> },
  ]

  // ── Tab "Historial" ──────────────────────────────────────────────────────
  const [histFrom, setHistFrom] = useState('')
  const [histTo, setHistTo] = useState('')
  const [histType, setHistType] = useState<'' | ScanMode>('')
  const [histTarget, setHistTarget] = useState('')
  const [history, setHistory] = useState<ScanReport[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const loadHistory = useCallback(() => {
    setLoadingHistory(true)
    scanApi.history({
      targetType: histType || undefined,
      targetName: histTarget || undefined,
      from: histFrom ? new Date(histFrom).toISOString() : undefined,
      to:   histTo   ? new Date(histTo + 'T23:59:59').toISOString() : undefined,
    })
      .then(r => setHistory(r.data))
      .catch(() => toast.error('Error al cargar el historial'))
      .finally(() => setLoadingHistory(false))
  }, [histType, histTarget, histFrom, histTo])

  useEffect(() => { if (tab === 'historial') loadHistory() }, [tab, loadHistory])

  const clearHistoryFilters = () => {
    setHistFrom(''); setHistTo(''); setHistType(''); setHistTarget('')
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

  // Comparación entre dos escaneos (Etapa 5 de trazabilidad)
  const [compareModalOpen, setCompareModalOpen] = useState(false)
  const [compareAId, setCompareAId] = useState<number | ''>('')
  const [compareBId, setCompareBId] = useState<number | ''>('')
  const [comparing, setComparing] = useState(false)
  const [comparison, setComparison] = useState<ScanComparison | null>(null)

  const scanOptionLabel = (r: ScanReport) =>
    `${r.publicCode} · ${new Date(r.executedAt).toLocaleString('es-AR')} · ${MODE_LABEL[r.targetType as ScanMode] ?? r.targetType}${r.targetName !== 'TODOS' ? ` — ${r.targetName}` : ''}`

  const openCompareModal = () => setCompareModalOpen(true)

  const closeCompareModal = () => {
    setCompareModalOpen(false)
    setCompareAId('')
    setCompareBId('')
    setComparison(null)
  }

  const backToCompareSelection = () => setComparison(null)

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
                groupedColumns={groupedColumns}
              />
            )}
          </div>
        </>
      )}

      {tab === 'historial' && (
        <>
          <div className="card p-3 mb-4 w-fit">
            <div className="flex flex-wrap items-end gap-2">
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
            <p className="text-sm text-slate-500">{history.length} escaneo(s)</p>
            <div className="flex gap-2">
              {history.length >= 2 && (
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
                    {history.map(r => <option key={r.id} value={r.id}>{scanOptionLabel(r)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Escaneo B</label>
                  <select className="input w-full" value={compareBId} onChange={e => setCompareBId(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">Elegir escaneo…</option>
                    {history.map(r => <option key={r.id} value={r.id}>{scanOptionLabel(r)}</option>)}
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
                    A: {scanOptionLabel(history.find(r => r.id === comparison.scanAId)!)} → B: {scanOptionLabel(history.find(r => r.id === comparison.scanBId)!)}
                  </p>
                  <button onClick={backToCompareSelection} className="btn-ghost !py-1">Elegir otros</button>
                </div>

                <div>
                  <p className="px-5 pb-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">Nuevas en B ({comparison.newInB.length})</p>
                  {comparison.newInB.length === 0
                    ? <p className="text-center py-6 text-sm text-slate-500">Sin novedades.</p>
                    : <Table columns={vulnColumns} data={comparison.newInB} emptyMessage="Sin resultados" />}
                </div>

                <div>
                  <p className="px-5 pb-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">Persistentes ({comparison.persisting.length})</p>
                  {comparison.persisting.length === 0
                    ? <p className="text-center py-6 text-sm text-slate-500">Sin novedades.</p>
                    : <Table columns={vulnColumns} data={comparison.persisting} emptyMessage="Sin resultados" />}
                </div>

                <div>
                  <p className="px-5 pb-2 text-xs font-semibold text-sky-400 uppercase tracking-wider">Resueltas desde A ({comparison.resolvedSinceA.length})</p>
                  {comparison.resolvedSinceA.length === 0
                    ? <p className="text-center py-6 text-sm text-slate-500">Sin novedades.</p>
                    : <Table columns={vulnColumns} data={comparison.resolvedSinceA} emptyMessage="Sin resultados" />}
                </div>

                <div>
                  <p className="px-5 pb-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">Cambios de severidad ({comparison.severityChanges.length})</p>
                  {comparison.severityChanges.length === 0
                    ? <p className="text-center py-6 text-sm text-slate-500">Sin novedades.</p>
                    : <Table columns={severityChangeColumns} data={comparison.severityChanges} emptyMessage="Sin resultados" keyField="cveId" />}
                </div>
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
                <p className="px-5 pt-1 pb-3 text-xs text-slate-500">{new Date(selectedReport.executedAt).toLocaleString('es-AR')}</p>
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
                    groupedColumns={groupedColumns}
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
