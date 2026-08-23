import { useEffect, useState, useCallback } from 'react'
import { Search, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { vulnApi, assetApi, softwareComponentApi, userApi } from '../../services/api'
import type { VulnerabilityAudit, Asset, SoftwareComponent, User, SlaState, VulnerabilitySearchParams } from '../../types'
import Table, { Column } from '../Table'
import { useAuth } from '../../contexts/AuthContext'
import { PRIORITY_BADGE, PRIORITY_LABEL, STATUS_BADGE } from '../../constants/badges'

const PAGE_SIZE = 20

const SLA_BADGE: Record<SlaState, string> = {
  VENCIDO:  'bg-severity-critical/20 text-severity-critical border border-severity-critical/40',
  PROXIMO:  'bg-severity-medium/15 text-severity-medium border border-severity-medium/30',
  EN_PLAZO: 'bg-severity-low/15 text-severity-low border border-severity-low/30',
}
const SLA_LABEL: Record<SlaState, string> = {
  VENCIDO: 'Vencido', PROXIMO: 'Próximo a vencer', EN_PLAZO: 'En plazo',
}

function slaStateOf(dueDate: string | null | undefined): SlaState | null {
  if (!dueDate) return null
  const days = (new Date(dueDate).getTime() - Date.now()) / 86_400_000
  if (days < 0) return 'VENCIDO'
  if (days < 7) return 'PROXIMO'
  return 'EN_PLAZO'
}

/** Vista "Listado" del rediseño de Vulnerabilidades (docs/bitacora/23-08-26): tabla
 *  profesional con filtros/orden/paginación server-side -- reemplaza el patrón
 *  findAll()+filtrar-en-el-navegador que usaba el Kanban (P-17 del prompt: "evitar
 *  descargar todas las vulnerabilidades al frontend"). */
export default function VulnerabilidadesListado({ onOpenDetail, refreshTick }: {
  onOpenDetail: (vuln: VulnerabilityAudit) => void
  refreshTick: number
}) {
  const { user } = useAuth()
  // GET /api/users solo lo permite el backend a ADMIN y SECURITY_ANALYST (mismo criterio
  // que el filtro de responsable del Kanban) -- sin esto, ASSET_OWNER/AUDITOR verían un
  // select vacío en silencio cada vez que la llamada les devuelve 403.
  const canListUsers = user?.role === 'ADMIN' || user?.role === 'SECURITY_ANALYST'

  const [assets, setAssets] = useState<Asset[]>([])
  const [components, setComponents] = useState<SoftwareComponent[]>([])
  const [users, setUsers] = useState<User[]>([])
  useEffect(() => {
    assetApi.getAll().then(r => setAssets(r.data)).catch(() => {})
    softwareComponentApi.getAll().then(r => setComponents(r.data)).catch(() => {})
    if (canListUsers) userApi.getAll().then(r => setUsers(r.data)).catch(() => {})
  }, [canListUsers])

  const [priority, setPriority] = useState('')
  const [triageStatus, setTriageStatus] = useState('')
  const [assetId, setAssetId] = useState<number | ''>('')
  const [softwareComponentId, setSoftwareComponentId] = useState<number | ''>('')
  const [assignedToUserId, setAssignedToUserId] = useState<number | ''>('')
  const [exploited, setExploited] = useState('')
  const [cisaKev, setCisaKev] = useState('')
  const [slaState, setSlaState] = useState('')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<NonNullable<VulnerabilitySearchParams['sortBy']>>('priority')

  const [rows, setRows] = useState<VulnerabilityAudit[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchPage = useCallback((targetPage: number) => {
    setLoading(true)
    vulnApi.search({
      priority: priority || undefined,
      triageStatus: triageStatus || undefined,
      assetId: assetId === '' ? undefined : Number(assetId),
      softwareComponentId: softwareComponentId === '' ? undefined : Number(softwareComponentId),
      assignedToUserId: assignedToUserId === '' ? undefined : Number(assignedToUserId),
      exploited: exploited === '' ? undefined : exploited === 'true',
      cisaKev: cisaKev === '' ? undefined : cisaKev === 'true',
      slaState: (slaState || undefined) as SlaState | undefined,
      search: search.trim() || undefined,
      sortBy,
      page: targetPage,
      size: PAGE_SIZE,
    })
      .then(r => { setRows(r.data.content); setTotal(r.data.totalElements); setPage(targetPage) })
      .catch(() => toast.error('Error al cargar el listado de vulnerabilidades'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priority, triageStatus, assetId, softwareComponentId, assignedToUserId, exploited, cisaKev, slaState, search, sortBy, refreshTick])

  // "Buscar"/cambio de filtro siempre vuelve a la primera página -- por eso el efecto
  // depende de los filtros (via fetchPage) y no de `page` directamente. `refreshTick`
  // también dispara `fetchPage` (está en sus deps), pero a propósito NO fuerza un
  // remount del componente (antes se usaba `key={refreshTick}` desde el padre, que
  // reseteaba todos los filtros/orden a los valores por defecto cada vez que se
  // guardaba algo desde el detalle -- este efecto los conserva).
  useEffect(() => { fetchPage(0) }, [fetchPage])

  const clearFilters = () => {
    setPriority(''); setTriageStatus(''); setAssetId(''); setSoftwareComponentId('')
    setAssignedToUserId(''); setExploited(''); setCisaKev(''); setSlaState(''); setSearch(''); setSortBy('priority')
  }
  const hasFilters = priority || triageStatus || assetId !== '' || softwareComponentId !== ''
    || assignedToUserId !== '' || exploited || cisaKev || slaState || search

  const columns: Column<VulnerabilityAudit>[] = [
    { key: 'cveId', label: 'CVE / GHSA', render: (_v, row) => <span className="font-mono text-xs text-white">{row.cveId || row.ghsaId || 'Sin identificador'}</span> },
    { key: 'asset', label: 'Activo', render: (_v, row) => <span className="text-slate-300">{row.asset}{row.environmentName ? <span className="text-slate-500"> · {row.environmentName}</span> : null}</span> },
    { key: 'priority', label: 'Severidad', render: v => <span className={`badge ${PRIORITY_BADGE[String(v)] ?? ''}`}>{PRIORITY_LABEL[String(v)] ?? String(v)}</span> },
    { key: 'status', label: 'Estado', render: v => <span className={`badge ${STATUS_BADGE[String(v)] ?? ''}`}>{String(v)}</span> },
    {
      key: 'dueDate', label: 'SLA', render: (v) => {
        const state = slaStateOf(v as string | null)
        return state ? <span className={`badge ${SLA_BADGE[state]}`}>{SLA_LABEL[state]}</span> : <span className="text-slate-600 text-xs">—</span>
      },
    },
    { key: 'detectedAt', label: 'Detectado', render: v => <span className="text-xs text-slate-400">{new Date(String(v)).toLocaleDateString('es-AR')}</span> },
  ]

  return (
    <div className="space-y-4">
      <div className="card p-3 flex flex-wrap items-end gap-2">
        <div className="w-56">
          <label className="block text-[11px] text-slate-400 mb-0.5">Buscar (CVE, activo, software)</label>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input className="input !py-1.5 !pl-7" value={search} onChange={e => setSearch(e.target.value)} placeholder="ej: CVE-2024-..." />
          </div>
        </div>
        <div className="w-36">
          <label className="block text-[11px] text-slate-400 mb-0.5">Severidad</label>
          <select className="input !py-1.5" value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="">Todas</option>
            <option value="CRITICAL">Crítica</option>
            <option value="HIGH">Alta</option>
            <option value="MEDIUM">Media</option>
            <option value="LOW">Baja</option>
          </select>
        </div>
        <div className="w-40">
          <label className="block text-[11px] text-slate-400 mb-0.5">Estado</label>
          <select className="input !py-1.5" value={triageStatus} onChange={e => setTriageStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="DETECTADA">Detectada</option>
            <option value="EN_ANALISIS">En análisis</option>
            <option value="RESUELTA">Resuelta</option>
          </select>
        </div>
        <div className="w-44">
          <label className="block text-[11px] text-slate-400 mb-0.5">Activo</label>
          <select className="input !py-1.5" value={assetId} onChange={e => setAssetId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Todos</option>
            {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div className="w-44">
          <label className="block text-[11px] text-slate-400 mb-0.5">Software</label>
          <select className="input !py-1.5" value={softwareComponentId} onChange={e => setSoftwareComponentId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Todos</option>
            {components.map(c => <option key={c.id} value={c.id}>{c.software} ({c.assetName})</option>)}
          </select>
        </div>
        {canListUsers && (
          <div className="w-44">
            <label className="block text-[11px] text-slate-400 mb-0.5">Responsable</label>
            <select className="input !py-1.5" value={assignedToUserId} onChange={e => setAssignedToUserId(e.target.value ? Number(e.target.value) : '')}>
              <option value="">Todos</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.fullName || u.username}</option>)}
            </select>
          </div>
        )}
        <div className="w-36">
          <label className="block text-[11px] text-slate-400 mb-0.5">SLA</label>
          <select className="input !py-1.5" value={slaState} onChange={e => setSlaState(e.target.value)}>
            <option value="">Todos</option>
            <option value="VENCIDO">Vencido</option>
            <option value="PROXIMO">Próximo a vencer</option>
            <option value="EN_PLAZO">En plazo</option>
          </select>
        </div>
        <div className="w-36">
          <label className="block text-[11px] text-slate-400 mb-0.5">Explotación</label>
          <select className="input !py-1.5" value={exploited} onChange={e => setExploited(e.target.value)}>
            <option value="">Todas</option>
            <option value="true">Conocida</option>
            <option value="false">No conocida</option>
          </select>
        </div>
        <div className="w-36">
          <label className="block text-[11px] text-slate-400 mb-0.5">CISA KEV</label>
          <select className="input !py-1.5" value={cisaKev} onChange={e => setCisaKev(e.target.value)}>
            <option value="">Todas</option>
            <option value="true">En catálogo KEV</option>
            <option value="false">Fuera de KEV</option>
          </select>
        </div>
        <div className="w-40">
          <label className="block text-[11px] text-slate-400 mb-0.5">Ordenar por</label>
          <select className="input !py-1.5" value={sortBy} onChange={e => setSortBy(e.target.value as NonNullable<VulnerabilitySearchParams['sortBy']>)}>
            <option value="priority">Urgencia (severidad)</option>
            <option value="cvss">CVSS</option>
            <option value="due">Vencimiento (SLA)</option>
            <option value="age">Antigüedad</option>
            <option value="recent">Más recientes</option>
          </select>
        </div>
        <div className="flex gap-2">
          {hasFilters && <button onClick={clearFilters} className="btn-ghost !py-1.5">Limpiar</button>}
          <button onClick={() => fetchPage(page)} disabled={loading} className="btn-ghost !py-1.5">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Recargar
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-500">{total} vulnerabilidad(es)</p>

      <div className="card p-0 overflow-hidden border border-surface-600">
        <Table
          columns={columns}
          data={rows}
          loading={loading}
          emptyMessage="No hay vulnerabilidades para este filtro"
          onRowClick={onOpenDetail}
          pageSize={PAGE_SIZE}
          page={page}
          totalItems={total}
          onPageChange={fetchPage}
        />
      </div>
    </div>
  )
}
