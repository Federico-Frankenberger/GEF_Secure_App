import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert, Flame, Bug, Server, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { vulnApi } from '../../services/api'
import type { VulnerabilitySummary, VulnerabilityAudit } from '../../types'
import StatCard from '../StatCard'
import { PRIORITY_BADGE, PRIORITY_LABEL } from '../../constants/badges'

function daysUntil(dueDate: string): number {
  return Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000)
}

/** Vista "Resumen" del rediseño de Vulnerabilidades (docs/bitacora/23-08-26): KPIs
 *  específicos de riesgo + atención inmediata (con motivo visible, no solo CVSS) +
 *  activos con mayor riesgo. No duplica el Dashboard general -- sección 15 del prompt. */
export default function VulnerabilidadesResumen({ onOpenDetail, onGoToKanban, refreshTick }: {
  onOpenDetail: (vuln: VulnerabilityAudit) => void
  /** Cambia el tab a "Kanban" en el padre -- la sección vive dentro de la misma página
   *  (/kanban), así que un navigate('/kanban') no hace nada visible cuando ya estás
   *  parado en esa ruta viendo el tab "Resumen" (bug reportado: el botón no respondía). */
  onGoToKanban: () => void
  refreshTick: number
}) {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<VulnerabilitySummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    vulnApi.summary()
      .then(r => setSummary(r.data))
      .catch(() => toast.error('Error al cargar el resumen de vulnerabilidades'))
      .finally(() => setLoading(false))
  }, [refreshTick])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard title="Abiertas" value={summary?.openCount} icon={ShieldAlert} color="brand" loading={loading} />
        <StatCard title="Críticas" value={summary?.criticalCount} icon={Flame} color="critical" emphasize={!!summary?.criticalCount} loading={loading} />
        <StatCard title="Altas" value={summary?.highCount} icon={Bug} color="high" loading={loading} />
        <StatCard title="Explotación conocida" value={summary?.exploitedCount} icon={ShieldAlert} color="critical" emphasize={!!summary?.exploitedCount} loading={loading} />
        <StatCard title="SLA vencido" value={summary?.slaOverdueCount} icon={Flame} color="critical" emphasize={!!summary?.slaOverdueCount} loading={loading} />
        <StatCard title="Activos afectados" value={summary?.affectedAssetsCount} icon={Server} color="brand" loading={loading} />
        <StatCard title="Nuevas (7d)" value={summary?.newLast7Days} icon={Sparkles} color="brand" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-600 flex items-center justify-between">
            <p className="text-sm font-medium text-white flex items-center gap-2">
              <Flame size={14} className="text-severity-high" /> Requiere atención
            </p>
            <button onClick={onGoToKanban} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-0.5">
              Ver Kanban <ChevronRight size={12} />
            </button>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-14 w-full rounded-lg" />)}
            </div>
          ) : !summary?.attentionList.length ? (
            <div className="flex items-center gap-2 px-5 py-8 text-sm text-severity-low">
              <CheckCircle2 size={16} /> Sin vulnerabilidades que requieran atención inmediata.
            </div>
          ) : (
            <div className="divide-y divide-surface-600">
              {summary.attentionList.map(vuln => (
                <button
                  key={vuln.id}
                  onClick={() => onOpenDetail(vuln)}
                  className="w-full text-left px-4 py-3 hover:bg-surface-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-xs text-white">{vuln.cveId || vuln.ghsaId || 'Sin identificador'}</span>
                    <span className={`badge ${PRIORITY_BADGE[vuln.priority as string] ?? ''}`}>{PRIORITY_LABEL[vuln.priority as string] ?? vuln.priority}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-1">{vuln.asset}{vuln.environmentName ? ` · ${vuln.environmentName}` : ''}</p>
                  {!!vuln.priorityReasons?.length && (
                    <p className="text-[11px] text-slate-500">{vuln.priorityReasons.join(' · ')}</p>
                  )}
                  {vuln.dueDate && (
                    <p className={`text-[11px] mt-0.5 ${daysUntil(vuln.dueDate) < 0 ? 'text-severity-critical' : 'text-slate-500'}`}>
                      {daysUntil(vuln.dueDate) < 0
                        ? `SLA vencido hace ${Math.abs(daysUntil(vuln.dueDate))} día(s)`
                        : `Vence en ${daysUntil(vuln.dueDate)} día(s)`}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-600">
            <p className="text-sm font-medium text-white">Activos con mayor riesgo</p>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">
              {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-10 w-full rounded-lg" />)}
            </div>
          ) : !summary?.topRiskAssets.length ? (
            <div className="flex items-center gap-2 px-5 py-8 text-sm text-severity-low">
              <CheckCircle2 size={16} /> Sin activos con vulnerabilidades abiertas.
            </div>
          ) : (
            <div className="divide-y divide-surface-600">
              {summary.topRiskAssets.map(row => (
                <button
                  key={row.assetId}
                  onClick={() => navigate('/assets')}
                  className="w-full text-left px-4 py-3 hover:bg-surface-700/50 transition-colors flex items-center justify-between gap-3"
                >
                  <span className="text-sm text-white truncate">{row.assetName}</span>
                  <span className="flex items-center gap-2 text-xs font-mono flex-shrink-0">
                    {row.criticals > 0 && <span className="text-severity-critical">{row.criticals} crít.</span>}
                    {row.highs > 0 && <span className="text-severity-high">{row.highs} alta(s)</span>}
                    <span className="text-slate-500">{row.total} total</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
