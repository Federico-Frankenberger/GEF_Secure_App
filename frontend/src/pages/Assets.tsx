import { useEffect, useState, useCallback, useMemo } from 'react'
import { Plus, Search, Pencil, Trash2, ScanLine, RefreshCw, Archive, RotateCcw, Syringe, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { assetApi, environmentApi, softwareComponentApi, assetTypeApi, ecosystemApi, inventoryApi } from '../services/api'
import type { Asset, AssetRequest, DeletedAsset, Environment, SoftwareComponent, SoftwareComponentRequest, SoftwareCatalogEntry, AssetType, Ecosystem, InventorySummary, InventoryItemStatus } from '../types'
import PageHeader from '../components/PageHeader'
import Table, { Column } from '../components/Table'
import Modal from '../components/Modal'
import SoftwareAutocomplete from '../components/SoftwareAutocomplete'
import { useScanPolling } from '../hooks/useScanPolling'
import { useAuth } from '../contexts/AuthContext'

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

// FE-09 (docs/20-08-26/AUDITORIA_END_TO_END.md): formato exacto que espera GitHub
// Advisory por ecosistema en modo texto libre (ver informe §4/§14, normalización).
const ECOSYSTEM_FORMAT_HINT: Record<string, string> = {
  maven: 'Maven: coordenada completa groupId:artifactId (ej: org.springframework.boot:spring-boot-starter-web), no solo el artifactId.',
  npm: 'npm: nombre del paquete tal cual figura en el registro (ej: @scope/paquete si es scoped).',
  pip: 'pip: nombre normalizado del paquete de PyPI (guiones, no guiones bajos).',
  composer: 'Composer: vendor/paquete (ej: contao/contao).',
  nuget: 'NuGet: nombre del paquete tal cual figura en nuget.org.',
  cargo: 'Cargo: nombre del crate tal cual figura en crates.io.',
  go: 'Go: ruta del módulo completa (ej: github.com/org/repo).',
  rubygems: 'RubyGems: nombre del gem tal cual figura en rubygems.org.',
}

const INVENTORY_STATUS_BADGE: Record<InventoryItemStatus, string> = {
  NUEVO:         'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30',
  ACTUALIZADO:   'bg-amber-600/20 text-amber-400 border border-amber-600/30',
  SIN_CAMBIOS:   'bg-slate-600/30 text-slate-300 border border-slate-500/30',
  NO_RECONOCIDO: 'bg-[#f9f15c]/15 text-yellow-200 border border-[#f9f15c]/30',
  ERROR:         'bg-[#bd1e1e]/20 text-[#bd1e1e] border border-[#bd1e1e]/40',
}
const INVENTORY_STATUS_LABEL: Record<InventoryItemStatus, string> = {
  NUEVO: 'Nuevo', ACTUALIZADO: 'Actualizado', SIN_CAMBIOS: 'Sin cambios',
  NO_RECONOCIDO: 'No reconocido', ERROR: 'Error',
}

const EMPTY_ASSET_FORM: AssetRequest = {
  name: '', assetType: 'SERVIDOR', environmentId: undefined, description: '',
}
// El form permite assetId transitoriamente undefined mientras el usuario no eligio host
// todavia (el "Guardar" se deshabilita hasta que lo elija) -- el wire type SoftwareComponentRequest
// exige assetId: number siempre.
type ComponentFormState = Omit<SoftwareComponentRequest, 'assetId'> & { assetId: number | undefined }

const EMPTY_COMPONENT_FORM: ComponentFormState = {
  name: '', software: '', ecosystem: '', version: '', assetId: undefined, description: '',
}

type Selection = number | null
type Tab = 'vigentes' | 'eliminados'

export default function Assets() {
  const { user } = useAuth()
  const canWrite = user?.role === 'ADMIN' || user?.role === 'SECURITY_ANALYST'
  const isAdmin = user?.role === 'ADMIN'

  const [tab, setTab] = useState<Tab>('vigentes')
  const [injecting, setInjecting] = useState(false)
  const [assets,       setAssets]       = useState<Asset[]>([])
  const [components,   setComponents]   = useState<SoftwareComponent[]>([])
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [assetTypes,   setAssetTypes]   = useState<AssetType[]>([])
  const [ecosystems,   setEcosystems]   = useState<Ecosystem[]>([])
  const [loading,       setLoading]       = useState(true)
  const [loadingComps,  setLoadingComps]  = useState(true)
  const [search,        setSearch]        = useState('')
  const [selected,      setSelected]      = useState<Selection>(null)

  const loadAssets = useCallback((q = '') => {
    setLoading(true)
    assetApi.getAll(q)
      .then(r => setAssets(r.data))
      .catch(() => toast.error('Error al cargar activos'))
      .finally(() => setLoading(false))
  }, [])

  const loadComponents = useCallback(() => {
    setLoadingComps(true)
    softwareComponentApi.getAll()
      .then(r => setComponents(r.data))
      .catch(() => toast.error('Error al cargar componentes'))
      .finally(() => setLoadingComps(false))
  }, [])

  const handleInjectAsset = async () => {
    setInjecting(true)
    try {
      await assetApi.injectTestData()
      toast('Inyectando activo de prueba…')
      // El flujo de n8n consulta GitHub Advisory por 4 severidades y hace 2 INSERTs --
      // no hay callback de "listo", se espera un tiempo prudencial y se refresca.
      setTimeout(() => {
        loadAssets(search)
        loadComponents()
        toast.success('Activo de prueba inyectado')
        setInjecting(false)
      }, 4000)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al inyectar el activo de prueba')
      setInjecting(false)
    }
  }

  useEffect(() => {
    loadAssets()
    loadComponents()
    environmentApi.getAll()
      .then(r => setEnvironments(r.data))
      .catch(() => toast.error('Error al cargar entornos'))
    assetTypeApi.getAll()
      .then(r => setAssetTypes(r.data))
      .catch(() => toast.error('Error al cargar tipos de host'))
    ecosystemApi.getAll()
      .then(r => setEcosystems(r.data))
      .catch(() => toast.error('Error al cargar ecosistemas'))
  }, [loadAssets, loadComponents])

  const countFor = (assetId: number) => components.filter(c => c.assetId === assetId).length

  const detailComponents = useMemo(() => {
    if (selected === null) return []
    return components.filter(c => c.assetId === selected)
  }, [components, selected])

  const selectedAsset = selected !== null ? assets.find(a => a.id === selected) ?? null : null

  // ── Activo (host) — alta/edición/borrado ────────────────────────────────
  const [assetModal,   setAssetModal]   = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [assetForm,    setAssetForm]    = useState<AssetRequest>(EMPTY_ASSET_FORM)
  const [savingAsset,  setSavingAsset]  = useState(false)

  const openCreateAsset = () => { setEditingAsset(null); setAssetForm(EMPTY_ASSET_FORM); setAssetModal(true) }
  const openEditAsset = (a: Asset) => {
    setEditingAsset(a)
    setAssetForm({ name: a.name, assetType: a.assetType, environmentId: a.environmentId ?? undefined, description: a.description ?? '' })
    setAssetModal(true)
  }
  const fAsset = (k: keyof AssetRequest, v: string | number | undefined) => setAssetForm(prev => ({ ...prev, [k]: v }))

  const handleSaveAsset = async () => {
    setSavingAsset(true)
    try {
      if (editingAsset) {
        await assetApi.update(editingAsset.id, assetForm)
        toast.success('Activo actualizado')
      } else {
        await assetApi.create(assetForm)
        toast.success('Activo creado')
      }
      setAssetModal(false)
      loadAssets()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSavingAsset(false)
    }
  }

  const handleDeleteAsset = async (id: number) => {
    if (!confirm('¿Eliminar este activo? El activo y su software instalado se marcan como eliminados (no se pierden) — se pueden restaurar después desde la pestaña "Eliminados".')) return
    try {
      await assetApi.delete(id)
      toast.success('Activo eliminado')
      if (selected === id) setSelected(null)
      loadAssets()
      loadComponents()
      loadDeleted()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  // ── Activos eliminados — pestaña de restauración (ADMIN/SECURITY_ANALYST) ─
  const [deletedAssets, setDeletedAssets] = useState<DeletedAsset[]>([])
  const [loadingDeleted, setLoadingDeleted] = useState(false)
  const [restoring,     setRestoring]     = useState<number | null>(null)

  const loadDeleted = useCallback(() => {
    if (!canWrite) return
    setLoadingDeleted(true)
    assetApi.getDeleted()
      .then(r => setDeletedAssets(r.data))
      .catch(() => toast.error('Error al cargar activos eliminados'))
      .finally(() => setLoadingDeleted(false))
  }, [canWrite])

  useEffect(() => { loadDeleted() }, [loadDeleted])

  const handleRestore = async (id: number) => {
    setRestoring(id)
    try {
      await assetApi.restore(id)
      toast.success('Activo restaurado')
      loadDeleted()
      loadAssets()
      loadComponents()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al restaurar')
    } finally {
      setRestoring(null)
    }
  }

  // ── Componente de software — alta/edición/borrado/escaneo ───────────────
  const [compModal,        setCompModal]        = useState(false)
  const [editingComp,      setEditingComp]      = useState<SoftwareComponent | null>(null)
  const [compForm,         setCompForm]         = useState<ComponentFormState>(EMPTY_COMPONENT_FORM)
  const [savingComp,       setSavingComp]       = useState(false)
  const [scanning,         setScanning]         = useState<number | null>(null)
  const [catalogFallback,  setCatalogFallback]  = useState(false)
  const [ecosystemLocked,  setEcosystemLocked]  = useState(false)
  const { start: startPolling } = useScanPolling()

  // ── Importación de inventario (SBOM CycloneDX, ej. Syft) ─────────────────
  const [inventoryModal,   setInventoryModal]   = useState(false)
  const [inventoryFile,    setInventoryFile]    = useState<File | null>(null)
  const [inventoryPreview, setInventoryPreview] = useState<InventorySummary | null>(null)
  const [inventoryBusy,    setInventoryBusy]    = useState(false)

  const openInventoryModal = () => {
    setInventoryFile(null)
    setInventoryPreview(null)
    setInventoryModal(true)
  }

  const closeInventoryModal = () => {
    setInventoryModal(false)
    setInventoryFile(null)
    setInventoryPreview(null)
  }

  // FE-08 (docs/20-08-26/AUDITORIA_END_TO_END.md): mismo límite que
  // `spring.servlet.multipart.max-file-size` (backend/application.properties) -- antes el
  // usuario descubría un SBOM demasiado grande recién al chocar contra un 413 después de
  // subirlo entero.
  const MAX_INVENTORY_FILE_BYTES = 15 * 1024 * 1024

  const handleInventoryFileChange = (file: File | null) => {
    if (file && file.size > MAX_INVENTORY_FILE_BYTES) {
      toast.error('El archivo supera el tamaño máximo permitido (15 MB)')
      setInventoryFile(null)
      setInventoryPreview(null)
      return
    }
    setInventoryFile(file)
    setInventoryPreview(null)
  }

  const handleInventoryPreview = async () => {
    if (!inventoryFile || selected === null) return
    setInventoryBusy(true)
    try {
      const { data } = await inventoryApi.preview(selected, inventoryFile)
      setInventoryPreview(data)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al leer el archivo')
    } finally {
      setInventoryBusy(false)
    }
  }

  const handleInventoryImport = async () => {
    if (!inventoryFile || selected === null) return
    setInventoryBusy(true)
    try {
      const { data } = await inventoryApi.import(selected, inventoryFile)
      toast.success(`Importación completa: ${data.nuevos} nuevos, ${data.actualizados} actualizados`)
      closeInventoryModal()
      loadComponents()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al importar el inventario')
    } finally {
      setInventoryBusy(false)
    }
  }

  const openCreateComponent = () => {
    if (selected === null) return
    setEditingComp(null)
    setCompForm({ ...EMPTY_COMPONENT_FORM, assetId: selected })
    setCatalogFallback(false)
    setEcosystemLocked(false)
    setCompModal(true)
  }

  const openEditComponent = (c: SoftwareComponent) => {
    setEditingComp(c)
    setCompForm({
      name: c.name, software: c.software, ecosystem: c.ecosystem, version: c.version,
      assetId: c.assetId ?? undefined, description: c.description ?? '',
    })
    setCatalogFallback(!c.catalogued)
    setEcosystemLocked(c.catalogued)
    setCompModal(true)
  }

  const handleCatalogSelect = (entry: SoftwareCatalogEntry) => {
    fComp('software', entry.packageName)
    fComp('ecosystem', entry.ecosystem)
    setEcosystemLocked(true)
  }

  const fComp = (k: keyof ComponentFormState, v: string | number | undefined) =>
    setCompForm(prev => ({ ...prev, [k]: v }))

  const handleSaveComponent = async () => {
    if (compForm.assetId == null) return
    const payload: SoftwareComponentRequest = { ...compForm, assetId: compForm.assetId }
    setSavingComp(true)
    try {
      if (editingComp) {
        await softwareComponentApi.update(editingComp.id, payload)
        toast.success('Componente actualizado')
      } else {
        await softwareComponentApi.create(payload)
        toast.success('Componente creado')
      }
      setCompModal(false)
      loadComponents()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSavingComp(false)
    }
  }

  const handleDeleteComponent = async (id: number) => {
    if (!confirm('¿Eliminar este componente?')) return
    try {
      await softwareComponentApi.delete(id)
      toast.success('Componente eliminado')
      loadComponents()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  const handleScan = async (component: SoftwareComponent) => {
    // FE-06 (docs/20-08-26/AUDITORIA_END_TO_END.md): antes `setScanning(null)` corria en
    // el `finally`, es decir apenas resolvia el POST inicial -- el boton se rehabilitaba
    // mucho antes de que el escaneo (asincrono, hasta 30s) terminara, permitiendo disparar
    // un segundo escaneo real del mismo componente mientras el primero seguia corriendo.
    // Ahora `scanning` se mantiene hasta que el polling termina de verdad (completo,
    // timeout, o el POST inicial fallo).
    setScanning(component.id)
    try {
      await softwareComponentApi.triggerScan(component.id)
      toast('Escaneo disparado, esperando resultado…')
      startPolling('ACTIVO', component.name, () => {
        toast.success(`Escaneo de "${component.name}" completo`)
        loadComponents()
        setScanning(null)
      }, () => {
        toast.error(`El escaneo de "${component.name}" no respondió a tiempo. Puede seguir corriendo en segundo plano; revisá el Centro de Escaneos más tarde.`)
        setScanning(null)
      })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al disparar el escaneo')
      setScanning(null)
    }
  }

  // ── Columnas ──────────────────────────────────────────────────────────
  const assetColumns: Column<Asset>[] = [
    { key: 'name',      label: 'Nombre' },
    { key: 'assetType', label: 'Tipo', render: v => <span className="badge bg-slate-700 text-slate-300">{String(v)}</span> },
    { key: 'environmentName', label: 'Entorno', render: v => <span className="text-xs text-slate-300">{v ? String(v) : '—'}</span> },
    { key: 'componentsCount', label: 'Componentes', render: (_v, row) => <span className="font-mono text-xs">{countFor(row.id)}</span> },
    { key: 'description', label: 'Descripción', render: v => <span className="text-xs text-slate-400 line-clamp-2 max-w-xs">{v ? String(v) : '—'}</span> },
    ...(canWrite ? [{
      key: 'id', label: 'Acciones',
      render: (v: unknown, row: Asset) => (
        <div className="flex items-center gap-1">
          <button onClick={e => { e.stopPropagation(); openEditAsset(row) }} className="btn-ghost !py-1 !px-2"><Pencil size={13} /></button>
          <button onClick={e => { e.stopPropagation(); handleDeleteAsset(Number(v)) }} className="btn-ghost !py-1 !px-2 text-red-400"><Trash2 size={13} /></button>
        </div>
      ),
    }] : []),
  ]

  const componentColumns: Column<SoftwareComponent>[] = [
    {
      key: 'name', label: 'Nombre',
      render: v => <span className="block max-w-[180px] truncate" title={String(v)}>{String(v)}</span>,
    },
    {
      key: 'software', label: 'Software',
      render: (v, row) => (
        <span className="inline-flex items-center gap-1.5 max-w-[220px]">
          <span className="truncate min-w-0" title={String(v)}>{String(v)}</span>
          {!row.catalogued && (
            <span className="badge bg-slate-700 text-slate-300 shrink-0" title="No está en el catálogo de GitHub Advisory: no participa de la correlación automática de vulnerabilidades">
              no catalogado
            </span>
          )}
        </span>
      ),
    },
    { key: 'ecosystem', label: 'Ecosistema' },
    { key: 'version', label: 'Versión', render: v => <span className="font-mono text-xs">{String(v)}</span> },
    { key: 'environmentName', label: 'Entorno', render: v => <span className="text-xs text-slate-300">{v ? String(v) : '—'}</span> },
    {
      key: 'businessCriticality', label: 'Criticidad',
      render: v => v
        ? <span className={`badge ${CRITICALITY_BADGE[String(v)] ?? 'bg-slate-700 text-slate-300'}`}>{String(v)}</span>
        : <span className="text-slate-500 text-xs">—</span>,
    },
    { key: 'lastScan', label: 'Último Scan', render: v => v ? new Date(String(v)).toLocaleString('es-AR') : '—' },
    ...(canWrite ? [{
      key: 'id', label: 'Acciones',
      render: (v: unknown, row: SoftwareComponent) => (
        <div className="flex items-center gap-1">
          <button onClick={() => handleScan(row)} disabled={scanning === Number(v)} className="btn-ghost !py-1 !px-2 text-emerald-400">
            {scanning === Number(v) ? <RefreshCw size={13} className="animate-spin" /> : <ScanLine size={13} />}
          </button>
          <button onClick={() => openEditComponent(row)} className="btn-ghost !py-1 !px-2"><Pencil size={13} /></button>
          <button onClick={() => handleDeleteComponent(Number(v))} className="btn-ghost !py-1 !px-2 text-red-400"><Trash2 size={13} /></button>
        </div>
      ),
    }] : []),
  ]

  const deletedColumns: Column<DeletedAsset>[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'assetType', label: 'Tipo', render: v => <span className="badge bg-slate-700 text-slate-300">{String(v)}</span> },
    { key: 'environmentName', label: 'Entorno', render: v => <span className="text-xs text-slate-300">{v ? String(v) : '—'}</span> },
    { key: 'componentsCount', label: 'Componentes afectados', render: v => <span className="font-mono text-xs">{String(v)}</span> },
    { key: 'deletedAt', label: 'Eliminado el', render: v => new Date(String(v)).toLocaleString('es-AR') },
    {
      key: 'id', label: '',
      render: (v) => (
        <button
          onClick={() => handleRestore(Number(v))}
          disabled={restoring === Number(v)}
          className="btn-ghost !py-1 !px-2 text-emerald-400"
        >
          <RotateCcw size={13} className={restoring === Number(v) ? 'animate-spin' : ''} /> Restaurar
        </button>
      ),
    },
  ]

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Activos"
        subtitle="Servidores, aplicaciones y el software instalado en cada uno"
        actions={tab === 'vigentes' && (
          <>
            {isAdmin && (
              <button onClick={handleInjectAsset} disabled={injecting} className="btn-ghost">
                <Syringe size={14} /> {injecting ? 'Inyectando…' : 'Inyectar Activo'}
              </button>
            )}
            {canWrite && <button onClick={openCreateAsset} className="btn-primary"><Plus size={14} /> Nuevo Activo</button>}
          </>
        )}
      />

      <div className="flex gap-1 mb-5 bg-surface-800 border border-surface-600 rounded-xl p-1 w-fit">
        {([
          { key: 'vigentes', label: 'Vigentes' },
          ...(canWrite ? [{ key: 'eliminados' as Tab, label: 'Eliminados' }] : []),
        ] as { key: Tab; label: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === t.key ? 'bg-brand-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            {t.key === 'eliminados' && <Archive size={13} />}
            {t.label}
            {t.key === 'eliminados' && deletedAssets.length > 0 && (
              <span className="ml-1 bg-slate-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {deletedAssets.length > 9 ? '9+' : deletedAssets.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'vigentes' && (
        <>
          <form onSubmit={e => { e.preventDefault(); loadAssets(search) }} className="flex gap-2 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input className="input pl-8" placeholder="Buscar activo…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button type="submit" className="btn-primary">Buscar</button>
            <button type="button" onClick={() => { setSearch(''); loadAssets() }} className="btn-ghost">Limpiar</button>
          </form>

          <div className="card p-0 overflow-hidden rounded-xl border border-surface-600 mb-6">
            <Table
              columns={assetColumns}
              data={assets}
              loading={loading}
              emptyMessage="No hay activos registrados"
              onRowClick={a => setSelected(prev => prev === a.id ? null : a.id)}
              selectedKey={selected}
              pageSize={20}
            />
          </div>

        </>
      )}

      {tab === 'eliminados' && canWrite && (
        <>
          <p className="text-sm text-slate-500 mb-4">
            Activos eliminados lógicamente junto con el software que tenían instalado en ese momento. Restaurar devuelve ambos a "Vigentes".
          </p>
          <div className="card p-0 overflow-hidden rounded-xl border border-surface-600">
            <Table
              columns={deletedColumns}
              data={deletedAssets}
              loading={loadingDeleted}
              emptyMessage="No hay activos eliminados"
              pageSize={20}
            />
          </div>
        </>
      )}

      {/* Modal software del activo seleccionado */}
      <Modal
        title={selectedAsset ? `Software de ${selectedAsset.name}` : 'Software del activo'}
        open={selected !== null && !!selectedAsset}
        onClose={() => setSelected(null)}
        size="2xl"
      >
        {selectedAsset && (
          <div className="-m-5">
            <div className="flex items-center justify-between px-5 pt-1 pb-3">
              <p className="text-xs text-slate-500">{selectedAsset.assetType} · {selectedAsset.environmentName ?? 'sin entorno'}</p>
              {canWrite && (
                <div className="flex gap-2">
                  <button onClick={openInventoryModal} className="btn-ghost !py-1.5"><Upload size={13} /> Importar inventario</button>
                  <button onClick={openCreateComponent} className="btn-primary !py-1.5"><Plus size={13} /> Agregar Software</button>
                </div>
              )}
            </div>
            <Table columns={componentColumns} data={detailComponents} loading={loadingComps} emptyMessage="Este activo no tiene software instalado" pageSize={15} />
          </div>
        )}
      </Modal>

      {/* Modal importación de inventario (SBOM CycloneDX, ej. `syft ... -o cyclonedx-json`) */}
      <Modal
        title={selectedAsset ? `Importar inventario · ${selectedAsset.name}` : 'Importar inventario'}
        open={inventoryModal}
        onClose={closeInventoryModal}
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Subí el SBOM (formato CycloneDX JSON) generado con Syft para este activo, ej: <code className="text-slate-300">syft dir:C:\apps\mi-app -o cyclonedx-json</code>.
          </p>

          <input
            type="file"
            accept="application/json,.json"
            onChange={e => handleInventoryFileChange(e.target.files?.[0] ?? null)}
            className="input"
          />

          {inventoryPreview && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="badge bg-slate-700 text-slate-300">Total: {inventoryPreview.total}</span>
                <span className={`badge ${INVENTORY_STATUS_BADGE.NUEVO}`}>Nuevos: {inventoryPreview.nuevos}</span>
                <span className={`badge ${INVENTORY_STATUS_BADGE.ACTUALIZADO}`}>Actualizados: {inventoryPreview.actualizados}</span>
                <span className={`badge ${INVENTORY_STATUS_BADGE.SIN_CAMBIOS}`}>Sin cambios: {inventoryPreview.sinCambios}</span>
                {inventoryPreview.noReconocidos > 0 && (
                  <span className={`badge ${INVENTORY_STATUS_BADGE.NO_RECONOCIDO}`}>No reconocidos: {inventoryPreview.noReconocidos}</span>
                )}
                {inventoryPreview.errores > 0 && (
                  <span className={`badge ${INVENTORY_STATUS_BADGE.ERROR}`}>Errores: {inventoryPreview.errores}</span>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto rounded-lg border border-surface-600">
                <table className="w-full text-xs">
                  <thead className="bg-surface-800 text-slate-400">
                    <tr>
                      <th className="text-left px-3 py-2">Paquete</th>
                      <th className="text-left px-3 py-2">Ecosistema</th>
                      <th className="text-left px-3 py-2">Versión</th>
                      <th className="text-left px-3 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryPreview.items.map((item, i) => (
                      <tr key={i} className="border-t border-surface-700">
                        <td className="px-3 py-2 font-mono text-slate-300">{item.coordinate}</td>
                        <td className="px-3 py-2 text-slate-400">{item.ecosystem ?? '—'}</td>
                        <td className="px-3 py-2 font-mono text-slate-400">
                          {item.previousVersion ? `${item.previousVersion} → ${item.version}` : item.version ?? '—'}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`badge ${INVENTORY_STATUS_BADGE[item.status]}`} title={item.detail ?? undefined}>
                            {INVENTORY_STATUS_LABEL[item.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={closeInventoryModal} className="btn-ghost">Cancelar</button>
            {!inventoryPreview ? (
              <button onClick={handleInventoryPreview} disabled={!inventoryFile || inventoryBusy} className="btn-primary">
                {inventoryBusy ? 'Leyendo…' : 'Vista previa'}
              </button>
            ) : (
              <button onClick={handleInventoryImport} disabled={inventoryBusy} className="btn-primary">
                {inventoryBusy ? 'Importando…' : 'Confirmar importación'}
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal activo (host) */}
      <Modal title={editingAsset ? 'Editar Activo' : 'Nuevo Activo'} open={assetModal} onClose={() => setAssetModal(false)}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nombre *</label>
            <input className="input" value={assetForm.name} onChange={e => fAsset('name', e.target.value)} placeholder="ej: servidor_oficina" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tipo</label>
              <select className="input" value={assetForm.assetType} onChange={e => fAsset('assetType', e.target.value)}>
                {assetTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Entorno</label>
              <select
                className="input"
                value={assetForm.environmentId ?? ''}
                onChange={e => fAsset('environmentId', e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">Sin entorno</option>
                {environments.map(env => (
                  <option key={env.id} value={env.id}>{env.name} {env.businessCriticality ? `(${env.businessCriticality})` : ''}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Descripción</label>
            <textarea className="input resize-none" rows={2} value={assetForm.description} onChange={e => fAsset('description', e.target.value)} placeholder="Descripción opcional…" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setAssetModal(false)} className="btn-ghost">Cancelar</button>
            {/* FE-07 (docs/20-08-26/AUDITORIA_END_TO_END.md): único formulario de la app
                que no validaba su campo requerido antes de este fix -- se podía crear un
                activo con "Nombre" vacío pese al asterisco que lo marca como obligatorio. */}
            <button onClick={handleSaveAsset} disabled={savingAsset || !assetForm.name.trim()} className="btn-primary">{savingAsset ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </div>
      </Modal>

      {/* Modal componente de software */}
      <Modal title={editingComp ? 'Editar Componente' : 'Nuevo Componente'} open={compModal} onClose={() => setCompModal(false)}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nombre *</label>
              <input className="input" value={compForm.name} onChange={e => fComp('name', e.target.value)} placeholder="ej: lodash" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Software *</label>
              {catalogFallback ? (
                <>
                  <input className="input" value={compForm.software} onChange={e => fComp('software', e.target.value)} placeholder="ej: lodash" />
                  {/* FE-09 (docs/20-08-26/AUDITORIA_END_TO_END.md): en modo texto libre nada
                      orientaba hacia la coordenada exacta que espera GitHub Advisory por
                      ecosistema -- ya causó un falso negativo real (componente cargado como
                      "spring-boot-starter-web" en vez de la coordenada Maven completa). */}
                  {ECOSYSTEM_FORMAT_HINT[compForm.ecosystem] && (
                    <p className="text-[11px] text-slate-500 mt-1">{ECOSYSTEM_FORMAT_HINT[compForm.ecosystem]}</p>
                  )}
                </>
              ) : (
                <SoftwareAutocomplete
                  value={compForm.software}
                  onChange={v => { fComp('software', v); setEcosystemLocked(false) }}
                  onSelect={handleCatalogSelect}
                  placeholder="Buscar paquete… ej: express"
                />
              )}
              <button
                type="button"
                onClick={() => { setCatalogFallback(v => !v); setEcosystemLocked(false) }}
                className="text-xs text-slate-500 hover:text-slate-300 mt-1"
              >
                {catalogFallback ? 'Volver a buscar en el catálogo' : 'No está en el catálogo — cargar como texto libre'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Ecosistema</label>
              <select className="input" value={compForm.ecosystem} onChange={e => fComp('ecosystem', e.target.value)} disabled={ecosystemLocked}>
                <option value="">Seleccionar…</option>
                {ecosystems.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Versión</label>
              <input className="input font-mono" value={compForm.version} onChange={e => fComp('version', e.target.value)} placeholder="ej: 4.17.15" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Host *</label>
              <select
                className="input"
                value={compForm.assetId ?? ''}
                onChange={e => fComp('assetId', e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">Seleccionar…</option>
                {assets.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Entorno</label>
              <div className="input flex items-center text-slate-400">
                {assets.find(h => h.id === compForm.assetId)?.environmentName ?? 'Heredado del host'}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Descripción</label>
            <textarea className="input resize-none" rows={2} value={compForm.description} onChange={e => fComp('description', e.target.value)} placeholder="Descripción opcional…" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setCompModal(false)} className="btn-ghost">Cancelar</button>
            <button
              onClick={handleSaveComponent}
              disabled={savingComp || compForm.assetId == null || !compForm.name || !compForm.software}
              className="btn-primary"
            >
              {savingComp ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
