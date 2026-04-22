import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, ScanLine, Pencil, Trash2, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { assetApi, environmentApi } from '../services/api'
import type { Asset, AssetRequest, Environment } from '../types'
import PageHeader from '../components/PageHeader'
import Table, { Column } from '../components/Table'
import Modal from '../components/Modal'

const CRITICALITY_BADGE: Record<string, string> = {
  'CRITICA':  'bg-[#bd1e1e]/20 text-[#bd1e1e] border border-[#bd1e1e]/40',
  'ALTA':     'bg-[#f95c5c]/15 text-[#f95c5c] border border-[#f95c5c]/30',
  'MEDIA':    'bg-[#f9f15c]/15 text-yellow-200 border border-[#f9f15c]/30',
  'BAJA':     'bg-[#44a024]/15 text-[#44a024] border border-[#44a024]/30',
  'CRITICAL': 'bg-[#bd1e1e]/20 text-[#bd1e1e] border border-[#bd1e1e]/40',
  'HIGH':     'bg-[#f95c5c]/15 text-[#f95c5c] border border-[#f95c5c]/30',
  'MEDIUM':   'bg-[#f9f15c]/15 text-yellow-200 border border-[#f9f15c]/30',
  'LOW':      'bg-[#44a024]/15 text-[#44a024] border border-[#44a024]/30',
}

const EMPTY_FORM: AssetRequest = {
  name: '', software: '', ecosystem: '', version: '', environmentId: undefined, description: '',
}

export default function Inventory() {
  const [assets,       setAssets]       = useState<Asset[]>([])
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [modal,        setModal]        = useState(false)
  const [editing,      setEditing]      = useState<Asset | null>(null)
  const [form,         setForm]         = useState<AssetRequest>(EMPTY_FORM)
  const [saving,       setSaving]       = useState(false)
  const [scanning,     setScanning]     = useState<number | null>(null)

  const load = useCallback((q = '') => {
    setLoading(true)
    assetApi.getAll(q)
      .then(r => setAssets(r.data))
      .catch(() => toast.error('Error al cargar activos'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    environmentApi.getAll()
      .then(r => setEnvironments(r.data))
      .catch(() => toast.error('Error al cargar entornos'))
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModal(true)
  }

  const openEdit = (a: Asset) => {
    setEditing(a)
    setForm({
      name:          a.name,
      software:      a.software,
      ecosystem:     a.ecosystem,
      version:       a.version,
      environmentId: a.environmentId ?? undefined,
      description:   a.description ?? '',
    })
    setModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editing) {
        await assetApi.update(editing.id, form)
        toast.success('Activo actualizado')
      } else {
        await assetApi.create(form)
        toast.success('Activo creado')
      }
      setModal(false)
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este activo?')) return
    try {
      await assetApi.delete(id)
      toast.success('Activo eliminado')
      load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  const handleScan = async (id: number) => {
    setScanning(id)
    try {
      await assetApi.triggerScan(id)
      toast.success('Escaneo disparado vía n8n')
      load()
    } catch {
      toast.error('Error al disparar el escaneo')
    } finally {
      setScanning(null)
    }
  }

  const f = (k: keyof AssetRequest, v: string | number | undefined) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const columns: Column<Asset>[] = [
    { key: 'name',            label: 'Nombre' },
    { key: 'software',        label: 'Software' },
    { key: 'ecosystem',       label: 'Ecosistema' },
    { key: 'version',         label: 'Versión', render: v => <span className="font-mono text-xs">{String(v)}</span> },
    {
      key: 'environmentName', label: 'Entorno',
      render: v => <span className="text-xs text-slate-300">{v ? String(v) : '—'}</span>,
    },
    {
      key: 'businessCriticality', label: 'Criticidad',
      render: v => v
        ? <span className={`badge ${CRITICALITY_BADGE[String(v)] ?? 'bg-slate-700 text-slate-300'}`}>{String(v)}</span>
        : <span className="text-slate-500 text-xs">—</span>,
    },
    {
      key: 'lastScan', label: 'Último Scan',
      render: v => v ? new Date(String(v)).toLocaleString('es-AR') : '—',
    },
    {
      key: 'id', label: 'Acciones',
      render: (v, row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => handleScan(Number(v))} disabled={scanning === Number(v)} className="btn-ghost !py-1 !px-2 text-emerald-400">
            {scanning === Number(v) ? <RefreshCw size={13} className="animate-spin" /> : <ScanLine size={13} />}
          </button>
          <button onClick={() => openEdit(row)} className="btn-ghost !py-1 !px-2"><Pencil size={13} /></button>
          <button onClick={() => handleDelete(Number(v))} className="btn-ghost !py-1 !px-2 text-red-400"><Trash2 size={13} /></button>
        </div>
      ),
    },
  ]

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Inventario de Activos"
        subtitle="Gestión de paquetes y dependencias monitoreadas"
        actions={<button onClick={openCreate} className="btn-primary"><Plus size={14} /> Nuevo Activo</button>}
      />

      <form onSubmit={e => { e.preventDefault(); load(search) }} className="flex gap-2 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input className="input pl-8" placeholder="Buscar software…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary">Buscar</button>
        <button type="button" onClick={() => { setSearch(''); load() }} className="btn-ghost">Limpiar</button>
      </form>

      <div className="card p-0 overflow-hidden rounded-xl border border-surface-600">
        <Table columns={columns} data={assets} loading={loading} emptyMessage="No hay activos registrados" />
      </div>

      <Modal title={editing ? 'Editar Activo' : 'Nuevo Activo'} open={modal} onClose={() => setModal(false)}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nombre *</label>
              <input className="input" value={form.name} onChange={e => f('name', e.target.value)} placeholder="ej: lodash" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Software *</label>
              <input className="input" value={form.software} onChange={e => f('software', e.target.value)} placeholder="ej: lodash" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Ecosistema</label>
              <select className="input" value={form.ecosystem} onChange={e => f('ecosystem', e.target.value)}>
                <option value="">Seleccionar…</option>
                {['npm','pip','maven','nuget','cargo','go','composer','rubygems'].map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Versión</label>
              <input className="input font-mono" value={form.version} onChange={e => f('version', e.target.value)} placeholder="ej: 4.17.15" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Entorno</label>
            <select
              className="input"
              value={form.environmentId ?? ''}
              onChange={e => f('environmentId', e.target.value ? Number(e.target.value) : undefined)}
            >
              <option value="">Sin entorno</option>
              {environments.map(env => (
                <option key={env.id} value={env.id}>
                  {env.name} {env.businessCriticality ? `(${env.businessCriticality})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Descripción</label>
            <textarea className="input resize-none" rows={2} value={form.description} onChange={e => f('description', e.target.value)} placeholder="Descripción opcional…" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setModal(false)} className="btn-ghost">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
