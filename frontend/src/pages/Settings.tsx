import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, Pencil, RefreshCw, AlertCircle, ShieldOff, UserPlus, Globe, Server, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { userApi, systemErrorApi, assetApi, assetAssignmentApi, environmentApi, assetTypeApi, ecosystemApi } from '../services/api'
import type { User, UserRequest, SystemError, Asset, UserAssetAssignment, Environment, EnvironmentRequest, AssetType, Ecosystem } from '../types'
import { useAuth } from '../contexts/AuthContext'
import PageHeader from '../components/PageHeader'
import Table, { Column } from '../components/Table'
import Modal from '../components/Modal'

const EMPTY_USER: UserRequest = { username: '', fullName: '', email: '', role: 'AUDITOR', password: '' }
const EMPTY_ENV: EnvironmentRequest = { name: '', businessCriticality: 'BAJA', description: '' }
const CRITICALITY_OPTIONS = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA']
const CRITICALITY_BADGE: Record<string, string> = {
  CRITICA: 'bg-[#bd1e1e]/20 text-[#bd1e1e] border border-[#bd1e1e]/40',
  ALTA:    'bg-[#f95c5c]/15 text-[#f95c5c] border border-[#f95c5c]/30',
  MEDIA:   'bg-[#f9f15c]/15 text-yellow-200 border border-[#f9f15c]/30',
  BAJA:    'bg-[#44a024]/15 text-[#44a024] border border-[#44a024]/30',
}
type Tab = 'users' | 'assignments' | 'errors' | 'environments' | 'assetTypes' | 'ecosystems'

export default function Settings() {
  const { user: currentUser } = useAuth()
  const ERRORS_PAGE_SIZE = 20
  const [users,   setUsers]   = useState<User[]>([])
  const [errors,  setErrors]  = useState<SystemError[]>([])
  const [errorsTotal, setErrorsTotal] = useState(0)
  const [errorPage,   setErrorPage]   = useState(0)
  const [loadU,   setLoadU]   = useState(true)
  const [loadE,   setLoadE]   = useState(true)
  const [tab,     setTab]     = useState<Tab>('users')
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form,    setForm]    = useState<UserRequest>(EMPTY_USER)
  const [saving,  setSaving]  = useState(false)

  const [assets,          setAssets]          = useState<Asset[]>([])
  const [loadAssets,      setLoadAssets]      = useState(true)
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null)
  const [assignments,     setAssignments]     = useState<UserAssetAssignment[]>([])
  const [loadAssign,      setLoadAssign]      = useState(false)
  const [userToAssign,    setUserToAssign]    = useState<number | ''>('')
  const [assigning,       setAssigning]       = useState(false)

  // Entornos
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [loadEnv,       setLoadEnv]       = useState(true)
  const [envModal,      setEnvModal]      = useState(false)
  const [editingEnv,    setEditingEnv]    = useState<Environment | null>(null)
  const [envForm,       setEnvForm]       = useState<EnvironmentRequest>(EMPTY_ENV)
  const [savingEnv,     setSavingEnv]     = useState(false)

  // Tipos de host
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([])
  const [loadAT,      setLoadAT]      = useState(true)
  const [atModal,     setAtModal]     = useState(false)
  const [editingAT,   setEditingAT]   = useState<AssetType | null>(null)
  const [atName,      setAtName]      = useState('')
  const [savingAT,    setSavingAT]    = useState(false)

  // Ecosistemas
  const [ecosystems, setEcosystems] = useState<Ecosystem[]>([])
  const [loadEco,     setLoadEco]     = useState(true)
  const [ecoModal,    setEcoModal]    = useState(false)
  const [editingEco,  setEditingEco]  = useState<Ecosystem | null>(null)
  const [ecoName,     setEcoName]     = useState('')
  const [savingEco,   setSavingEco]   = useState(false)

  const loadEnvironments = useCallback(() => {
    setLoadEnv(true)
    environmentApi.getAll()
      .then(r => setEnvironments(r.data))
      .catch(() => toast.error('Error al cargar entornos'))
      .finally(() => setLoadEnv(false))
  }, [])

  const loadAssetTypes = useCallback(() => {
    setLoadAT(true)
    assetTypeApi.getAll()
      .then(r => setAssetTypes(r.data))
      .catch(() => toast.error('Error al cargar tipos de host'))
      .finally(() => setLoadAT(false))
  }, [])

  const loadEcosystems = useCallback(() => {
    setLoadEco(true)
    ecosystemApi.getAll()
      .then(r => setEcosystems(r.data))
      .catch(() => toast.error('Error al cargar ecosistemas'))
      .finally(() => setLoadEco(false))
  }, [])

  const loadUsers = useCallback(() => {
    setLoadU(true)
    userApi.getAll()
      .then(r => setUsers(r.data))
      .catch(() => toast.error('Error al cargar usuarios'))
      .finally(() => setLoadU(false))
  }, [])

  const loadErrors = useCallback((page = 0) => {
    setLoadE(true)
    systemErrorApi.getAll(page, ERRORS_PAGE_SIZE)
      .then(r => { setErrors(r.data.content); setErrorsTotal(r.data.totalElements); setErrorPage(page) })
      .catch(() => toast.error('Error al cargar errores'))
      .finally(() => setLoadE(false))
  }, [])

  const isAdmin = currentUser?.role === 'ADMIN'

  useEffect(() => {
    if (!isAdmin) return
    loadUsers()
    loadErrors()
    loadEnvironments()
    loadAssetTypes()
    loadEcosystems()
  }, [isAdmin, loadUsers, loadErrors, loadEnvironments, loadAssetTypes, loadEcosystems])

  useEffect(() => {
    if (!isAdmin) return
    setLoadAssets(true)
    assetApi.getAll()
      .then(r => setAssets(r.data))
      .catch(() => toast.error('Error al cargar activos'))
      .finally(() => setLoadAssets(false))
  }, [isAdmin])

  const loadAssignments = useCallback((assetId: number) => {
    setLoadAssign(true)
    assetAssignmentApi.getByAsset(assetId)
      .then(r => setAssignments(r.data))
      .catch(() => toast.error('Error al cargar asignaciones'))
      .finally(() => setLoadAssign(false))
  }, [])

  useEffect(() => {
    if (isAdmin && selectedAssetId != null) loadAssignments(selectedAssetId)
  }, [isAdmin, selectedAssetId, loadAssignments])

  const ownerUsers = users.filter(u => u.role === 'ASSET_OWNER')
  const assignableUsers = ownerUsers.filter(u => !assignments.some(a => a.userId === u.id))
  const selectedAssetName = assets.find(a => a.id === selectedAssetId)?.name ?? null

  const handleAssign = async () => {
    if (selectedAssetId == null || userToAssign === '') return
    setAssigning(true)
    try {
      await assetAssignmentApi.assign(selectedAssetId, { userId: userToAssign })
      toast.success('Usuario asignado')
      setUserToAssign('')
      loadAssignments(selectedAssetId)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al asignar')
    } finally {
      setAssigning(false)
    }
  }

  const handleUnassign = async (userId: number) => {
    if (selectedAssetId == null) return
    try {
      await assetAssignmentApi.unassign(selectedAssetId, userId)
      toast.success('Asignación eliminada')
      loadAssignments(selectedAssetId)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al desasignar')
    }
  }

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
      setErrorsTotal(prev => prev - 1)
      toast.success('Error eliminado del log')
    } catch { toast.error('Error al eliminar') }
  }

  // ── Entornos ──────────────────────────────────────────────────────────────
  const openCreateEnv = () => { setEditingEnv(null); setEnvForm(EMPTY_ENV); setEnvModal(true) }
  const openEditEnv = (e: Environment) => {
    setEditingEnv(e)
    setEnvForm({ name: e.name, businessCriticality: e.businessCriticality, description: e.description ?? '' })
    setEnvModal(true)
  }
  const fEnv = (k: keyof EnvironmentRequest, v: string) => setEnvForm(prev => ({ ...prev, [k]: v }))

  const handleSaveEnv = async () => {
    setSavingEnv(true)
    try {
      if (editingEnv) {
        await environmentApi.update(editingEnv.id, envForm)
        toast.success('Entorno actualizado')
      } else {
        await environmentApi.create(envForm)
        toast.success('Entorno creado')
      }
      setEnvModal(false)
      loadEnvironments()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSavingEnv(false)
    }
  }

  const handleDeleteEnv = async (id: number) => {
    if (!confirm('¿Eliminar este entorno? Los activos que lo tenían asignado quedan sin entorno.')) return
    try {
      await environmentApi.delete(id)
      toast.success('Entorno eliminado')
      loadEnvironments()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  // ── Tipos de host ─────────────────────────────────────────────────────────
  const openCreateAT = () => { setEditingAT(null); setAtName(''); setAtModal(true) }
  const openEditAT = (t: AssetType) => { setEditingAT(t); setAtName(t.name); setAtModal(true) }

  const handleSaveAT = async () => {
    setSavingAT(true)
    try {
      if (editingAT) {
        await assetTypeApi.update(editingAT.id, { name: atName })
        toast.success('Tipo de host actualizado')
      } else {
        await assetTypeApi.create({ name: atName })
        toast.success('Tipo de host creado')
      }
      setAtModal(false)
      loadAssetTypes()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSavingAT(false)
    }
  }

  const handleDeleteAT = async (id: number) => {
    if (!confirm('¿Eliminar este tipo de host? Los activos ya creados con este tipo no se ven afectados.')) return
    try {
      await assetTypeApi.delete(id)
      toast.success('Tipo de host eliminado')
      loadAssetTypes()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  // ── Ecosistemas ───────────────────────────────────────────────────────────
  const openCreateEco = () => { setEditingEco(null); setEcoName(''); setEcoModal(true) }
  const openEditEco = (e: Ecosystem) => { setEditingEco(e); setEcoName(e.name); setEcoModal(true) }

  const handleSaveEco = async () => {
    setSavingEco(true)
    try {
      if (editingEco) {
        await ecosystemApi.update(editingEco.id, { name: ecoName })
        toast.success('Ecosistema actualizado')
      } else {
        await ecosystemApi.create({ name: ecoName })
        toast.success('Ecosistema creado')
      }
      setEcoModal(false)
      loadEcosystems()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSavingEco(false)
    }
  }

  const handleDeleteEco = async (id: number) => {
    if (!confirm('¿Eliminar este ecosistema? Los componentes ya creados con este ecosistema no se ven afectados.')) return
    try {
      await ecosystemApi.delete(id)
      toast.success('Ecosistema eliminado')
      loadEcosystems()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    }
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

  const assignmentColumns: Column<UserAssetAssignment>[] = [
    { key: 'username',     label: 'Username',  render: v => <span className="font-mono text-xs">{String(v)}</span> },
    { key: 'userFullName', label: 'Nombre completo', render: v => String(v ?? '—') },
    { key: 'assignedAt',   label: 'Asignado el', render: v => v ? new Date(String(v)).toLocaleDateString('es-AR') : '—' },
    {
      key: 'userId', label: '',
      render: v => (
        <button onClick={() => handleUnassign(Number(v))} className="btn-ghost !py-1 !px-2 text-red-400"><Trash2 size={13} /></button>
      ),
    },
  ]

  const environmentColumns: Column<Environment>[] = [
    { key: 'name', label: 'Nombre' },
    {
      key: 'businessCriticality', label: 'Criticidad',
      render: v => <span className={`badge ${CRITICALITY_BADGE[String(v)] ?? 'bg-slate-700 text-slate-300'}`}>{String(v)}</span>,
    },
    { key: 'description', label: 'Descripción', render: v => <span className="text-xs text-slate-400 line-clamp-2 max-w-xs">{v ? String(v) : '—'}</span> },
    {
      key: 'id', label: '',
      render: (v, row) => (
        <div className="flex gap-1">
          <button onClick={() => openEditEnv(row)} className="btn-ghost !py-1 !px-2"><Pencil size={13} /></button>
          <button onClick={() => handleDeleteEnv(Number(v))} className="btn-ghost !py-1 !px-2 text-red-400"><Trash2 size={13} /></button>
        </div>
      ),
    },
  ]

  const assetTypeColumns: Column<AssetType>[] = [
    { key: 'name', label: 'Nombre', render: v => <span className="font-mono text-xs">{String(v)}</span> },
    {
      key: 'id', label: '',
      render: (v, row) => (
        <div className="flex gap-1">
          <button onClick={() => openEditAT(row)} className="btn-ghost !py-1 !px-2"><Pencil size={13} /></button>
          <button onClick={() => handleDeleteAT(Number(v))} className="btn-ghost !py-1 !px-2 text-red-400"><Trash2 size={13} /></button>
        </div>
      ),
    },
  ]

  const ecosystemColumns: Column<Ecosystem>[] = [
    { key: 'name', label: 'Nombre', render: v => <span className="font-mono text-xs">{String(v)}</span> },
    {
      key: 'id', label: '',
      render: (v, row) => (
        <div className="flex gap-1">
          <button onClick={() => openEditEco(row)} className="btn-ghost !py-1 !px-2"><Pencil size={13} /></button>
          <button onClick={() => handleDeleteEco(Number(v))} className="btn-ghost !py-1 !px-2 text-red-400"><Trash2 size={13} /></button>
        </div>
      ),
    },
  ]

  if (!isAdmin) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Configuración" subtitle="Usuarios, auditores y log de errores del sistema" />
        <div className="card flex flex-col items-center justify-center gap-3 py-16 text-center">
          <ShieldOff size={32} className="text-slate-500" />
          <p className="text-slate-300 font-medium">Acceso restringido</p>
          <p className="text-sm text-slate-500">Esta sección es solo para usuarios con rol ADMIN.</p>
        </div>
      </div>
    )
  }

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
          { key: 'users',       label: 'Usuarios / Auditores' },
          { key: 'assignments', label: 'Asignaciones', icon: UserPlus },
          { key: 'environments', label: 'Entornos', icon: Globe },
          { key: 'assetTypes',  label: 'Tipos de Host', icon: Server },
          { key: 'ecosystems',  label: 'Ecosistemas', icon: Package },
          { key: 'errors',      label: 'Log de Errores', icon: AlertCircle },
        ] as { key: Tab; label: string; icon?: React.ElementType }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === t.key ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            {t.icon && <t.icon size={13} />}
            {t.label}
            {t.key === 'errors' && errorsTotal > 0 && (
              <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {errorsTotal > 9 ? '9+' : errorsTotal}
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

      {tab === 'assignments' && (
        <>
          <div className="card mb-5">
            <p className="text-sm font-medium text-white mb-4">Asignar responsable a un activo</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">1. Activo</label>
                <select
                  className="input"
                  value={selectedAssetId ?? ''}
                  disabled={loadAssets}
                  onChange={e => setSelectedAssetId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">{assets.length === 0 ? 'Sin activos' : 'Elegir activo…'}</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>{a.name}{a.environmentName ? ` · ${a.environmentName}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">2. Usuario ASSET_OWNER</label>
                <select
                  className="input"
                  value={userToAssign}
                  onChange={e => setUserToAssign(e.target.value ? Number(e.target.value) : '')}
                  disabled={assignableUsers.length === 0}
                >
                  <option value="">Elegir usuario…</option>
                  {assignableUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.username}{u.fullName ? ` (${u.fullName})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {ownerUsers.length === 0 ? (
              <p className="text-xs text-amber-400 mt-3">
                No hay usuarios con rol ASSET_OWNER todavía — creá uno desde la pestaña "Usuarios / Auditores" para poder asignarlo acá.
              </p>
            ) : (
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleAssign}
                  disabled={assigning || userToAssign === '' || selectedAssetId == null}
                  className="btn-primary"
                >
                  <Plus size={14} /> Asignar
                </button>
              </div>
            )}
          </div>

          {selectedAssetId == null ? (
            <div className="card text-center py-10">
              <p className="text-sm text-slate-500">Elegí un activo arriba para ver sus usuarios asignados.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500 mb-3">
                Usuarios asignados a <span className="text-white font-medium">{selectedAssetName}</span>
              </p>
              <div className="card p-0 overflow-hidden rounded-xl border border-surface-600">
                <Table
                  columns={assignmentColumns}
                  data={assignments}
                  loading={loadAssign}
                  emptyMessage="Este activo no tiene usuarios asignados"
                />
              </div>
            </>
          )}
        </>
      )}

      {tab === 'environments' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-slate-500">{environments.length} entorno(s)</p>
            <button onClick={openCreateEnv} className="btn-primary"><Plus size={14} /> Nuevo Entorno</button>
          </div>
          <div className="card p-0 overflow-hidden rounded-xl border border-surface-600">
            <Table columns={environmentColumns} data={environments} loading={loadEnv} emptyMessage="No hay entornos" />
          </div>
        </>
      )}

      {tab === 'assetTypes' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-slate-500">{assetTypes.length} tipo(s) de host</p>
            <button onClick={openCreateAT} className="btn-primary"><Plus size={14} /> Nuevo Tipo</button>
          </div>
          <div className="card p-0 overflow-hidden rounded-xl border border-surface-600">
            <Table columns={assetTypeColumns} data={assetTypes} loading={loadAT} emptyMessage="No hay tipos de host" />
          </div>
        </>
      )}

      {tab === 'ecosystems' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-slate-500">{ecosystems.length} ecosistema(s)</p>
            <button onClick={openCreateEco} className="btn-primary"><Plus size={14} /> Nuevo Ecosistema</button>
          </div>
          <div className="card p-0 overflow-hidden rounded-xl border border-surface-600">
            <Table columns={ecosystemColumns} data={ecosystems} loading={loadEco} emptyMessage="No hay ecosistemas" />
          </div>
        </>
      )}

      {tab === 'errors' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-slate-500">{errorsTotal} error(es) en el log</p>
            <button onClick={() => loadErrors(errorPage)} disabled={loadE} className="btn-ghost">
              <RefreshCw size={13} className={loadE ? 'animate-spin' : ''} /> Recargar
            </button>
          </div>
          <div className="card p-0 overflow-hidden rounded-xl border border-surface-600">
            <Table
              columns={errorColumns}
              data={errors}
              loading={loadE}
              emptyMessage="✓ Sin errores registrados"
              pageSize={ERRORS_PAGE_SIZE}
              page={errorPage}
              totalItems={errorsTotal}
              onPageChange={loadErrors}
            />
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
          {!editing && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Contraseña *</label>
              <input className="input" type="password" value={form.password ?? ''} onChange={e => f('password', e.target.value)} placeholder="••••••••" />
            </div>
          )}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Rol</label>
            <select className="input" value={form.role} onChange={e => f('role', e.target.value)}>
              <option value="ADMIN">ADMIN</option>
              <option value="SECURITY_ANALYST">SECURITY_ANALYST</option>
              <option value="ASSET_OWNER">ASSET_OWNER</option>
              <option value="AUDITOR">AUDITOR</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setModal(false)} className="btn-ghost">Cancelar</button>
            <button
              onClick={handleSave}
              disabled={saving || !form.username || (!editing && !form.password)}
              className="btn-primary"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal entorno */}
      <Modal title={editingEnv ? 'Editar Entorno' : 'Nuevo Entorno'} open={envModal} onClose={() => setEnvModal(false)}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nombre *</label>
            <input className="input" value={envForm.name} onChange={e => fEnv('name', e.target.value)} placeholder="ej: Producción" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Criticidad de negocio</label>
            <select className="input" value={envForm.businessCriticality} onChange={e => fEnv('businessCriticality', e.target.value)}>
              {CRITICALITY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Descripción</label>
            <textarea className="input resize-none" rows={2} value={envForm.description} onChange={e => fEnv('description', e.target.value)} placeholder="Descripción opcional…" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setEnvModal(false)} className="btn-ghost">Cancelar</button>
            <button onClick={handleSaveEnv} disabled={savingEnv || !envForm.name} className="btn-primary">
              {savingEnv ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal tipo de host */}
      <Modal title={editingAT ? 'Editar Tipo de Host' : 'Nuevo Tipo de Host'} open={atModal} onClose={() => setAtModal(false)} size="sm">
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nombre *</label>
            <input className="input font-mono" value={atName} onChange={e => setAtName(e.target.value.toUpperCase())} placeholder="ej: MAINFRAME" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setAtModal(false)} className="btn-ghost">Cancelar</button>
            <button onClick={handleSaveAT} disabled={savingAT || !atName} className="btn-primary">
              {savingAT ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal ecosistema */}
      <Modal title={editingEco ? 'Editar Ecosistema' : 'Nuevo Ecosistema'} open={ecoModal} onClose={() => setEcoModal(false)} size="sm">
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nombre *</label>
            <input className="input font-mono" value={ecoName} onChange={e => setEcoName(e.target.value.toLowerCase())} placeholder="ej: docker" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setEcoModal(false)} className="btn-ghost">Cancelar</button>
            <button onClick={handleSaveEco} disabled={savingEco || !ecoName} className="btn-primary">
              {savingEco ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
