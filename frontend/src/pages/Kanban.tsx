import { useEffect, useState, useCallback, useMemo, ChangeEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd'
import { RefreshCw, Filter, CalendarX, ExternalLink, Skull, ShieldCheck, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { vulnApi, userApi, ghsaAdvisoryApi, reportApi } from '../services/api'
import type { VulnerabilityAudit, VulnStatus, User, GhsaAdvisory } from '../types'
import VulnerabilityCard from '../components/VulnerabilityCard'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import VulnerabilidadesResumen from '../components/vulnerabilidades/VulnerabilidadesResumen'
import VulnerabilidadesAnalisis from '../components/vulnerabilidades/VulnerabilidadesAnalisis'
import VulnerabilidadesListado from '../components/vulnerabilidades/VulnerabilidadesListado'
import { useAuth } from '../contexts/AuthContext'
import { downloadBlob } from '../utils/downloadFile'
import { PRIORITY_LABEL } from '../constants/badges'

const COLUMNS: { id: VulnStatus; label: string; color: string }[] = [
  { id: 'DETECTADA',   label: 'Detectadas',  color: 'border-red-500/40    text-red-400'     },
  { id: 'EN_ANALISIS', label: 'En Análisis', color: 'border-amber-500/40  text-amber-400'   },
  { id: 'RESUELTA',    label: 'Resueltas',   color: 'border-emerald-500/40 text-emerald-400' },
]

type Board = Record<VulnStatus, VulnerabilityAudit[]>
type Tab = 'resumen' | 'analisis' | 'listado' | 'kanban'
const TAB_KEYS: Tab[] = ['resumen', 'analisis', 'listado', 'kanban']

/** Rediseño de Vulnerabilidades (docs/bitacora/23-08-26): antes esta sección era
 *  solamente el Kanban. Ahora es un módulo con 4 vistas -- Resumen (riesgo), Análisis
 *  (P2/P3, placeholder por ahora), Listado (investigación/filtrado) y Kanban
 *  (remediación) -- que comparten el mismo detalle de vulnerabilidad (el modal de
 *  edición de abajo, antes exclusivo del Kanban). Misma ruta /kanban y mismo archivo
 *  a propósito -- no se reorganiza la navegación, solo se le agrega profundidad. */
export default function Vulnerabilidades() {
  const { user } = useAuth()
  const isAuditor = user?.role === 'AUDITOR'
  const canListUsers = user?.role === 'ADMIN' || user?.role === 'SECURITY_ANALYST'
  const canDelete = user?.role === 'ADMIN' || user?.role === 'SECURITY_ANALYST'

  // Deep-link desde el Dashboard (docs/bitacora/23-08-26): /kanban?tab=listado&priority=CRITICAL
  // -- solo se lee al montar, no se sincroniza en el otro sentido (cambiar de tab a mano
  // no reescribe la URL, para no complicar el historial de navegación).
  const [searchParams] = useSearchParams()
  const initialTab = (() => {
    const t = searchParams.get('tab')
    return TAB_KEYS.includes(t as Tab) ? (t as Tab) : 'resumen'
  })()
  const [tab, setTab] = useState<Tab>(initialTab)
  const [users, setUsers] = useState<User[]>([])
  useEffect(() => {
    if (canListUsers) userApi.getAll().then(r => setUsers(r.data)).catch(() => {})
  }, [canListUsers])

  // ── Detalle compartido (Resumen/Listado/Kanban abren el mismo modal) ────────────
  const [selected, setSelected] = useState<VulnerabilityAudit | null>(null)
  const [form, setForm] = useState({
    status: '', assignedTo: '', decision: '',
    outcome: '' as '' | 'MITIGADA' | 'NO_APLICA' | 'RIESGO_ACEPTADO',
    mitigationControl: '', justification: '', acceptedBy: '', riskAcceptedUntil: '',
    evidenceLevel: '' as '' | 'E0' | 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6',
    evidenceRef: '',
  })
  const [saving, setSaving] = useState(false)
  const [advisory, setAdvisory] = useState<GhsaAdvisory | null>(null)
  const [loadingAdvisory, setLoadingAdvisory] = useState(false)
  const [advisoryError, setAdvisoryError] = useState(false)
  const [exportingFicha, setExportingFicha] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  // Bump para que el Kanban (con su propio fetch) y las vistas agregadas
  // (Resumen/Listado) se refresquen después de guardar/eliminar desde el detalle,
  // sin acoplar sus fetches entre sí -- cada vista re-consulta al cambiar esto.
  const [refreshTick, setRefreshTick] = useState(0)

  const openEdit = (vuln: VulnerabilityAudit) => {
    setSelected(vuln)
    setForm({
      status: vuln.status, assignedTo: vuln.assignedTo ?? '', decision: vuln.decision ?? '',
      outcome: (vuln.outcome as 'MITIGADA' | 'NO_APLICA' | 'RIESGO_ACEPTADO') ?? '',
      mitigationControl: vuln.mitigationControl ?? '',
      justification: vuln.justification ?? '',
      acceptedBy: vuln.acceptedBy ?? '',
      riskAcceptedUntil: vuln.riskAcceptedUntil ? vuln.riskAcceptedUntil.slice(0, 10) : '',
      evidenceLevel: '',
      evidenceRef: '',
    })
    setAdvisory(null)
    setAdvisoryError(false)
    if (vuln.ghsaId) {
      setLoadingAdvisory(true)
      ghsaAdvisoryApi.get(vuln.ghsaId)
        .then(r => setAdvisory(r.data))
        .catch(() => setAdvisoryError(true))
        .finally(() => setLoadingAdvisory(false))
    }
  }

  const exportFicha = async (vuln: VulnerabilityAudit) => {
    const identifier = vuln.cveId || vuln.ghsaId
    if (!identifier) return
    setExportingFicha(true)
    try {
      const { data } = await reportApi.cve(identifier)
      downloadBlob(data, `ficha-${identifier}.pdf`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al generar la ficha')
    } finally {
      setExportingFicha(false)
    }
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        outcome: form.status === 'RESUELTA' ? (form.outcome || undefined) : undefined,
        riskAcceptedUntil: form.riskAcceptedUntil ? `${form.riskAcceptedUntil}T00:00:00` : undefined,
        evidenceLevel: form.status === 'RESUELTA' ? (form.evidenceLevel || undefined) : undefined,
        evidenceRef: form.status === 'RESUELTA' ? (form.evidenceRef || undefined) : undefined,
      }
      await vulnApi.updateStatus(selected.id, payload)
      toast.success('Actualizado')
      setSelected(null)
      setRefreshTick(t => t + 1)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeleting(true)
    try {
      await vulnApi.delete(id)
      toast.success('Eliminado')
      setConfirmDeleteId(null)
      setSelected(null)
      setRefreshTick(t => t + 1)
    } catch { toast.error('Error al eliminar') }
    finally { setDeleting(false) }
  }

  return (
    <div className="animate-fade-in px-4">
      <PageHeader
        title="Vulnerabilidades"
        subtitle="Gestión de riesgo, análisis y remediación"
      />

      <div className="flex gap-1 mb-5 bg-surface-800 border border-surface-600 rounded-xl p-1 w-fit">
        {([
          { key: 'resumen', label: 'Resumen' },
          { key: 'analisis', label: 'Análisis' },
          { key: 'listado', label: 'Listado' },
          { key: 'kanban', label: 'Kanban' },
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

      {tab === 'resumen' && (
        <VulnerabilidadesResumen onOpenDetail={openEdit} onGoToKanban={() => setTab('kanban')} refreshTick={refreshTick} />
      )}

      {tab === 'analisis' && <VulnerabilidadesAnalisis refreshTick={refreshTick} />}

      {tab === 'listado' && (
        <VulnerabilidadesListado
          onOpenDetail={openEdit}
          refreshTick={refreshTick}
          initialPriority={searchParams.get('priority') ?? undefined}
          initialTriageStatus={searchParams.get('triageStatus') ?? undefined}
        />
      )}

      {tab === 'kanban' && (
        <KanbanBoard isAuditor={isAuditor} onEdit={openEdit} refreshTick={refreshTick} />
      )}

      {/* Detalle compartido -- Resumen/Listado/Kanban abren el mismo modal */}
      <Modal title="Gestión de Vulnerabilidad" open={!!selected} onClose={() => setSelected(null)} size="lg">
        {selected && (
          <div className="space-y-4">
            <details className="group" open>
              <summary className="text-[10px] uppercase font-bold text-slate-500 cursor-pointer select-none hover:text-slate-300 transition-colors">
                Ver contexto técnico y descripción ▾
              </summary>
              <div className="mt-2 space-y-2">
                <div className="bg-surface-900 border border-white/5 rounded-lg p-3 font-mono text-[11px] space-y-1.5 shadow-inner">
                  <p className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-500">CVE/ID: </span>
                    <span className="text-brand-400 font-bold">{selected.cveId || selected.ghsaId || 'N/A'}</span>
                    {selected.cveId && selected.cveId !== 'N/A' && (
                      <a href={`https://nvd.nist.gov/vuln/detail/${selected.cveId}`} target="_blank" rel="noreferrer"
                         className="text-slate-500 hover:text-brand-400 inline-flex items-center gap-0.5">
                        NVD <ExternalLink size={9} />
                      </a>
                    )}
                    {selected.ghsaId && (
                      <a href={`https://github.com/advisories/${selected.ghsaId}`} target="_blank" rel="noreferrer"
                         className="text-slate-500 hover:text-brand-400 inline-flex items-center gap-0.5">
                        GHSA <ExternalLink size={9} />
                      </a>
                    )}
                  </p>
                  <p><span className="text-slate-500">Paquete: </span><span className="text-white">{selected.software || selected.componentName || '—'}</span>{selected.ecosystem && <span className="text-slate-500"> ({selected.ecosystem})</span>}</p>
                  <p>
                    <span className="text-slate-500">Versión: </span>
                    <span className="text-white">{selected.installedVersion || '—'}</span>
                    {selected.isZeroDay ? (
                      <span className="ml-2 text-red-400 inline-flex items-center gap-1"><Skull size={10} /> ZERO-DAY · sin parche disponible</span>
                    ) : selected.patchedVersion ? (
                      <span className="ml-2 text-emerald-400 inline-flex items-center gap-1"><ShieldCheck size={10} /> parche disponible → v{selected.patchedVersion}</span>
                    ) : null}
                  </p>
                  <p><span className="text-slate-500">Activo: </span><span className="text-white">{selected.asset}</span>{selected.environmentName && <span className="text-slate-500"> · {selected.environmentName}</span>}</p>
                  <p><span className="text-slate-500">Detectado: </span><span className="text-white">{selected.detectedAt ? new Date(selected.detectedAt).toLocaleString('es-AR') : '—'}</span></p>
                  {/* Rediseño de Vulnerabilidades: motivo de priorización visible -- antes
                      solo se calculaba `priority`, nunca se explicaba por qué (sección 10
                      del prompt). */}
                  {!!selected.priorityReasons?.length && (
                    <p>
                      <span className="text-slate-500">Motivo de prioridad: </span>
                      <span className="text-white">{selected.priorityReasons.join(' · ')}</span>
                    </p>
                  )}
                  {selected.dueDate && (
                    <p>
                      <span className="text-slate-500">Vence: </span>
                      <span className={new Date(selected.dueDate) < new Date() && selected.status !== 'RESUELTA' ? 'text-red-400 font-bold' : 'text-white'}>
                        {new Date(selected.dueDate).toLocaleDateString('es-AR')}
                      </span>
                    </p>
                  )}
                </div>

                <div className="bg-surface-900 border border-white/5 rounded-lg p-3 text-xs shadow-inner">
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1.5">Descripción de la vulnerabilidad</p>
                  {!selected.ghsaId ? (
                    <p className="text-slate-500 italic">Este hallazgo no tiene una advisory de GitHub asociada.</p>
                  ) : loadingAdvisory ? (
                    <p className="text-slate-500">Cargando…</p>
                  ) : advisoryError ? (
                    <p className="text-slate-500 italic">No se pudo cargar la descripción desde GitHub en este momento.</p>
                  ) : advisory ? (
                    <div className="space-y-2">
                      {advisory.summary && <p className="text-white font-medium">{advisory.summary}</p>}
                      {advisory.description && (
                        <p className="text-slate-300 whitespace-pre-wrap max-h-40 overflow-y-auto">{advisory.description}</p>
                      )}
                      {advisory.references.length > 0 && (
                        <div className="pt-1 space-y-0.5">
                          {advisory.references.slice(0, 5).map(url => (
                            /^https?:\/\//i.test(url) ? (
                              <a key={url} href={url} target="_blank" rel="noreferrer"
                                 className="block text-brand-400 hover:underline truncate">{url}</a>
                            ) : (
                              <span key={url} className="block text-slate-500 truncate" title="Enlace con esquema no permitido">{url}</span>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </details>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Estado</label>
                <select className="input w-full bg-surface-800 border-white/10 text-xs" value={form.status} disabled={isAuditor} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Asignar Responsable</label>
                <select className="input w-full bg-surface-800 border-white/10 text-xs" value={form.assignedTo} disabled={isAuditor} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}>
                  <option value="">Sin asignar</option>
                  {users.map(u => <option key={u.id} value={u.username}>{u.fullName || u.username}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Notas del analista</label>
              <textarea
                className="input w-full bg-surface-800 border-white/10 text-xs resize-none"
                rows={4}
                value={form.decision}
                disabled={isAuditor}
                onChange={e => setForm(f => ({ ...f, decision: e.target.value }))}
                placeholder="Pasos seguidos, decisión tomada, contexto adicional..."
              />
            </div>

            {form.status === 'RESUELTA' && (
              <div className="bg-surface-900 border border-white/5 rounded-lg p-3 space-y-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    Cómo se cerró (opcional)
                  </label>
                  <select
                    className="input w-full bg-surface-800 border-white/10 text-xs"
                    value={form.outcome}
                    disabled={isAuditor}
                    onChange={e => setForm(f => ({ ...f, outcome: e.target.value as typeof f.outcome }))}
                  >
                    <option value="">Resuelta (sin clasificar)</option>
                    <option value="MITIGADA">Mitigada — riesgo reducido sin eliminar la causa</option>
                    <option value="NO_APLICA">No aplica — falso positivo o no explotable acá</option>
                    <option value="RIESGO_ACEPTADO">Riesgo aceptado — con vencimiento</option>
                  </select>
                </div>

                {form.outcome === 'MITIGADA' && (
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                      Control compensatorio aplicado
                    </label>
                    <textarea
                      className="input w-full bg-surface-800 border-white/10 text-xs resize-none"
                      rows={2}
                      value={form.mitigationControl}
                      disabled={isAuditor}
                      onChange={e => setForm(f => ({ ...f, mitigationControl: e.target.value }))}
                      placeholder="Ej: regla de WAF, aislamiento de red, deshabilitación de la función afectada..."
                    />
                  </div>
                )}

                {form.outcome === 'NO_APLICA' && (
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                      Justificación (obligatoria)
                    </label>
                    <textarea
                      className="input w-full bg-surface-800 border-white/10 text-xs resize-none"
                      rows={2}
                      value={form.justification}
                      disabled={isAuditor}
                      onChange={e => setForm(f => ({ ...f, justification: e.target.value }))}
                      placeholder="Por qué esta vulnerabilidad no aplica en la configuración real..."
                    />
                  </div>
                )}

                {form.outcome === 'RIESGO_ACEPTADO' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                        Aceptado por
                      </label>
                      <input
                        className="input w-full bg-surface-800 border-white/10 text-xs"
                        value={form.acceptedBy}
                        disabled={isAuditor}
                        onChange={e => setForm(f => ({ ...f, acceptedBy: e.target.value }))}
                        placeholder="Responsable que acepta el riesgo"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                        Vence el (obligatorio)
                      </label>
                      <input
                        type="date"
                        className="input w-full bg-surface-800 border-white/10 text-xs"
                        value={form.riskAcceptedUntil}
                        disabled={isAuditor}
                        onChange={e => setForm(f => ({ ...f, riskAcceptedUntil: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                      Nivel de evidencia (opcional, E0 por defecto)
                    </label>
                    <select
                      className="input w-full bg-surface-800 border-white/10 text-xs"
                      value={form.evidenceLevel}
                      disabled={isAuditor}
                      onChange={e => setForm(f => ({ ...f, evidenceLevel: e.target.value as typeof f.evidenceLevel }))}
                    >
                      <option value="">E0 — Ninguna (solo el cambio de estado)</option>
                      <option value="E1">E1 — Declaración manual</option>
                      <option value="E2">E2 — Ticket cerrado</option>
                      <option value="E3">E3 — Despliegue con timestamp</option>
                      <option value="E4">E4 — Inventario posterior (versión corregida)</option>
                      <option value="E5">E5 — Reevaluación independiente</option>
                      <option value="E6">E6 — Verificación específica reproducible</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                      Respaldo (URL de reporte, commit, PR)
                    </label>
                    <input
                      className="input w-full bg-surface-800 border-white/10 text-xs"
                      value={form.evidenceRef}
                      disabled={isAuditor}
                      onChange={e => setForm(f => ({ ...f, evidenceRef: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-white/5">
              {canDelete && (
                <button onClick={() => setConfirmDeleteId(selected.id)} className="text-[10px] uppercase font-bold text-red-500 hover:text-red-400 transition-colors">Eliminar</button>
              )}
              <div className="flex gap-2 ml-auto">
                {(selected.cveId || selected.ghsaId) && (
                  <button onClick={() => exportFicha(selected)} disabled={exportingFicha} className="btn-ghost text-xs px-4">
                    <Download size={12} /> {exportingFicha ? 'Generando…' : 'Exportar ficha PDF'}
                  </button>
                )}
                <button onClick={() => setSelected(null)} className="btn-ghost text-xs px-4">Cerrar</button>
                {!isAuditor && (
                  <button onClick={handleSave} disabled={saving} className="btn-primary text-xs px-6 py-2 shadow-lg shadow-brand-500/20">
                    {saving ? 'Guardando...' : 'Aplicar Cambios'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal title="Eliminar registro" open={confirmDeleteId !== null} onClose={() => setConfirmDeleteId(null)} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-300">Esta acción no se puede deshacer. Se elimina el registro de auditoría de esta vulnerabilidad.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirmDeleteId(null)} className="btn-ghost text-xs px-4">Cancelar</button>
            <button
              onClick={() => confirmDeleteId != null && handleDelete(confirmDeleteId)}
              disabled={deleting}
              className="btn-danger text-xs px-4"
            >
              {deleting ? 'Eliminando…' : 'Eliminar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

/** Tab "Kanban" -- tablero de remediación (drag & drop). Necesita el dataset
 *  completo (no paginado) para armar las 3 columnas; el fetch queda local acá,
 *  no en el padre, para no acoplar su ciclo de vida al de Resumen/Listado. */
function KanbanBoard({ isAuditor, onEdit, refreshTick }: {
  isAuditor: boolean
  onEdit: (vuln: VulnerabilityAudit) => void
  refreshTick: number
}) {
  const [rawVulns, setRawVulns] = useState<VulnerabilityAudit[]>([])
  const [loading, setLoading] = useState(true)

  const [filterDate, setFilterDate] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('TODOS')
  const [filterPriority, setFilterPriority] = useState<string>('TODAS')

  const load = useCallback(() => {
    setLoading(true)
    vulnApi.getAll()
      .then(r => setRawVulns(r.data))
      .catch(() => toast.error('Error al cargar el tablero'))
      .finally(() => setLoading(false))
  }, [])

  // refreshTick en las deps -- guardar/eliminar desde el detalle refresca el tablero sin
  // resetear los filtros locales (fecha/estado/criticidad), a diferencia del
  // key={refreshTick} anterior, que remontaba el componente entero.
  useEffect(() => { load() }, [load, refreshTick])

  const board = useMemo(() => {
    const filtered = rawVulns.filter(v => {
      const dateValue = v.detectedAt || ''
      const matchDate = filterDate ? dateValue.startsWith(filterDate) : true
      const matchStatus = filterStatus === 'TODOS' ? true : v.status === filterStatus
      const matchPriority = filterPriority === 'TODAS' ? true : v.priority === filterPriority
      return matchDate && matchStatus && matchPriority
    })

    return COLUMNS.reduce((acc, col) => {
      acc[col.id] = filtered.filter(v => v.status === col.id)
      return acc
    }, {} as Board)
  }, [rawVulns, filterDate, filterStatus, filterPriority])

  const onDragEnd = async ({ source, destination, draggableId }: DropResult) => {
    if (isAuditor || !destination || source.droppableId === destination.droppableId) return
    const vulnId = parseInt(draggableId)
    const newStatus = destination.droppableId as VulnStatus

    setRawVulns(prev => prev.map(v => v.id === vulnId ? { ...v, status: newStatus } : v))

    try {
      await vulnApi.updateStatus(vulnId, { status: newStatus })
      toast.success(`Estado: ${newStatus}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar')
      load()
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex items-center gap-2 bg-surface-800 px-3 py-1.5 rounded-lg border border-white/5">
          <Filter size={14} className="text-slate-500" />
          <input
            type="date"
            value={filterDate}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFilterDate(e.target.value)}
            className="bg-transparent text-xs text-white outline-none border-none focus:ring-0 p-0"
          />
          {filterDate && (
            <button
              onClick={() => setFilterDate('')}
              className="ml-1 pl-2 border-l border-white/10 text-slate-500 hover:text-white transition-colors"
              title="Ver todas las fechas"
            >
              <CalendarX size={14} />
            </button>
          )}
        </div>

        <select
          value={filterStatus}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value)}
          className="bg-surface-800 text-xs text-white px-3 py-1.5 rounded-lg border border-white/5 outline-none cursor-pointer hover:bg-surface-700 transition-colors"
        >
          <option value="TODOS">Todos los estados</option>
          {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>

        <select
          value={filterPriority}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterPriority(e.target.value)}
          className="bg-surface-800 text-xs text-white px-3 py-1.5 rounded-lg border border-white/5 outline-none cursor-pointer hover:bg-surface-700 transition-colors"
        >
          <option value="TODAS">Todas las criticidades</option>
          <option value="CRITICAL">{PRIORITY_LABEL.CRITICAL}</option>
          <option value="HIGH">{PRIORITY_LABEL.HIGH}</option>
          <option value="MEDIUM">{PRIORITY_LABEL.MEDIUM}</option>
          <option value="LOW">{PRIORITY_LABEL.LOW}</option>
        </select>

        {(filterDate || filterStatus !== 'TODOS' || filterPriority !== 'TODAS') && (
          <button
            onClick={() => { setFilterDate(''); setFilterStatus('TODOS'); setFilterPriority('TODAS') }}
            className="btn-ghost text-xs px-3 py-1.5 rounded-lg bg-surface-800 border border-white/5"
          >
            Limpiar filtros
          </button>
        )}

        <button onClick={load} disabled={loading} className="btn-ghost p-2 rounded-lg bg-surface-800 border border-white/5" aria-label="Recargar tablero">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-4">
          {COLUMNS.map(col => (
            <div key={col.id} className="space-y-4">
              <div className="skeleton h-7 w-28 rounded-lg" />
              {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 rounded-lg" />)}
            </div>
          ))}
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLUMNS.map(col => (
              <div key={col.id} className="flex flex-col min-h-[70vh]">
                <div className={`flex items-center justify-between mb-3 pb-2 border-b-2 ${col.color}`}>
                  <span className="text-sm font-bold uppercase tracking-wider">{col.label}</span>
                  <span className="text-[10px] font-mono text-slate-400 bg-surface-700 px-2 py-0.5 rounded">
                    {(board[col.id] ?? []).length}
                  </span>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 rounded-xl p-2 transition-all duration-200
                        ${snapshot.isDraggingOver ? 'bg-brand-600/10 ring-1 ring-brand-600/30' : 'bg-surface-800/30'}`}
                    >
                      {(board[col.id] ?? []).map((vuln, idx) => (
                        <VulnerabilityCard key={vuln.id} vuln={vuln} index={idx} onEdit={onEdit} dragDisabled={isAuditor} />
                      ))}
                      {provided.placeholder}
                      {!(board[col.id] ?? []).length && (
                        <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-lg">
                          <p className="text-[10px] text-slate-600 uppercase tracking-tighter italic">Vacio</p>
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      )}
    </>
  )
}
