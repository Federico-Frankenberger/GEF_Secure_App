// ── Paginación (respuesta de Spring Data Page<T>) ───────────────────────────
export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

// ── Environment ───────────────────────────────────────────────────────────────
export interface Environment {
  id: number
  name: string
  businessCriticality: string
  description: string | null
  createdAt: string | null
}

export interface EnvironmentRequest {
  name: string
  businessCriticality: string
  description?: string
}

// ── Catálogos administrables (Config) ──────────────────────────────────────────
export interface AssetType {
  id: number
  name: string
}

export interface AssetTypeRequest {
  name: string
}

export interface Ecosystem {
  id: number
  name: string
}

export interface EcosystemRequest {
  name: string
}

// ── Asset (activo real: servidor, aplicación, VM, contenedor) ─────────────────
export interface Asset {
  id: number
  name: string
  assetType: string
  environmentId: number | null
  environmentName: string | null
  description: string | null
  createdAt: string | null
  // Fase 10, opcional (docs/21-08-26/Plan_Implementacion_Tracking_Solido.md): declarado a
  // mano, null = no declarado todavía (no se asume "no expuesto").
  exposed: boolean | null
}

export interface AssetRequest {
  name: string
  assetType?: string
  environmentId?: number
  description?: string
  exposed?: boolean
}

// Activo eliminado logicamente (panel de restauración, ADMIN/SECURITY_ANALYST)
export interface DeletedAsset {
  id: number
  name: string
  assetType: string
  environmentName: string | null
  deletedAt: string
  componentsCount: number
}

// ── SoftwareComponent (paquete instalado, antes "Asset") ──────────────────────
// El software siempre pertenece a un activo (assetId nunca es null).
export interface SoftwareComponent {
  id: number
  name: string
  software: string
  ecosystem: string
  version: string
  environmentId: number | null
  environmentName: string | null
  businessCriticality: string | null
  assetId: number
  assetName: string
  lastScan: string | null
  description: string | null
  catalogued: boolean
  purl: string | null
}

export interface SoftwareComponentRequest {
  name: string
  software: string
  ecosystem: string
  version: string
  assetId: number
  description?: string
}

// ── Software Catalog ─────────────────────────────────────────────────────────
export interface SoftwareCatalogEntry {
  id: number
  packageName: string
  ecosystem: string
  displayName: string | null
}

// ── Vulnerability ─────────────────────────────────────────────────────────────
export type VulnStatus = 'DETECTADA' | 'EN_ANALISIS' | 'RESUELTA'
export type VulnPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export interface VulnerabilityAudit {
  id: number
  detectedAt: string
  assetId: number | null
  asset: string | null
  componentName: string | null
  environmentName: string | null
  cveId: string | null
  cvss: string | null
  exploited: boolean
  priority: VulnPriority | string
  decision: string | null
  assignedTo: string | null
  status: VulnStatus | string
  resolvedAt: string | null
  ghsaId: string | null
  updatedAt: string
  software: string | null
  ecosystem: string | null
  installedVersion: string | null
  patchedVersion: string | null
  isZeroDay: boolean | null
  // Fase 2/5 (docs/21-08-26/Plan_Implementacion_Tracking_Solido.md).
  reopenCount?: number
  outcome?: VulnOutcome | null
  mitigationControl?: string | null
  justification?: string | null
  acceptedBy?: string | null
  riskAcceptedUntil?: string | null
  // Fase 6: desglose de variables de prioridad (JSON armado por n8n) + plazo calculado.
  priorityVariables?: string | null
  dueDate?: string | null
}

// Fase 5: vocabulario VEX -- solo aplica cuando status = RESUELTA. undefined/null = cierre
// plano (sin clasificar), igual que antes de esta fase.
export type VulnOutcome = 'MITIGADA' | 'NO_APLICA' | 'RIESGO_ACEPTADO'

// ── GHSA Advisory (Frente 3: descripción real de la vulnerabilidad) ────────
export interface GhsaAdvisory {
  ghsaId: string
  summary: string | null
  description: string | null
  references: string[]
  cachedAt: string | null
}

export interface VulnerabilityRequest {
  assetId: number
  cveId?: string
  cvss?: string
  exploited?: boolean
  priority?: string
  decision?: string
  assignedTo?: string
  status?: string
  ghsaId?: string
}

export interface StatusUpdate {
  status: string
  assignedTo?: string
  decision?: string
  // Fase 5 (docs/21-08-26/Plan_Implementacion_Tracking_Solido.md): solo se valida/usa
  // cuando status = RESUELTA. Sin outcome = cierre plano, sin clasificar.
  outcome?: VulnOutcome | ''
  mitigationControl?: string
  justification?: string
  acceptedBy?: string
  riskAcceptedUntil?: string
  // Fase 7: escala de evidencia E0-E6 + referencia al respaldo real.
  evidenceLevel?: 'E0' | 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | ''
  evidenceRef?: string
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface AuthUser {
  username: string
  fullName: string | null
  role: string
}

export interface LoginResponse {
  token: string
  username: string
  fullName: string | null
  role: string
}

// ── User ──────────────────────────────────────────────────────────────────────
export interface User {
  id: number
  username: string
  fullName: string | null
  email: string | null
  role: string
  createdAt: string
}

export interface UserRequest {
  username: string
  fullName?: string
  email?: string
  role?: string
  // Requerida al crear; en edición, dejarla en blanco no cambia el hash existente.
  password?: string
}

// ── Roles ─────────────────────────────────────────────────────────────────────
export type UserRole = 'ADMIN' | 'SECURITY_ANALYST' | 'ASSET_OWNER' | 'AUDITOR'

// ── UserAssetAssignment (scope de ASSET_OWNER) ─────────────────────────────────
export interface UserAssetAssignment {
  id: number
  userId: number
  username: string
  userFullName: string | null
  assetId: number
  assignedAt: string
}

export interface UserAssetAssignmentRequest {
  userId: number
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export interface DashboardStats {
  totalAssets: number
  totalVulnerabilities: number
  openVulnerabilities: number
  criticalVulnerabilities: number
  resolvedThisMonth: number
  // Fase 4 (docs/21-08-26/Plan_Implementacion_Tracking_Solido.md): antes "mttrDays" a secas --
  // medía hasta la marca MANUAL de resuelto, no una verificación real (antipatrón "MTTR
  // nominal"). mttrVerifiedDays queda null hasta la Fase 8 (Componente D).
  mttrDeclaredDays: number | null
  mttrVerifiedDays: number | null
  systemStatus: string
  severityDistribution: Array<{ name: string; value: number }>
  statusDistribution:   Array<{ name: string; value: number }>
  trendsLast30Days:     Array<{ date: string; detectadas: number; resueltas: number }>
  agingBuckets:     Array<{ bucket: string; count: number }>
  mttrByCriticality: Array<{ priority: string; avgDays: number }>
  // Fase 2 (docs/21-08-26/Plan_Implementacion_Tracking_Solido.md): tasa de recurrencia.
  reopenedCasesCount: number
  recurrenceRate: number
  // Fase 9: por responsable, confiable ahora que assignedToUser es FK real.
  byResponsible: Array<{ name: string; value: number }>
}

// ── Scan (activo / entorno / global) ─────────────────────────────────────────
export type ScanTargetType = 'ACTIVO' | 'HOST' | 'ENTORNO' | 'GLOBAL'

export interface ScanReport {
  id: number
  publicCode: string
  executedAt: string
  totalDetected: number
  criticals: number
  highs: number
  mediums: number
  lows: number
  systemStatus: string
  targetType: ScanTargetType
  targetName: string
  // M-NUEVO-1 (docs/20-08-26/AUDITORIA_END_TO_END_2.md): estado real del ScanReport
  // (RUNNING/COMPLETED/FAILED/PARTIALLY_COMPLETED), distinto de systemStatus (salud del
  // pipeline, ej. "✅ ESTABLE" incluso en un escaneo COMPLETED con críticos).
  status: string
  errorMessage: string | null
}

// Comparación entre dos escaneos del historial (Etapa 5 de trazabilidad)
export interface SeverityChange {
  cveId: string
  priorityBefore: string
  priorityAfter: string
}

export interface ScanComparison {
  scanAId: number
  scanBId: number
  newInB: VulnerabilityAudit[]
  resolvedSinceA: VulnerabilityAudit[]
  persisting: VulnerabilityAudit[]
  severityChanges: SeverityChange[]
}

// ── Inventario (SBOM CycloneDX) ─────────────────────────────────────────────
export type InventoryItemStatus = 'NUEVO' | 'ACTUALIZADO' | 'SIN_CAMBIOS' | 'NO_RECONOCIDO' | 'ERROR'

export interface InventoryItem {
  coordinate: string
  ecosystem: string
  version: string
  previousVersion: string | null
  status: InventoryItemStatus
  detail: string | null
}

export interface InventorySummary {
  total: number
  nuevos: number
  actualizados: number
  sinCambios: number
  noReconocidos: number
  errores: number
  items: InventoryItem[]
}

// ── SystemError ───────────────────────────────────────────────────────────────
export interface SystemError {
  id: number
  errorDate: string
  nodeName: string | null
  errorMessage: string | null
  workflowId: string | null
  executionId: string | null
}
