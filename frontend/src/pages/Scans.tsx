import { useEffect, useState, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { assetApi, environmentApi, vulnApi, scanApi } from '../services/api'
import type { Asset, Environment, VulnerabilityAudit } from '../types'
import PageHeader from '../components/PageHeader'
import Table, { Column } from '../components/Table'
import { useScanPolling } from '../hooks/useScanPolling'

// Datos sembrados usan prioridad en español (CRITICA/ALTA/...); el workflow
// de n8n produce inglés (CRITICAL/HIGH/...) -- mismo mapeo dual que ya usa
// Inventory.tsx (CRITICALITY_BADGE) para esta misma inconsistencia.
const PRIORITY_BADGE: Record<string, string> = {
  CRITICA:  'bg-[#bd1e1e]/20 text-[#bd1e1e] border border-[#bd1e1e]/40',
  ALTA:     'bg-[#f95c5c]/15 text-[#f95c5c] border border-[#f95c5c]/30',
  MEDIA:    'bg-[#f9f15c]/15 text-yellow-200 border border-[#f9f15c]/30',
  BAJA:     'bg-[#44a024]/15 text-[#44a024] border border-[#44a024]/30',
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

export default function Scans() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [vulns, setVulns] = useState<VulnerabilityAudit[]>([])
  const [loadingVulns, setLoadingVulns] = useState(true)

  const [assetToScan, setAssetToScan] = useState<number | ''>('')
  const [envToScan, setEnvToScan] = useState<number | ''>('')
  const [scanningAsset, setScanningAsset] = useState(false)
  const [scanningEnv, setScanningEnv] = useState(false)
  const [scanningGlobal, setScanningGlobal] = useState(false)

  // 3 instancias independientes -- cada tarjeta necesita su propio estado de polling
  const activoPoll  = useScanPolling()
  const entornoPoll = useScanPolling()
  const globalPoll  = useScanPolling()

  // repository.findAll() no garantiza orden -- se ordena en el cliente
  const loadVulns = useCallback(() => {
    setLoadingVulns(true)
    vulnApi.getAll()
      .then(r => {
        const sorted = [...r.data].sort((a, b) =>
          new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
        setVulns(sorted)
      })
      .catch(() => toast.error('Error al cargar las vulnerabilidades'))
      .finally(() => setLoadingVulns(false))
  }, [])

  useEffect(() => {
    loadVulns()
    assetApi.getAll()
      .then(r => setAssets(r.data))
      .catch(() => toast.error('Error al cargar activos'))
    environmentApi.getAll()
      .then(r => setEnvironments(r.data))
      .catch(() => toast.error('Error al cargar entornos'))
  }, [loadVulns])

  const handleScanAsset = async () => {
    if (!assetToScan) return
    const asset = assets.find(a => a.id === assetToScan)
    if (!asset) return
    setScanningAsset(true)
    try {
      await assetApi.triggerScan(asset.id)
      toast(`Escaneando "${asset.name}"…`)
      activoPoll.start('ACTIVO', asset.name, () => {
        toast.success(`Escaneo de "${asset.name}" completo`)
        loadVulns()
      })
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Error al disparar el escaneo')
    } finally {
      setScanningAsset(false)
    }
  }

  const handleScanEnvironment = async () => {
    if (!envToScan) return
    const env = environments.find(e => e.id === envToScan)
    if (!env) return
    setScanningEnv(true)
    try {
      await scanApi.triggerEnvironment(env.id)
      toast(`Escaneando entorno "${env.name}"…`)
      entornoPoll.start('ENTORNO', env.name, () => {
        toast.success(`Escaneo de "${env.name}" completo`)
        loadVulns()
      })
    } catch (err: unknown) {
      toast.error(err instanceof Error
        ? err.message : 'Error al disparar el escaneo del entorno')
    } finally {
      setScanningEnv(false)
    }
  }

  const handleScanGlobal = async () => {
    setScanningGlobal(true)
    try {
      await scanApi.triggerGlobal()
      toast('Escaneo global disparado…')
      globalPoll.start('GLOBAL', 'TODOS', () => {
        toast.success('Escaneo global completo')
        loadVulns()
      })
    } catch (err: unknown) {
      toast.error(err instanceof Error
        ? err.message : 'Error al disparar el escaneo global')
    } finally {
      setScanningGlobal(false)
    }
  }

  const columns: Column<VulnerabilityAudit>[] = [
    {
      key: 'cveId', label: 'CVE / GHSA',
      render: (_v, row) => (
        <span className="font-mono text-xs">
          {row.cveId || row.ghsaId || 'Sin identificador'}
        </span>
      ),
    },
    { key: 'asset', label: 'Activo' },
    {
      key: 'cvss', label: 'CVSS',
      render: v => (
        <span className="font-mono text-xs">{v ? String(v) : '—'}</span>
      ),
    },
    {
      key: 'priority', label: 'Prioridad',
      render: v => (
        <span className={`badge ${PRIORITY_BADGE[String(v)] ?? ''}`}>
          {String(v) || 'SIN PRIORIDAD'}
        </span>
      ),
    },
    {
      key: 'status', label: 'Estado',
      render: v => (
        <span className={`badge ${STATUS_BADGE[String(v)] ?? ''}`}>
          {String(v)}
        </span>
      ),
    },
    {
      key: 'decision', label: 'Detalle',
      render: v => (
        <span className="text-xs text-slate-400 line-clamp-2 max-w-xs">
          {v ? String(v) : 'Sin detalle'}
        </span>
      ),
    },
    {
      key: 'detectedAt', label: 'Detectado',
      render: v => new Date(String(v)).toLocaleString('es-AR'),
    },
  ]

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Centro de Escaneos"
        subtitle="Disparar y revisar escaneos por activo, entorno o global"
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card">
          <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
            Por activo
          </p>
          <select
            className="input mb-2"
            value={assetToScan}
            onChange={e =>
              setAssetToScan(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Seleccionar activo…</option>
            {assets.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <button
            onClick={handleScanAsset}
            disabled={!assetToScan || scanningAsset}
            className="btn-primary w-full"
          >
            {scanningAsset || activoPoll.state === 'running'
              ? 'Escaneando…' : 'Escanear activo'}
          </button>
        </div>

        <div className="card">
          <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
            Por entorno
          </p>
          <select
            className="input mb-2"
            value={envToScan}
            onChange={e =>
              setEnvToScan(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Seleccionar entorno…</option>
            {environments.map(env => (
              <option key={env.id} value={env.id}>{env.name}</option>
            ))}
          </select>
          <button
            onClick={handleScanEnvironment}
            disabled={!envToScan || scanningEnv}
            className="btn-primary w-full"
          >
            {scanningEnv || entornoPoll.state === 'running'
              ? 'Escaneando…' : 'Escanear entorno'}
          </button>
        </div>

        <div className="card flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">
              Global
            </p>
            <p className="text-xs text-slate-500 mb-3">
              Todos los entornos, todos los activos.
            </p>
          </div>
          <button
            onClick={handleScanGlobal}
            disabled={scanningGlobal}
            className="btn-primary w-full"
          >
            {scanningGlobal || globalPoll.state === 'running'
              ? 'Escaneando…' : 'Escanear todo'}
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-500">Vulnerabilidades detectadas</p>
        <button
          onClick={loadVulns}
          disabled={loadingVulns}
          className="btn-ghost"
        >
          <RefreshCw size={13} className={loadingVulns ? 'animate-spin' : ''} />
          Recargar
        </button>
      </div>
      <div className="card p-0 overflow-hidden rounded-xl border border-surface-600">
        <Table
          columns={columns}
          data={vulns}
          loading={loadingVulns}
          emptyMessage="No se encontraron vulnerabilidades"
        />
      </div>
    </div>
  )
}
