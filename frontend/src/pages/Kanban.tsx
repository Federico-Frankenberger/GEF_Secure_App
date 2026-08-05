import React, { useEffect, useState, useCallback, useMemo, ChangeEvent } from 'react'
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd'
import { RefreshCw, Filter, CalendarX } from 'lucide-react'
import toast from 'react-hot-toast'
import { vulnApi, userApi } from '../services/api'
import type { VulnerabilityAudit, VulnStatus, User } from '../types'
import VulnerabilityCard from '../components/VulnerabilityCard'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'

const COLUMNS: { id: VulnStatus; label: string; color: string }[] = [
  { id: 'DETECTADA',   label: 'Detectadas',  color: 'border-red-500/40    text-red-400'     },
  { id: 'EN_ANALISIS', label: 'En Análisis', color: 'border-amber-500/40  text-amber-400'   },
  { id: 'RESUELTA',    label: 'Resueltas',   color: 'border-emerald-500/40 text-emerald-400' },
]

type Board = Record<VulnStatus, VulnerabilityAudit[]>

export default function Kanban() {
  const [rawVulns, setRawVulns] = useState<VulnerabilityAudit[]>([])
  const [users,    setUsers]    = useState<User[]>([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<VulnerabilityAudit | null>(null)
  const [form,     setForm]     = useState({ status: '', assignedTo: '', decision: '' })
  const [saving,   setSaving]   = useState(false)

  // Filtros inicializados: Fecha de HOY por defecto
  const [filterDate, setFilterDate] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('TODOS')

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([vulnApi.getAll(), userApi.getAll()])
      .then(([vr, ur]) => {
        setRawVulns(vr.data)
        setUsers(ur.data)
      })
      .catch(() => toast.error('Error al cargar el tablero'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // Lógica de filtrado combinada (Cliente-side)
  const board = useMemo(() => {
    const filtered = rawVulns.filter(v => {
      const dateValue = v.detectedAt || (v as any).detected_at || ''
      // Si filterDate está vacío, no filtra por fecha (muestra todos)
      const matchDate = filterDate ? dateValue.startsWith(filterDate) : true
      const matchStatus = filterStatus === 'TODOS' ? true : v.status === filterStatus
      return matchDate && matchStatus
    })

    return COLUMNS.reduce((acc, col) => {
      acc[col.id] = filtered.filter(v => v.status === col.id)
      return acc
    }, {} as Board)
  }, [rawVulns, filterDate, filterStatus])

  const onDragEnd = async ({ source, destination, draggableId }: DropResult) => {
    if (!destination || source.droppableId === destination.droppableId) return
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

  const openEdit = (vuln: VulnerabilityAudit) => {
    setSelected(vuln)
    setForm({ status: vuln.status, assignedTo: vuln.assignedTo ?? '', decision: vuln.decision ?? '' })
  }

const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await vulnApi.updateStatus(selected.id, form)
      toast.success('Actualizado')
      setSelected(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar registro?')) return
    try {
      await vulnApi.delete(id)
      toast.success('Eliminado')
      setSelected(null)
      load()
    } catch { toast.error('Error al eliminar') }
  }

  return (
    <div className="animate-fade-in px-4">
      <PageHeader
        title="Tablero de Auditoría"
        subtitle="Gestión y remediación de vulnerabilidades"
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

            <button onClick={load} disabled={loading} className="btn-ghost p-2 rounded-lg bg-surface-800 border border-white/5">
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
          <div className="grid grid-cols-3 gap-4">
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
                        <VulnerabilityCard key={vuln.id} vuln={vuln} index={idx} onEdit={openEdit} />
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
      <Modal title="Gestión de Vulnerabilidad" open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <div className="space-y-4">
            <div className="bg-surface-900 border border-white/5 rounded-lg p-3 font-mono text-[11px] space-y-1 shadow-inner">
              <p><span className="text-slate-500">CVE/ID: </span><span className="text-brand-400 font-bold">{selected.cveId || selected.ghsaId || 'N/A'}</span></p>
              <p><span className="text-slate-500">Asset: </span><span className="text-white">{selected.asset}</span></p>
              <p><span className="text-slate-500">Fecha: </span><span className="text-white">{selected.detectedAt ? new Date(selected.detectedAt).toLocaleString('es-AR') : '—'}</span></p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Estado</label>
                <select className="input w-full bg-surface-800 border-white/10 text-xs" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Asignar Responsable</label>
                <select className="input w-full bg-surface-800 border-white/10 text-xs" value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}>
                  <option value="">Sin asignar</option>
                  {users.map(u => <option key={u.id} value={u.username}>{u.fullName || u.username}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Notas de Remediación</label>
              <textarea 
                className="input w-full bg-surface-800 border-white/10 text-xs resize-none" 
                rows={4} 
                value={form.decision} 
                onChange={e => setForm(f => ({ ...f, decision: e.target.value }))} 
                placeholder="Indicar pasos seguidos o decisión tomada..." 
              />
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-white/5">
              <button onClick={() => handleDelete(selected.id)} className="text-[10px] uppercase font-bold text-red-500 hover:text-red-400 transition-colors">Eliminar</button>
              <div className="flex gap-2">
                <button onClick={() => setSelected(null)} className="btn-ghost text-xs px-4">Cerrar</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary text-xs px-6 py-2 shadow-lg shadow-brand-500/20">
                  {saving ? 'Guardando...' : 'Aplicar Cambios'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}