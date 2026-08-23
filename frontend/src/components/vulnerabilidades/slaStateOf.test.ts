import { describe, expect, it } from 'vitest'
import { slaStateOf } from './VulnerabilidadesListado'

// Lógica de SLA (docs/bitacora/23-08-26): decide el badge de la columna "SLA" del
// Listado. Sin test hasta ahora pese a ser la regla de negocio más visible de esa vista.

describe('slaStateOf', () => {
  it('devuelve null si no hay fecha límite', () => {
    expect(slaStateOf(null)).toBeNull()
    expect(slaStateOf(undefined)).toBeNull()
  })

  it('devuelve VENCIDO si la fecha límite ya pasó', () => {
    const past = new Date(Date.now() - 2 * 86_400_000).toISOString()
    expect(slaStateOf(past)).toBe('VENCIDO')
  })

  it('devuelve PROXIMO si faltan menos de 7 días', () => {
    const soon = new Date(Date.now() + 3 * 86_400_000).toISOString()
    expect(slaStateOf(soon)).toBe('PROXIMO')
  })

  it('devuelve EN_PLAZO si faltan 7 días o más', () => {
    const far = new Date(Date.now() + 10 * 86_400_000).toISOString()
    expect(slaStateOf(far)).toBe('EN_PLAZO')
  })
})
