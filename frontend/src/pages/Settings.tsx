import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, Pencil, RefreshCw, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { userApi, systemErrorApi } from '../services/api'
import type { User, UserRequest, SystemError } from '../types'
import PageHeader from '../components/PageHeader'
import Table, { Column } from '../components/Table'
import Modal from '../components/Modal'

const EMPTY_USER: UserRequest = { username: '', fullName: '', email: '', role: 'AUDITOR' }
type Tab = 'users' | 'errors'

export default function Settings() {
  const [users,   setUsers]   = useState<User[]>([])
  const [errors,  setErrors]  = useState<SystemError[]>([])
  const [loadU,   setLoadU]   = useState(true)
  const [loadE,   setLoadE]   = useState(true)
  const [tab,     setTab]     = useState<Tab>('users')
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form,    setForm]    = useState<UserRequest>(EMPTY_USER)
  const [saving,  setSaving]  = useState(false)

  const loadUsers = useCallback(() => {
    setLoadU(true)
    userApi.getAll()
      .then(r => setUsers(r.data))
      .catch(() => toast.error('Error al cargar usuarios'))
      .finally(() => setLoadU(false))
  }, [])

  const loadErrors = useCallback(() => {
    setLoadE(true)
    systemErrorApi.getAll()
      .then(r => setErrors(r.data))
      .catch(() => toast.error('Error al cargar errores'))
      .finally(() => setLoadE(false))
  }, [])

  useEffect(() => { loadUsers(); loadErrors() }, [loadUsers, loadErrors])

  const openCreate = () => { setEditing(null); setForm(EMPTY_USER); setModal(true) }
  const openEdit   = (u: User) => {
    setEditing(u)
    setForm({ username: u.username, fullName: u.fullName ?? '', email: u.email ?? '', role: u.role })
    setModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editing) {
        await userApi.update(editing.id, form)
        toast.success('Usuario actualizado')
      } else {
        await userApi.create(form)
        toast.success('Usuario creado')
      }
      setModal(false)
      loadUsers()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async (id: number) => {
    if (!confirm('¿Eliminar este usuario?')) return
    try { await userApi.delete(id); toast.success('Usuario eliminado'); loadUsers() }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
  }

  const handleDeleteError = async (id: number) => {
    try {
      await systemErrorApi.delete(id)
      setErrors(prev => prev.filter(e => e.id !== id))
      toast.success('Error eliminado del log')
    } catch { toast.error('Error al eliminar') }
  }

  const f = (k: keyof UserRequest, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  const userColumns: Column<User>[] = [
    { key: 'username', label: 'Username', render: v => <span className="font-mono text-xs">{String(v)}</span> },
    { key: 'fullName', label: 'Nombre completo' },
    { key: 'email',    label: 'Email' },
    {
      key: 'role', label: 'Rol',
      render: v => (
        <span className={`badge ${v === 'ADMIN' ? 'bg-brand-600/20 text-brand-400 border border-brand-600/30' : 'bg-slate-700 text-slate-400 border border-slate-600'}`}>
          {String(v)}
        </span>
      ),
    },
    { key: 'createdAt', label: 'Creado', render: v => v ? new Date(String(v)).toLocaleDateString('es-AR') : '—' },
    {
      key: 'id', label: '',
      render: (v, row) => (
        <div className="flex gap-1">
          <button onClick={() => openEdit(row)} className="btn-ghost !py-1 !px-2"><Pencil size={13} /></button>
          <button onClick={() => handleDeleteUser(Number(v))} className="btn-ghost !py-1 !px-2 text-red-400"><Trash2 size={13} /></button>
        </div>
      ),
    },
  ]

  const errorColumns: Column<SystemError>[] = [
    { key: 'errorDate',    label: 'Fecha',    render: v => v ? new Date(String(v)).toLocaleString('es-AR') : '—' },
    { key: 'nodeName',     label: 'Nodo',     render: v => <span className="font-mono text-xs">{String(v ?? '—')}</span> },
    { key: 'workflowId',   label: 'Workflow', render: v => <span className="font-mono text-xs text-slate-500">{String(v ?? '—')}</span> },
    { key: 'errorMessage', label: 'Mensaje',  render: v => <span className="text-red-400 text-xs line-clamp-1">{String(v ?? '—')}</span> },
    {
      key: 'id', label: '',
      render: v => (
        <button onClick={() => handleDeleteError(Number(v))} className="btn-ghost !py-1 !px-2 text-red-400"><Trash2 size={13} /></button>
      ),
    },
  ]

  return (
    <div className="animate-fade-in">
      <PageHeader title="Configuración" subtitle="Usuarios, auditores y log de errores del sistema" />

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-surface-800 border border-surface-600 rounded-xl p-1 w-fit">
        {([
          { key: 'users',  label: 'Usuarios / Auditores' },
          { key: 'errors', label: 'Log de Errores', icon: AlertCircle },
        ] as { key: Tab; label: string; icon?: React.ElementType }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === t.key ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            {t.icon && <t.icon size={13} />}
            {t.label}
            {t.key === 'errors' && errors.length > 0 && (
              <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {errors.length > 9 ? '9+' : errors.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-slate-500">{users.length} usuario(s)</p>
            <button onClick={openCreate} className="btn-primary"><Plus size={14} /> Nuevo Usuario</button>
          </div>
          <div className="card p-0 overflow-hidden rounded-xl border border-surface-600">
            <Table columns={userColumns} data={users} loading={loadU} emptyMessage="No hay usuarios" />
          </div>
        </>
      )}

      {tab === 'errors' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-slate-500">{errors.length} error(es) en el log</p>
            <button onClick={loadErrors} disabled={loadE} className="btn-ghost">
              <RefreshCw size={13} className={loadE ? 'animate-spin' : ''} /> Recargar
            </button>
          </div>
          <div className="card p-0 overflow-hidden rounded-xl border border-surface-600">
            <Table columns={errorColumns} data={errors} loading={loadE} emptyMessage="✓ Sin errores registrados" />
          </div>
        </>
      )}

      {/* Modal usuario */}
      <Modal title={editing ? 'Editar Usuario' : 'Nuevo Usuario'} open={modal} onClose={() => setModal(false)}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Username *</label>
              <input className="input font-mono" value={form.username} onChange={e => f('username', e.target.value)} placeholder="ej: jdoe" disabled={!!editing} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nombre completo</label>
              <input className="input" value={form.fullName} onChange={e => f('fullName', e.target.value)} placeholder="ej: Juan Doe" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Email</label>
            <input className="input" type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="ej: jdoe@utn.edu.ar" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Rol</label>
            <select className="input" value={form.role} onChange={e => f('role', e.target.value)}>
              <option value="AUDITOR">AUDITOR</option>
              <option value="ADMIN">ADMIN</option>
            </select>
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
