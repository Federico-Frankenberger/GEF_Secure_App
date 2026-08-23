import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import Dashboard from './Dashboard'
import type { VulnerabilityAudit, DashboardStats } from '../types'

// Auditoría de Dashboard (docs/bitacora/23-08-26): el banner de estado (Nivel 1)
// antes leía `stats.systemStatus` (agregado del backend, puede desincronizarse de
// la lista real -- se vio en vivo el banner en verde "Estable" mientras la tabla de
// abajo mostraba una crítica sin resolver). El fix hace que el banner derive de la
// MISMA lista que "Requiere atención", nunca de un campo separado -- este test es
// la regresión de ese bug real encontrado y corregido en esta sesión.

const baseStats: DashboardStats = {
  totalAssets: 1, totalVulnerabilities: 1, openVulnerabilities: 1,
  criticalVulnerabilities: 0, resolvedThisMonth: 0,
  mttrDeclaredDays: null, mttrVerifiedDays: null,
  systemStatus: '✅ ESTABLE', // a propósito distinto de lo real, para probar que NO se usa
  severityDistribution: [], statusDistribution: [], trendsLast30Days: [],
  agingBuckets: [], mttrByCriticality: [], reopenedCasesCount: 0,
  recurrenceRate: 0, byResponsible: [],
}

function criticalOpenVuln(): VulnerabilityAudit {
  return {
    id: 1, detectedAt: new Date().toISOString(), assetId: 1, asset: 'Servidor Demo',
    componentName: 'express', environmentName: 'Producción', cveId: 'CVE-2024-1',
    cvss: '9.8', exploited: true, priority: 'CRITICAL', decision: null,
    assignedTo: null, status: 'DETECTADA', resolvedAt: null, ghsaId: null,
    updatedAt: new Date().toISOString(), software: 'express', ecosystem: 'npm',
    installedVersion: '4.18.2', patchedVersion: null, isZeroDay: false,
  }
}

vi.mock('../services/api', () => ({
  dashboardApi: { getStats: vi.fn() },
  vulnApi: { getAll: vi.fn() },
}))

import { dashboardApi, vulnApi } from '../services/api'

describe('Dashboard — banner de estado (Nivel 1)', () => {
  it('muestra "Estable" cuando no hay ninguna vulnerabilidad crítica sin resolver, aunque systemStatus diga otra cosa', async () => {
    vi.mocked(dashboardApi.getStats).mockResolvedValue({ data: baseStats } as never)
    vi.mocked(vulnApi.getAll).mockResolvedValue({ data: [] } as never)

    render(<MemoryRouter><Dashboard /></MemoryRouter>)

    expect(await screen.findByText('Estable')).toBeInTheDocument()
  })

  it('muestra "Acción requerida" cuando SÍ hay una crítica sin resolver, incluso si systemStatus del backend dice "ESTABLE" (regresión del bug real)', async () => {
    vi.mocked(dashboardApi.getStats).mockResolvedValue({ data: baseStats } as never)
    vi.mocked(vulnApi.getAll).mockResolvedValue({ data: [criticalOpenVuln()] } as never)

    render(<MemoryRouter><Dashboard /></MemoryRouter>)

    expect(await screen.findByText('Acción requerida')).toBeInTheDocument()
  })
})
