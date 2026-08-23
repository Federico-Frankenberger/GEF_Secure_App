import React, { useEffect, useState, useCallback, useMemo, ChangeEvent } from 'react'
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd'
import { RefreshCw, Filter, CalendarX, ExternalLink, Skull, ShieldCheck, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { vulnApi, userApi, ghsaAdvisoryApi, reportApi } from '../services/api'
import type { VulnerabilityAudit, VulnStatus, User, GhsaAdvisory } from '../types'
import VulnerabilityCard from '../components/VulnerabilityCard'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../contexts/AuthContext'
import { downloadBlob } from '../utils/downloadFile'
import { PRIORITY_LABEL } from '../constants/badges'

const COLUMNS: { id: VulnStatus; label: string; color: string }[] = [
  { id: 'DETECTADA',   label: 'Detectadas',  color: 'border-red-500/40    text-red-400'     },
  { id: 'EN_ANALISIS', label: 'En Análisis', color: 'border-amber-500/40  text-amber-400'   },
  { id: 'RESUELTA',    label: 'Resueltas',   color: 'border-emerald-500/40 text-emerald-400' },
]

type Board = Record<VulnStatus, VulnerabilityAudit[]>

export default function Kanban() {
  const { user } = useAuth()
  const isAuditor = user?.role === 'AUDITOR'
  // GET /api/users solo lo permite el backend a ADMIN y SECURITY_ANALYST
  const canListUsers = user?.role === 'ADMIN' || user?.role === 'SECURITY_ANALYST'
  // DELETE /api/vulnerabilities/{id} solo lo permite el backend a ADMIN y SECURITY_ANALYST
  // (a diferencia de PATCH .../status, que ASSET_OWNER sí puede usar dentro de su scope)
  const canDelete = user?.role === 'ADMIN' || user?.role === 'SECURITY_ANALYST'
  const [rawVulns, setRawVulns] = useState<VulnerabilityAudit[]>([])
  const [users,    setUsers]    = useState<User[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<VulnerabilityAudit | null>(null)
  const [form,     setForm]     = useState({
    status: '', assignedTo: '', decision: '',
    // Fase 5 (docs/21-08-26/Plan_Implementacion_Tracking_Solido.md): vocabulario VEX.
    outcome: '' as '' | 'MITIGADA' | 'NO_APLICA' | 'RIESGO_ACEPTADO',
    mitigationControl: '', justification: '', acceptedBy: '', riskAcceptedUntil: '',
    // Fase 7 (docs/21-08-26/Plan_Implementacion_Tracking_Solido.md): escala de evidencia.
    evidenceLevel: '' as '' | 'E0' | 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6',
    evidenceRef: '',
  })
  const [saving,   setSaving]   = useState(false)

  // Filtros inicializados: Fecha de HOY por defecto
  const [filterDate, setFilterDate] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('TODOS')
  const [filterPriority, setFilterPriority] = useState<string>('TODAS')

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([vulnApi.getAll(), canListUsers ? userApi.getAll() : Promise.resolve({ data: [] as User[] })])
      .then(([vr, ur]) => {
        setRawVulns(vr.data)
        setUsers(ur.data)
      })
      .catch(() => toast.error('Error al cargar el tablero'))
      .finally(() => setLoading(false))
  }, [canListUsers])

  useEffect(() => { load() }, [load])

  // Lógica de filtrado combinada (Cliente-side)
  const board = useMemo(() => {
    const filtered = rawVulns.filter(v => {
      const dateValue = v.detectedAt || (v as any).detected_at || ''
      // Si filterDate está vacío, no filtra por fecha (muestra todos)
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

  // Frente 3: descripción real de la advisory (GHSA), pedida al abrir el modal.
  const [advisory,        setAdvisory]        = useState<GhsaAdvisory | null>(null)
  const [loadingAdvisory, setLoadingAdvisory]  = useState(false)
  const [advisoryError,   setAdvisoryError]    = useState(false)
  const [exportingFicha,  setExportingFicha]   = useState(false)

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

  const openEdit = (vuln: VulnerabilityAudit) => {
    setSelected(vuln)
    setForm({
      status: vuln.status, assignedTo: vuln.assignedTo ?? '', decision: vuln.decision ?? '',
      outcome: (vuln.outcome as 'MITIGADA' | 'NO_APLICA' | 'RIESGO_ACEPTADO') ?? '',
      mitigationControl: vuln.mitigationControl ?? '',
      justification: vuln.justification ?? '',
      acceptedBy: vuln.acceptedBy ?? '',
      riskAcceptedUntil: vuln.riskAcceptedUntil ? vuln.riskAcceptedUntil.slice(0, 10) : '',
      // Fase 7: no hay "evidencia vigente" que precargar -- es un dato por transicion, no
      // por AssetVulnerability. Arranca vacio en cada apertura del modal.
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

const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    try {
      // Fase 5: outcome solo tiene sentido si status = RESUELTA -- no mandar restos de un
      // outcome elegido antes de cambiar el select de vuelta. riskAcceptedUntil llega del
      // <input type="date"> como "yyyy-mm-dd"; el backend espera LocalDateTime completo.
      const payload = {
        ...form,
        outcome: form.status === 'RESUELTA' ? (form.outcome || undefined) : undefined,
        riskAcceptedUntil: form.riskAcceptedUntil ? `${form.riskAcceptedUntil}T00:00:00` : undefined,
        // Fase 7: igual criterio que outcome -- evidencia solo aplica si se esta cerrando.
        evidenceLevel: form.status === 'RESUELTA' ? (form.evidenceLevel || undefined) : undefined,
        evidenceRef: form.status === 'RESUELTA' ? (form.evidenceRef || undefined) : undefined,
      }
      await vulnApi.updateStatus(selected.id, payload)
      toast.success('Actualizado')
      setSelected(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  // P-09 (auditoria UX/UI): antes window.confirm() nativo -- no se puede estilizar y
  // rompe la identidad visual justo en la accion mas sensible (borrar).
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (id: number) => {
    setDeleting(true)
    try {
      await vulnApi.delete(id)
      toast.success('Eliminado')
      setConfirmDeleteId(null)
      setSelected(null)
      load()
    } catch { toast.error('Error al eliminar') }
    finally { setDeleting(false) }
  }

  return (
    <div className="animate-fade-in px-4">
      <PageHeader
        title="Vulnerabilidades"
        subtitle="Tablero de auditoría — gestión y remediación"
        actions={
          <div className="flex items-center gap-2">
            {/* SELECTOR DE FECHA CON OPCIÓN DE LIMPIAR */}
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

            {/* SELECTOR DE ESTADO */}
            <select 
              value={filterStatus}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setFilterStatus(e.target.value)}
              className="bg-surface-800 text-xs text-white px-3 py-1.5 rounded-lg border border-white/5 outline-none cursor-pointer hover:bg-surface-700 transition-colors"
            >
              <option value="TODOS">Todos los estados</option>
              {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>

            {/* SELECTOR DE CRITICIDAD */}
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

            {/* P-16 (auditoria UX/UI): antes solo la fecha tenia forma de limpiarse sola --
                Estado y Criticidad habia que resetearlos campo por campo. */}
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
        }
      />

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
                        <VulnerabilityCard key={vuln.id} vuln={vuln} index={idx} onEdit={openEdit} dragDisabled={isAuditor} />
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

      {/* MODAL DE EDICIÓN */}
      <Modal title="Gestión de Vulnerabilidad" open={!!selected} onClose={() => setSelected(null)} size="lg">
        {selected && (
          <div className="space-y-4">
            {/* P-12 (auditoria UX/UI): contexto tecnico + descripcion de la advisory
                colapsados por defecto -- antes se renderizaban siempre expandidos junto
                con todo el bloque de edicion, alargando el modal innecesariamente. */}
            <details className="group" open={false}>
              <summary className="text-[10px] uppercase font-bold text-slate-500 cursor-pointer select-none hover:text-slate-300 transition-colors">
                Ver contexto técnico y descripción ▾
              </summary>
              <div className="mt-2 space-y-2">
            {/* Contexto técnico: de solo lectura, todo lo que ya sabemos del hallazgo */}
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
              {/* Fase 6 (docs/21-08-26/Plan_Implementacion_Tracking_Solido.md): plazo calculado a partir de la prioridad. */}
              {selected.dueDate && (
                <p>
                  <span className="text-slate-500">Vence: </span>
                  <span className={new Date(selected.dueDate) < new Date() && selected.status !== 'RESUELTA' ? 'text-red-400 font-bold' : 'text-white'}>
                    {new Date(selected.dueDate).toLocaleDateString('es-AR')}
                  </span>
                </p>
              )}
            </div>

            {/* Descripción real de la advisory (Frente 3) -- qué es esto, en criollo */}
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
                        // FE-11 (docs/20-08-26/AUDITORIA_END_TO_END.md): estas URLs vienen de la
                        // advisory cacheada de GitHub, no de una fuente que controlemos -- sin
                        // este allowlist, un `javascript:`/`data:` colado en el campo `references`
                        // se ejecutaría como link real al clickear.
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

            {/* Fase 5 (docs/21-08-26/Plan_Implementacion_Tracking_Solido.md): vocabulario VEX
                -- solo aplica cuando el estado elegido es RESUELTA. */}
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

                {/* Fase 7 (docs/21-08-26/Plan_Implementacion_Tracking_Solido.md): escala de
                    evidencia E0-E6 + referencia al respaldo real (reporte, commit, PR). */}
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

      {/* P-09: confirmacion destructiva propia en vez de window.confirm() */}
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