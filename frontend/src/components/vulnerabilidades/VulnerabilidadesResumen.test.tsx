import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import VulnerabilidadesResumen from './VulnerabilidadesResumen'
import type { VulnerabilitySummary } from '../../types'

// Bug real reportado por el usuario y corregido en esta sesión: el botón "Ver
// Kanban" hacía navigate('/kanban'), pero la sección YA vive en /kanban (las 4
// vistas son tabs internos, no rutas) -- navegar a la misma ruta no hacía nada
// visible. El fix cambia el tab en el padre vía la prop onGoToKanban. Este test
// es la regresión: confirma que el botón llama a esa prop, no a router.

const summary: VulnerabilitySummary = {
  openCount: 1, criticalCount: 1, highCount: 0, exploitedCount: 0,
  slaOverdueCount: 0, slaUpcomingCount: 0, affectedAssetsCount: 1,
  newLast7Days: 0, resolvedLast7Days: 0,
  attentionList: [], topRiskAssets: [], cisaKevCount: 0, ghsaOnlyCount: 0,
}

vi.mock('../../services/api', () => ({
  vulnApi: { summary: vi.fn() },
}))

import { vulnApi } from '../../services/api'

describe('VulnerabilidadesResumen — botón "Ver Kanban"', () => {
  it('cambia al tab Kanban vía onGoToKanban, no navega por router', async () => {
    vi.mocked(vulnApi.summary).mockResolvedValue({ data: summary } as never)
    const onGoToKanban = vi.fn()
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <VulnerabilidadesResumen onOpenDetail={vi.fn()} onGoToKanban={onGoToKanban} refreshTick={0} />
      </MemoryRouter>
    )

    const button = await screen.findByText('Ver Kanban')
    await user.click(button)

    expect(onGoToKanban).toHaveBeenCalledTimes(1)
  })
})
