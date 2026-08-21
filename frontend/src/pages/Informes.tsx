import { useEffect, useState, ReactNode } from 'react'
import { FileText, Download, GitCompare, TrendingUp, Search, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import { scanApi, reportApi } from '../services/api'
import type { ScanReport, ScanTargetType } from '../types'
import PageHeader from '../components/PageHeader'
import { downloadBlob } from '../utils/downloadFile'
import { useAuth } from '../contexts/AuthContext'

// FE-13 (docs/20-08-26/AUDITORIA_END_TO_END.md): "Informes" incluye el resumen ejecutivo
// y la exportación de cualquier escaneo del historial -- restringido acá al mismo criterio
// que ya aplica el backend (C2) para no ofrecer un flujo que va a terminar en 404/vacío.
const ALLOWED_ROLES = ['ADMIN', 'SECURITY_ANALYST']

const TARGET_LABEL: Record<ScanTargetType, string> = {
  ACTIVO: 'Componente', HOST: 'Activo', ENTORNO: 'Entorno', GLOBAL: 'Global',
}

const scanOptionLabel = (r: ScanReport) =>
  `${r.publicCode} · ${new Date(r.executedAt).toLocaleString('es-AR')} · ${TARGET_LABEL[r.targetType] ?? r.targetType}${r.targetName !== 'TODOS' ? ` — ${r.targetName}` : ''}`

function ReportCard({ icon: Icon, title, description, children }: {
  icon: typeof FileText
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-brand-600/15 text-brand-400 flex items-center justify-center flex-shrink-0">
          <Icon size={16} />
        </div>
        <p className="text-sm font-semibold text-white">{title}</p>
      </div>
      <p className="text-xs text-slate-500 -mt-1">{description}</p>
      {children}
    </div>
  )
}

export default function Informes() {
  const { user } = useAuth()
  const allowed = user != null && ALLOWED_ROLES.includes(user.role)

  const [scans, setScans] = useState<ScanReport[]>([])

  useEffect(() => {
    if (!allowed) return
    scanApi.history({ page: 0, size: 100 })
      .then(r => setScans(r.data.content))
      .catch(() => toast.error('Error al cargar el historial de escaneos'))
  }, [allowed])

  if (!allowed) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Informes" subtitle="Exportación de informes en PDF sobre escaneos y vulnerabilidades" />
        <div className="card flex flex-col items-center gap-3 py-12 text-center">
          <ShieldAlert size={28} className="text-slate-500" />
          <p className="text-sm text-slate-400">Tu rol no tiene acceso a esta sección.</p>
        </div>
      </div>
    )
  }

  // ── Informe de escaneo puntual ────────────────────────────────────────────
  const [scanId, setScanId] = useState<number | ''>('')
  const [exportingScan, setExportingScan] = useState(false)

  const exportScanReport = async () => {
    if (scanId === '') return
    setExportingScan(true)
    try {
      const { data } = await reportApi.scan(Number(scanId))
      downloadBlob(data, `informe-escaneo-${scanId}.pdf`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al generar el informe')
    } finally {
      setExportingScan(false)
    }
  }

  // ── Informe comparativo ───────────────────────────────────────────────────
  const [compareAId, setCompareAId] = useState<number | ''>('')
  const [compareBId, setCompareBId] = useState<number | ''>('')
  const [exportingComparison, setExportingComparison] = useState(false)

  const exportComparisonReport = async () => {
    if (compareAId === '' || compareBId === '' || compareAId === compareBId) return
    setExportingComparison(true)
    try {
      const { data } = await reportApi.comparison(Number(compareAId), Number(compareBId))
      downloadBlob(data, `informe-comparativo-${compareAId}-${compareBId}.pdf`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al generar el informe')
    } finally {
      setExportingComparison(false)
    }
  }

  // ── Resumen ejecutivo ─────────────────────────────────────────────────────
  const [exportingExecutive, setExportingExecutive] = useState(false)

  const exportExecutiveReport = async () => {
    setExportingExecutive(true)
    try {
      const { data } = await reportApi.executive()
      downloadBlob(data, 'resumen-ejecutivo.pdf')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al generar el resumen ejecutivo')
    } finally {
      setExportingExecutive(false)
    }
  }

  // ── Ficha de CVE/GHSA ─────────────────────────────────────────────────────
  const [cveIdentifier, setCveIdentifier] = useState('')
  const [exportingCve, setExportingCve] = useState(false)

  const exportCveReport = async () => {
    const identifier = cveIdentifier.trim()
    if (!identifier) return
    setExportingCve(true)
    try {
      const { data } = await reportApi.cve(identifier)
      downloadBlob(data, `ficha-${identifier}.pdf`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al generar la ficha')
    } finally {
      setExportingCve(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Informes"
        subtitle="Exportá información de escaneos y vulnerabilidades en PDF"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ReportCard icon={FileText} title="Informe de escaneo puntual"
          description="Resumen por severidad y detalle completo de los hallazgos de un escaneo del historial.">
          <select className="input w-full" value={scanId} onChange={e => setScanId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Elegir escaneo…</option>
            {scans.map(s => <option key={s.id} value={s.id}>{scanOptionLabel(s)}</option>)}
          </select>
          <button onClick={exportScanReport} disabled={scanId === '' || exportingScan} className="btn-primary self-start">
            <Download size={14} /> {exportingScan ? 'Generando…' : 'Exportar PDF'}
          </button>
        </ReportCard>

        <ReportCard icon={GitCompare} title="Informe comparativo"
          description="Qué es nuevo, qué se resolvió y qué persiste entre dos escaneos del historial.">
          <select className="input w-full" value={compareAId} onChange={e => setCompareAId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Escaneo A…</option>
            {scans.map(s => <option key={s.id} value={s.id}>{scanOptionLabel(s)}</option>)}
          </select>
          <select className="input w-full" value={compareBId} onChange={e => setCompareBId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Escaneo B…</option>
            {scans.map(s => <option key={s.id} value={s.id}>{scanOptionLabel(s)}</option>)}
          </select>
          {compareAId !== '' && compareAId === compareBId && (
            <p className="text-xs text-red-400">Elegí dos escaneos distintos.</p>
          )}
          <button
            onClick={exportComparisonReport}
            disabled={compareAId === '' || compareBId === '' || compareAId === compareBId || exportingComparison}
            className="btn-primary self-start"
          >
            <Download size={14} /> {exportingComparison ? 'Generando…' : 'Exportar PDF'}
          </button>
        </ReportCard>

        <ReportCard icon={TrendingUp} title="Resumen ejecutivo"
          description="Postura de seguridad actual: indicadores clave y las vulnerabilidades críticas abiertas más urgentes.">
          <button onClick={exportExecutiveReport} disabled={exportingExecutive} className="btn-primary self-start">
            <Download size={14} /> {exportingExecutive ? 'Generando…' : 'Exportar PDF'}
          </button>
        </ReportCard>

        <ReportCard icon={Search} title="Ficha de CVE / GHSA"
          description="Descripción real de un identificador puntual y todos los activos de la organización afectados por él.">
          <input
            type="text"
            className="input w-full"
            placeholder="ej: CVE-2024-12345 o GHSA-xxxx-xxxx-xxxx"
            value={cveIdentifier}
            onChange={e => setCveIdentifier(e.target.value)}
          />
          <button onClick={exportCveReport} disabled={!cveIdentifier.trim() || exportingCve} className="btn-primary self-start">
            <Download size={14} /> {exportingCve ? 'Generando…' : 'Exportar PDF'}
          </button>
        </ReportCard>
      </div>
    </div>
  )
}
