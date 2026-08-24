import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, Pencil, RefreshCw, AlertCircle, ShieldOff, UserPlus, Globe, Server, Package, Ban, CheckCircle2, Link2, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { userApi, systemErrorApi, assetApi, assetAssignmentApi, environmentApi, assetTypeApi, ecosystemApi } from '../services/api'
import type { User, UserRequest, SystemError, Asset, UserAssetAssignment, Environment, EnvironmentRequest, AssetType, Ecosystem } from '../types'
import { useAuth } from '../contexts/AuthContext'
import PageHeader from '../components/PageHeader'
import Table, { Column } from '../components/Table'
import Modal from '../components/Modal'
import { CRITICALITY_BADGE } from '../constants/badges'

const EMPTY_USER: UserRequest = { username: '', fullName: '', email: '', role: 'AUDITOR', password: '' }
const EMPTY_ENV: EnvironmentRequest = { name: '', businessCriticality: 'BAJA', description: '' }
const CRITICALITY_OPTIONS = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA']

// Centro de Administración (docs/bitacora/23-08-26, prompt_mejora_configuracion_gef_secure.md):
// antes 6 tabs planos (Usuarios, Asignaciones, Entornos, Tipos de Host, Ecosistemas, Log de
// Errores), todos al mismo nivel. Se reagrupa en 3 -- "Usuarios y Accesos" (unifica los 2
// primeros: antes había que ir a un tab aparte y elegir un ACTIVO para ver sus usuarios, ahora
// se ve todo por usuario), "Catálogos" (los 3 datos maestros triviales) y "Sistema" (log de
// errores). No se agregaron secciones de Organización/Integraciones/Seguridad/Notificaciones:
// no existe nada real que configurar ahí hoy (Slack/n8n/escaneos viven 100% en .env/n8n,
// sin ningún puente en este backend -- ver ADR-0003) y simular una pantalla para eso sería
// mentirle al usuario sobre qué hace la aplicación.
type MainTab = 'usuarios' | 'catalogos' | 'sistema'
type CatalogTab = 'environments' | 'assetTypes' | 'ecosystems'

export default function Settings() {
  const { user: currentUser } = useAuth()
  const ERRORS_PAGE_SIZE = 20
  const [users,   setUsers]   = useState<User[]>([])
  const [errors,  setErrors]  = useState<SystemError[]>([])
  const [errorsTotal, setErrorsTotal] = useState(0)
  const [errorPage,   setErrorPage]   = useState(0)
  const [loadU,   setLoadU]   = useState(true)
  const [loadE,   setLoadE]   = useState(true)
  const [mainTab,    setMainTab]    = useState<MainTab>('usuarios')
  const [catalogTab, setCatalogTab] = useState<CatalogTab>('environments')
  const [modal,   setModal]   = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form,    setForm]    = useState<UserRequest>(EMPTY_USER)
  const [saving,  setSaving]  = useState(false)
  const [togglingActiveId, setTogglingActiveId] = useState<number | null>(null)
  // Búsqueda cliente-side -- la cantidad de usuarios hoy es chica (paginación server-side
  // sería sobre-ingeniería), pero a medida que crezca esto evita tener que scrollear toda
  // la tabla para encontrar a alguien.
  const [userSearch, setUserSearch] = useState('')

  // ── Asignaciones por usuario (Centro de Administración) ───────────────────────────
  // Reemplaza el flujo anterior (elegir un Activo, ver sus usuarios) por el inverso:
  // elegir un Usuario, ver y gestionar TODOS sus activos desde un mismo modal -- es la
  // unificación real que pedía el prompt (tabla Usuario · Rol · Activos · Estado).
  const [assets, setAssets] = useState<Asset[]>([])
  const [loadAssets, setLoadAssets] = useState(true)
  const [assignUser, setAssignUser] = useState<User | null>(null)
  const [userAssignments, setUserAssignments] = useState<UserAssetAssignment[]>([])
  const [loadingUserAssignments, setLoadingUserAssignments] = useState(false)
  const [assetToAssign, setAssetToAssign] = useState<number | ''>('')
  const [assigning, setAssigning] = useState(false)

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

  const isAdmin = currentUser?.role === 'ADMIN'
  // P-11 (auditoría UX/UI) + Centro de Administración: los 3 catálogos (antes solo
  // Entornos) son igual de "datos maestros genéricos" -- sus GET ya están abiertos a
  // cualquier rol autenticado en el backend, el frontend era más restrictivo de lo
  // necesario al dejar Tipos de Host/Ecosistemas fuera de la vista de solo lectura.
  const canViewCatalogs = isAdmin || currentUser?.role === 'SECURITY_ANALYST' || currentUser?.role === 'AUDITOR'

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

  useEffect(() => {
    if (!isAdmin) return
    loadUsers()
    loadErrors()
  }, [isAdmin, loadUsers, loadErrors])

  // Catálogos: lectura para ADMIN/SECURITY_ANALYST/AUDITOR, escritura solo ADMIN (ver
  // gating de los botones de acción en cada columna de abajo).
  useEffect(() => {
    if (!canViewCatalogs) return
    loadEnvironments()
    loadAssetTypes()
    loadEcosystems()
  }, [canViewCatalogs, loadEnvironments, loadAssetTypes, loadEcosystems])

  useEffect(() => {
    if (!isAdmin) return
    setLoadAssets(true)
    assetApi.getAll()
      .then(r => setAssets(r.data))
      .catch(() => toast.error('Error al cargar activos'))
      .finally(() => setLoadAssets(false))
  }, [isAdmin])

  const loadUserAssignments = useCallback((userId: number) => {
    setLoadingUserAssignments(true)
    userApi.getAssignments(userId)
      .then(r => setUserAssignments(r.data))
      .catch(() => toast.error('Error al cargar los activos asignados'))
      .finally(() => setLoadingUserAssignments(false))
  }, [])

  const openAssignModal = (u: User) => {
    setAssignUser(u)
    setAssetToAssign('')
    loadUserAssignments(u.id)
  }
  const closeAssignModal = () => { setAssignUser(null); setUserAssignments([]) }

  const assignableAssets = assets.filter(a => !userAssignments.some(ua => ua.assetId === a.id))

  const filteredUsers = users.filter(u => {
    const q = userSearch.trim().toLowerCase()
    if (!q) return true
    return u.username.toLowerCase().includes(q)
      || (u.fullName ?? '').toLowerCase().includes(q)
      || (u.email ?? '').toLowerCase().includes(q)
      || u.role.toLowerCase().includes(q)
  })

  const handleAssign = async () => {
    if (!assignUser || assetToAssign === '') return
    setAssigning(true)
    try {
      await assetAssignmentApi.assign(Number(assetToAssign), { userId: assignUser.id })
      toast.success('Activo asignado')
      setAssetToAssign('')
      loadUserAssignments(assignUser.id)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al asignar')
    } finally {
      setAssigning(false)
    }
  }

  const handleUnassign = async (assetId: number) => {
    if (!assignUser) return
    try {
      await assetAssignmentApi.unassign(assetId, assignUser.id)
      toast.success('Asignación eliminada')
      loadUserAssignments(assignUser.id)
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
    if (!confirm('¿Eliminar este usuario? Si tiene historial asociado, puede que no se pueda -- considerá desactivarlo en su lugar.')) return
    try { await userApi.delete(id); toast.success('Usuario eliminado'); loadUsers() }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Error') }
  }

  // Centro de Administración (docs/bitacora/23-08-26): desactivar en vez de borrar --
  // preserva asignaciones/historial. El backend además rechaza que un ADMIN se
  // desactive a sí mismo; acá se oculta directamente esa opción para su propia fila.
  const handleToggleActive = async (u: User) => {
    setTogglingActiveId(u.id)
    try {
      await userApi.setActive(u.id, !u.active)
      toast.success(u.active ? 'Usuario desactivado' : 'Usuario reactivado')
      loadUsers()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar el estado')
    } finally {
      setTogglingActiveId(null)
    }
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
    {
      key: 'role', label: 'Rol',
      render: v => (
        <span className={`badge ${v === 'ADMIN' ? 'bg-brand-600/20 text-brand-400 border border-brand-600/30' : 'bg-slate-700 text-slate-400 border border-slate-600'}`}>
          {String(v)}
        </span>
      ),
    },
    {
      key: 'assignedAssets', label: 'Activos asignados',
      render: (_v, row) => row.role === 'ASSET_OWNER' ? (
        <button onClick={() => openAssignModal(row)} className="btn-ghost !py-1 !px-2 text-xs">
          <Link2 size={12} /> Ver / asignar
        </button>
      ) : <span className="text-slate-600 text-xs">—</span>,
    },
    {
      key: 'active', label: 'Estado',
      render: v => (
        <span className={`badge ${v ? 'bg-severity-low/15 text-severity-low border border-severity-low/30' : 'bg-slate-700 text-slate-500 border border-slate-600'}`}>
          {v ? 'Activo' : 'Inactivo'}
        </span>
      ),
    },
    {
      key: 'id', label: '',
      render: (v, row) => {
        const isSelf = row.username === currentUser?.username
        return (
          <div className="flex gap-1">
            <button onClick={() => openEdit(row)} className="btn-ghost !py-1 !px-2" aria-label={`Editar ${row.username}`}><Pencil size={13} /></button>
            <button
              onClick={() => handleToggleActive(row)}
              disabled={togglingActiveId === row.id || isSelf}
              title={isSelf ? 'No podés desactivar tu propia cuenta' : row.active ? 'Desactivar' : 'Reactivar'}
              className={`btn-ghost !py-1 !px-2 ${row.active ? 'text-amber-400' : 'text-severity-low'}`}
            >
              {row.active ? <Ban size={13} /> : <CheckCircle2 size={13} />}
            </button>
            <button onClick={() => handleDeleteUser(Number(v))} className="btn-ghost !py-1 !px-2 text-red-400" aria-label={`Eliminar ${row.username}`}><Trash2 size={13} /></button>
          </div>
        )
      },
    },
  ]

  const userAssignmentColumns: Column<UserAssetAssignment>[] = [
    { key: 'assetName', label: 'Activo' },
    { key: 'assignedAt', label: 'Asignado el', render: v => v ? new Date(String(v)).toLocaleDateString('es-AR') : '—' },
    {
      key: 'assetId', label: '',
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
    // Escritura exclusiva de ADMIN -- SECURITY_ANALYST/AUDITOR ven la tabla sin esta columna.
    ...(isAdmin ? [{
      key: 'id', label: '',
      render: (v: unknown, row: Environment) => (
        <div className="flex gap-1">
          <button onClick={() => openEditEnv(row)} className="btn-ghost !py-1 !px-2" aria-label={`Editar entorno ${row.name}`}><Pencil size={13} /></button>
          <button onClick={() => handleDeleteEnv(Number(v))} className="btn-ghost !py-1 !px-2 text-red-400" aria-label={`Eliminar entorno ${row.name}`}><Trash2 size={13} /></button>
        </div>
      ),
    }] : []),
  ]

  const assetTypeColumns: Column<AssetType>[] = [
    { key: 'name', label: 'Nombre', render: v => <span className="font-mono text-xs">{String(v)}</span> },
    ...(isAdmin ? [{
      key: 'id', label: '',
      render: (v: unknown, row: AssetType) => (
        <div className="flex gap-1">
          <button onClick={() => openEditAT(row)} className="btn-ghost !py-1 !px-2"><Pencil size={13} /></button>
          <button onClick={() => handleDeleteAT(Number(v))} className="btn-ghost !py-1 !px-2 text-red-400"><Trash2 size={13} /></button>
        </div>
      ),
    }] : []),
  ]

  const ecosystemColumns: Column<Ecosystem>[] = [
    { key: 'name', label: 'Nombre', render: v => <span className="font-mono text-xs">{String(v)}</span> },
    ...(isAdmin ? [{
      key: 'id', label: '',
      render: (v: unknown, row: Ecosystem) => (
        <div className="flex gap-1">
          <button onClick={() => openEditEco(row)} className="btn-ghost !py-1 !px-2"><Pencil size={13} /></button>
          <button onClick={() => handleDeleteEco(Number(v))} className="btn-ghost !py-1 !px-2 text-red-400"><Trash2 size={13} /></button>
        </div>
      ),
    }] : []),
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

  // ASSET_OWNER (o cualquier rol futuro fuera de los 3 con acceso a Configuración):
  // el sidebar ya oculta este link, pero si llega por URL directa, mensaje claro en
  // vez de una pantalla rota/vacía -- mismo patrón que el resto de la app.
  if (!canViewCatalogs) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Configuración" subtitle="Centro de administración" />
        <div className="card flex flex-col items-center justify-center gap-3 py-16 text-center">
          <ShieldOff size={32} className="text-slate-500" />
          <p className="text-slate-300 font-medium">Acceso restringido</p>
          <p className="text-sm text-slate-500">Esta sección no está disponible para tu rol.</p>
        </div>
      </div>
    )
  }

  const catalogTabs: { key: CatalogTab; label: string; icon: typeof Globe }[] = [
    { key: 'environments', label: 'Entornos', icon: Globe },
    { key: 'assetTypes', label: 'Tipos de Host', icon: Server },
    { key: 'ecosystems', label: 'Ecosistemas', icon: Package },
  ]

  const catalogSection = (
    <div>
      <div className="flex gap-1 mb-4 bg-surface-900 border border-surface-600 rounded-lg p-1 w-fit">
        {catalogTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setCatalogTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
              ${catalogTab === t.key ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <t.icon size={12} /> {t.label}
          </button>
        ))}
      </div>

      {catalogTab === 'environments' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-slate-500">{environments.length} entorno(s)</p>
            {isAdmin && <button onClick={openCreateEnv} className="btn-primary"><Plus size={14} /> Nuevo Entorno</button>}
          </div>
          <div className="card p-0 overflow-hidden rounded-xl border border-surface-600">
            <Table columns={environmentColumns} data={environments} loading={loadEnv} emptyMessage="No hay entornos" />
          </div>
        </>
      )}

      {catalogTab === 'assetTypes' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-slate-500">{assetTypes.length} tipo(s) de host</p>
            {isAdmin && <button onClick={openCreateAT} className="btn-primary"><Plus size={14} /> Nuevo Tipo</button>}
          </div>
          <div className="card p-0 overflow-hidden rounded-xl border border-surface-600">
            <Table columns={assetTypeColumns} data={assetTypes} loading={loadAT} emptyMessage="No hay tipos de host" />
          </div>
        </>
      )}

      {catalogTab === 'ecosystems' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-slate-500">{ecosystems.length} ecosistema(s)</p>
            {isAdmin && <button onClick={openCreateEco} className="btn-primary"><Plus size={14} /> Nuevo Ecosistema</button>}
          </div>
          <div className="card p-0 overflow-hidden rounded-xl border border-surface-600">
            <Table columns={ecosystemColumns} data={ecosystems} loading={loadEco} emptyMessage="No hay ecosistemas" />
          </div>
        </>
      )}
    </div>
  )

  if (!isAdmin) {
    // SECURITY_ANALYST/AUDITOR: solo Catálogos, de solo lectura (sin botones de acción,
    // ya gateados adentro de cada columna por `isAdmin`).
    return (
      <div className="animate-fade-in">
        <PageHeader title="Catálogos" subtitle="Entornos, tipos de host y ecosistemas (solo lectura)" />
        {catalogSection}
      </div>
    )
  }

  const mainTabs: { key: MainTab; label: string; icon: typeof UserPlus }[] = [
    { key: 'usuarios', label: 'Usuarios y Accesos', icon: UserPlus },
    { key: 'catalogos', label: 'Catálogos', icon: Globe },
    { key: 'sistema', label: 'Sistema', icon: AlertCircle },
  ]

  return (
    <div className="animate-fade-in">
      <PageHeader title="Configuración" subtitle="Centro de administración" />

      <div className="flex gap-1 mb-5 bg-surface-800 border border-surface-600 rounded-xl p-1 w-fit">
        {mainTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setMainTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${mainTab === t.key ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            <t.icon size={13} />
            {t.label}
            {t.key === 'sistema' && errorsTotal > 0 && (
              <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {errorsTotal > 9 ? '9+' : errorsTotal}
              </span>
            )}
          </button>
        ))}
      </div>

      {mainTab === 'usuarios' && (
        <>
          <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-500 whitespace-nowrap">
                {filteredUsers.length === users.length ? `${users.length} usuario(s)` : `${filteredUsers.length} de ${users.length} usuario(s)`}
              </p>
              <div className="relative w-56">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  className="input !py-1.5 !pl-7"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Buscar por nombre, usuario, email o rol…"
                />
              </div>
            </div>
            <button onClick={openCreate} className="btn-primary"><Plus size={14} /> Nuevo Usuario</button>
          </div>
          <div className="card p-0 overflow-hidden rounded-xl border border-surface-600">
            <Table columns={userColumns} data={filteredUsers} loading={loadU} emptyMessage={userSearch ? 'Ningún usuario coincide con la búsqueda' : 'No hay usuarios'} />
          </div>
        </>
      )}

      {mainTab === 'catalogos' && catalogSection}

      {mainTab === 'sistema' && (
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

      {/* Modal asignaciones por usuario */}
      <Modal
        title={assignUser ? `Activos asignados a ${assignUser.fullName || assignUser.username}` : 'Activos asignados'}
        open={!!assignUser}
        onClose={closeAssignModal}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Agregar activo</label>
              <select
                className="input"
                value={assetToAssign}
                onChange={e => setAssetToAssign(e.target.value ? Number(e.target.value) : '')}
                disabled={loadAssets || assignableAssets.length === 0}
              >
                <option value="">{assignableAssets.length === 0 ? 'Sin activos disponibles' : 'Elegir activo…'}</option>
                {assignableAssets.map(a => (
                  <option key={a.id} value={a.id}>{a.name}{a.environmentName ? ` · ${a.environmentName}` : ''}</option>
                ))}
              </select>
            </div>
            <button onClick={handleAssign} disabled={assigning || assetToAssign === ''} className="btn-primary">
              <Plus size={14} /> Asignar
            </button>
          </div>

          <div className="card p-0 overflow-hidden rounded-xl border border-surface-600">
            <Table
              columns={userAssignmentColumns}
              data={userAssignments}
              loading={loadingUserAssignments}
              emptyMessage="Sin activos asignados todavía"
            />
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
