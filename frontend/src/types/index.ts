// ── Asset ─────────────────────────────────────────────────────────────────────
export interface Asset {
  id: number
  name: string
  software: string
  ecosystem: string
  version: string
  criticality: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA' | string
  lastScan: string | null
  description: string | null
}

export interface AssetRequest {
  name: string
  software: string
  ecosystem: string
  version: string
  criticality: string
  description?: string
}

// ── Vulnerability ─────────────────────────────────────────────────────────────
export type VulnStatus = 'DETECTADA' | 'EN_ANALISIS' | 'RESUELTA'
export type VulnPriority = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA'

export interface VulnerabilityAudit {
  id: number
  detectedAt: string
  asset: string
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
}

export interface VulnerabilityRequest {
  asset: string
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
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export interface DashboardStats {
  totalAssets: number
  totalVulnerabilities: number
  openVulnerabilities: number
  criticalVulnerabilities: number
  resolvedThisMonth: number
  systemStatus: string
  severityDistribution: Array<{ name: string; value: number }>
  statusDistribution:   Array<{ name: string; value: number }>
  trendsLast30Days:     Array<{ date: string; detectadas: number; resueltas: number }>
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
