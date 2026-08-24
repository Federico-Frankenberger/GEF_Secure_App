import { describe, it, expect } from 'vitest'
import { getNodeJsCode, extractBalancedFunction, evalFunction } from './helpers/extractNodeCode.js'

// Copia standalone -- debe ser IDENTICA en comportamiento a la que vive dentro del
// nodo Risk_Assessment_Engine del workflow real (workflows/Pipeline de Gestion
// Automatizada de Vulnerabilidades (VMP).json). N8N-04 (docs/22-08-26/AUDITORIA_END_TO_END.md):
// reemplazo a localeCompare({numeric:true}), que fallaba en "1.9" vs "1.10" (los trataba
// como 1.9 > 1.10) y no entendia sufijos "v"/prerelease.
function compareVersions(a, b) {
  const parse = (v) => {
    const clean = String(v).trim().replace(/^v/i, '')
    const [release, prerelease] = clean.split('-', 2)
    const parts = release.split('.').map((p) => parseInt(p, 10) || 0)
    return { parts, prerelease: prerelease || null }
  }
  const pa = parse(a)
  const pb = parse(b)
  const len = Math.max(pa.parts.length, pb.parts.length)
  for (let i = 0; i < len; i++) {
    const na = pa.parts[i] || 0
    const nb = pb.parts[i] || 0
    if (na !== nb) return na < nb ? -1 : 1
  }
  if (pa.prerelease && !pb.prerelease) return -1
  if (!pa.prerelease && pb.prerelease) return 1
  if (pa.prerelease && pb.prerelease) return pa.prerelease.localeCompare(pb.prerelease)
  return 0
}

// Los 4 casos limite que motivaron N8N-04, mas un par de casos triviales.
const CASES = [
  { a: '1.2', b: '1.2.0', expected: 0, label: '1.2 == 1.2.0 (longitudes distintas)' },
  { a: '1.9', b: '1.10', expected: -1, label: '1.9 < 1.10 (localeCompare fallaba acá)' },
  { a: '2.0.0', b: 'v2.0', expected: 0, label: '2.0.0 == v2.0 (prefijo v)' },
  { a: '1.2.0-beta', b: '1.2.0', expected: -1, label: '1.2.0-beta < 1.2.0 (prerelease)' },
  { a: '3.0.0', b: '2.9.9', expected: 1, label: '3.0.0 > 2.9.9 (caso trivial)' },
]

describe('compareVersions() -- copia standalone tested', () => {
  it.each(CASES)('$label', ({ a, b, expected }) => {
    expect(compareVersions(a, b)).toBe(expected)
  })
})

describe('compareVersions() -- extraída en vivo del nodo Risk_Assessment_Engine (sincronía real)', () => {
  const jsCode = getNodeJsCode('Risk_Assessment_Engine')
  const liveSource = extractBalancedFunction(jsCode, 'compareVersions')
  const liveCompareVersions = evalFunction(liveSource)

  it.each(CASES)('el nodo real da el mismo resultado que la copia standalone: $label', ({ a, b, expected }) => {
    expect(liveCompareVersions(a, b)).toBe(expected)
    expect(liveCompareVersions(a, b)).toBe(compareVersions(a, b))
  })
})
