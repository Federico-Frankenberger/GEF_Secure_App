// Design System "Centro de Operaciones" (Paso 3): fuente unica de los colores de
// severidad -- antes duplicados como hex crudo en Dashboard.tsx, Assets.tsx,
// Settings.tsx y VulnerabilityCard.tsx (P-03 de la auditoria UX/UI). Todos esos
// archivos deben importar de aca, no redefinir su propio mapa.
export const PRIORITY_BADGE: Record<string, string> = {
  CRITICAL: 'bg-severity-critical/20 text-severity-critical border border-severity-critical/40',
  HIGH:     'bg-severity-high/15 text-severity-high border border-severity-high/30',
  MEDIUM:   'bg-severity-medium/15 text-severity-medium border border-severity-medium/30',
  LOW:      'bg-severity-low/15 text-severity-low border border-severity-low/30',
}
// P-05 de la auditoria: la prioridad aparecia en ingles crudo (CRITICAL/HIGH/...)
// en una UI 100% en espanol. Mismo criterio que SCAN_STATUS_LABEL de abajo.
export const PRIORITY_LABEL: Record<string, string> = {
  CRITICAL: 'Crítica', HIGH: 'Alta', MEDIUM: 'Media', LOW: 'Baja',
}
// Colores hex planos para contextos que no aceptan clases Tailwind (Recharts,
// que pinta a canvas/SVG via prop `fill`, no via className).
export const SEVERITY_HEX: Record<string, string> = {
  CRITICAL: '#f87171', HIGH: '#fb923c', MEDIUM: '#facc15', LOW: '#4ade80',
}
// Criticidad de NEGOCIO de un Entorno (BAJA/MEDIA/ALTA/CRITICA) -- concepto
// distinto de PRIORITY_BADGE (severidad de una vulnerabilidad puntual) aunque
// comparta paleta. Antes duplicado de forma independiente en Assets.tsx y
// Settings.tsx (el mismo problema de P-03 que este archivo intenta resolver,
// reaparecido) -- una sola definicion acá.
export const CRITICALITY_BADGE: Record<string, string> = {
  CRITICA: 'bg-criticality-critica/20 text-criticality-critica border border-criticality-critica/40',
  ALTA:    'bg-criticality-alta/15 text-criticality-alta border border-criticality-alta/30',
  MEDIA:   'bg-criticality-media/15 text-criticality-media border border-criticality-media/30',
  BAJA:    'bg-criticality-baja/15 text-criticality-baja border border-criticality-baja/30',
}
export const STATUS_BADGE: Record<string, string> = {
  DETECTADA:   'bg-slate-600/30 text-slate-300 border border-slate-500/30',
  EN_ANALISIS: 'bg-amber-600/20 text-amber-400 border border-amber-600/30',
  RESUELTA:    'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30',
}
// Hex plano de STATUS_BADGE, mismo motivo que SEVERITY_HEX de arriba (Dashboard.tsx,
// "Distribución por Estado"). Antes ese gráfico usaba una paleta categórica genérica
// (cian/esmeralda/violeta/gris por índice) sin relación con el resto de la app -- el
// violeta en particular no significaba nada y desentonaba contra los colores de
// severidad de los gráficos vecinos. triage_status ya tiene un significado semántico
// fijo (detectada = neutral, en análisis = en curso, resuelta = OK), así que usa esos
// mismos 3 colores en vez de inventar una paleta decorativa aparte.
export const STATUS_HEX: Record<string, string> = {
  DETECTADA: '#64748b', EN_ANALISIS: '#f59e0b', RESUELTA: '#10b981',
}
// M-NUEVO-1 (docs/20-08-26/AUDITORIA_END_TO_END_2.md): el Historial solo mostraba
// systemStatus (salud del pipeline, ej. "✅ ESTABLE"), no el status real del ScanReport --
// un escaneo FAILED/PARTIALLY_COMPLETED era indistinguible de uno COMPLETED normal. Esta
// columna complementa a systemStatus, no la reemplaza.
export const SCAN_STATUS_BADGE: Record<string, string> = {
  COMPLETED:            'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30',
  RUNNING:              'bg-amber-600/20 text-amber-400 border border-amber-600/30',
  FAILED:               'bg-severity-critical/20 text-severity-critical border border-severity-critical/40',
  PARTIALLY_COMPLETED:  'bg-severity-medium/15 text-severity-medium border border-severity-medium/30',
}
export const SCAN_STATUS_LABEL: Record<string, string> = {
  COMPLETED: 'Completado', RUNNING: 'Corriendo', FAILED: 'Falló', PARTIALLY_COMPLETED: 'Parcial',
}
// Menor índice = más severo. Cualquier prioridad no reconocida cae al final.
export const PRIORITY_RANK = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
export const rank = (p: string) => {
  const i = PRIORITY_RANK.indexOf(p)
  return i === -1 ? PRIORITY_RANK.length : i
}
