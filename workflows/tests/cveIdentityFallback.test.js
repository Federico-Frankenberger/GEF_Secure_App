import { describe, it, expect } from 'vitest'
import { getNodeJsCode, evalFunction } from './helpers/extractNodeCode.js'

// Copia standalone -- debe ser IDENTICA en comportamiento al fallback de identidad que
// vive dentro del nodo Risk_Assessment_Engine del workflow real. Fix CVE-NULL
// (docs/bitacora/24-08-26/AUDITORIA_END_TO_END.md / plan_fix_bucle_reapertura...md):
// antes idCve = item.cve_id || "N/A" -- dos advisories GHSA-only sobre el mismo
// componente colisionaban en la misma fila (cve_id="N/A" para ambas,
// UNIQUE(software_component_id, cve_id)). Ahora usa el propio ghsa_id como respaldo.
function resolveCveId(item) {
  const idGhsa = item.ghsa_id || 'N/A'
  const idCve = item.cve_id || idGhsa
  return idCve
}

const CASES = [
  { item: { cve_id: 'CVE-2024-1234', ghsa_id: 'GHSA-aaaa-bbbb-cccc' }, expected: 'CVE-2024-1234', label: 'con CVE real: usa el CVE' },
  { item: { cve_id: null, ghsa_id: 'GHSA-aaaa-bbbb-cccc' }, expected: 'GHSA-aaaa-bbbb-cccc', label: 'sin CVE, con GHSA: usa el GHSA como respaldo (evita la colision)' },
  { item: { cve_id: null, ghsa_id: null }, expected: 'N/A', label: 'sin CVE ni GHSA: cae en "N/A"' },
  { item: { cve_id: undefined, ghsa_id: 'GHSA-diff-0001-xxxx' }, expected: 'GHSA-diff-0001-xxxx', label: 'cve_id undefined (no solo null): tambien usa el GHSA' },
]

describe('resolveCveId() -- copia standalone tested', () => {
  it.each(CASES)('$label', ({ item, expected }) => {
    expect(resolveCveId(item)).toBe(expected)
  })
})

describe('resolveCveId() -- extraído en vivo del nodo Risk_Assessment_Engine (sincronía real)', () => {
  const jsCode = getNodeJsCode('Risk_Assessment_Engine')

  // No es un bloque de funcion balanceado por llaves (son 2 statements sueltos) --
  // regex tolerante a espacios/formato, pero exigente en la SEMANTICA (mismo fallback
  // encadenado ghsa_id -> "N/A", cve_id -> idGhsa).
  const FALLBACK_PATTERN = /const\s+idGhsa\s*=\s*item\.ghsa_id\s*\|\|\s*"N\/A";\s*const\s+idCve\s*=\s*item\.cve_id\s*\|\|\s*idGhsa;/

  it('el patron del fallback de identidad sigue presente en el nodo real (si esto falla, alguien lo reescribió sin actualizar este test)', () => {
    expect(jsCode).toMatch(FALLBACK_PATTERN)
  })

  const match = jsCode.match(FALLBACK_PATTERN)
  // Si el patron no matcheo, el test de arriba ya reporto el problema con claridad --
  // acá solo evitamos que la extraccion explote con un TypeError críptico y en su lugar
  // hacemos que las comparaciones de abajo fallen de forma prolija (mensaje legible).
  const liveResolveCveId = match
    ? evalFunction(`function resolveCveId(item) { ${match[0]} return idCve; }`)
    : () => { throw new Error('No se pudo extraer el fallback de identidad del nodo real -- ver el test anterior') }

  it.each(CASES)('el nodo real da el mismo resultado que la copia standalone: $label', ({ item, expected }) => {
    expect(liveResolveCveId(item)).toBe(expected)
    expect(liveResolveCveId(item)).toBe(resolveCveId(item))
  })
})
