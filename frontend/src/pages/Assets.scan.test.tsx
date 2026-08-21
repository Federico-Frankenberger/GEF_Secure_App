import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Assets from './Assets'
import type { Asset, SoftwareComponent } from '../types'

// FE-06 (docs/20-08-26/AUDITORIA_END_TO_END.md): antes el botón de escanear un
// componente se rehabilitaba apenas resolvía el POST inicial, mucho antes de que el
// escaneo (asíncrono) terminara -- permitía disparar un segundo escaneo real del mismo
// componente con un doble click mientras el primero seguía corriendo.

// vi.mock() se "hoistea" arriba de todo el archivo -- las variables que usan sus
// factories tienen que declararse con vi.hoisted() para no chocar con eso.
const { asset, component, triggerScan, latestReport } = vi.hoisted(() => {
  const asset: Asset = {
    id: 1, name: 'Servidor Demo', assetType: 'SERVIDOR', environmentId: 1,
    environmentName: 'Producción', description: null, createdAt: null,
  }
  const component: SoftwareComponent = {
    id: 100, name: 'express 4.18.2', software: 'express', ecosystem: 'npm', version: '4.18.2',
    environmentId: 1, environmentName: 'Producción', businessCriticality: null,
    assetId: 1, assetName: 'Servidor Demo', lastScan: null, description: null,
    catalogued: true, purl: 'pkg:npm/express@4.18.2',
  }
  return {
    asset,
    component,
    triggerScan: vi.fn().mockResolvedValue({ data: component }),
    // El polling real no importa para este test -- que nunca "termine" no afecta la
    // aserción (solo nos interesa cuántas veces se llamó a triggerScan tras el doble click).
    latestReport: vi.fn().mockReturnValue(new Promise(() => {})),
  }
})

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { username: 'admin', fullName: 'Admin', role: 'ADMIN' } }),
}))

vi.mock('../services/api', () => ({
  assetApi: {
    getAll: vi.fn().mockResolvedValue({ data: [asset] }),
    getDeleted: vi.fn().mockResolvedValue({ data: [] }),
  },
  environmentApi: { getAll: vi.fn().mockResolvedValue({ data: [] }) },
  assetTypeApi: { getAll: vi.fn().mockResolvedValue({ data: [] }) },
  ecosystemApi: { getAll: vi.fn().mockResolvedValue({ data: [] }) },
  softwareComponentApi: {
    getAll: vi.fn().mockResolvedValue({ data: [component] }),
    triggerScan,
  },
  inventoryApi: {},
  scanApi: { latestReport },
}))

describe('Assets.tsx — handleScan (FE-06)', () => {
  it('un doble click rápido en "Escanear" dispara un único POST mientras el primero sigue en curso', async () => {
    const user = userEvent.setup()
    render(<Assets />)

    // Abrir el modal "Software de Servidor Demo" clickeando la fila del activo
    const assetRow = await screen.findByText('Servidor Demo')
    await user.click(assetRow)

    // Encontrar el botón de escanear (icono sin label -- lucide ScanLine) dentro de la
    // fila del componente, una vez que el modal renderizó la tabla de software.
    await screen.findByText('express')
    const scanButton = await waitFor(() => {
      const icon = document.querySelector('.lucide-scan-line')
      const btn = icon?.closest('button')
      if (!btn) throw new Error('botón de escaneo no encontrado todavía')
      return btn
    })

    // Doble click rápido -- antes del fix, el segundo click alcanzaba a disparar un
    // segundo triggerScan porque el botón se rehabilitaba apenas resolvía el primer POST.
    await user.click(scanButton)
    await user.click(scanButton)

    await waitFor(() => expect(triggerScan).toHaveBeenCalledTimes(1))
    expect(triggerScan).toHaveBeenCalledWith(100)
  })
})
