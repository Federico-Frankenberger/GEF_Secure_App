import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WORKFLOW_PATH = path.join(
  __dirname,
  '..',
  '..',
  'Pipeline de Gestión Automatizada de Vulnerabilidades (VMP).json',
)

/** Lee el workflow real y devuelve el jsCode (string) de un nodo Code por nombre.
 *  Tira si el nodo no existe -- eso ya es una señal util (alguien lo renombro/borro). */
export function getNodeJsCode(nodeName) {
  const raw = readFileSync(WORKFLOW_PATH, 'utf-8')
  const workflow = JSON.parse(raw)
  const node = workflow.nodes.find((n) => n.name === nodeName)
  if (!node) {
    throw new Error(`Nodo "${nodeName}" no encontrado en el workflow -- ¿se renombró?`)
  }
  if (!node.parameters || typeof node.parameters.jsCode !== 'string') {
    throw new Error(`Nodo "${nodeName}" no tiene parameters.jsCode -- ¿ya no es un Code node?`)
  }
  return node.parameters.jsCode
}

/** Extrae un bloque `function <name>(...) { ... }` balanceando llaves manualmente
 *  (no un regex no-greedy, que rompe con las llaves anidadas reales del cuerpo).
 *  Devuelve el texto exacto del bloque, evaluable con `new Function(...)`. */
export function extractBalancedFunction(source, functionName) {
  const marker = `function ${functionName}(`
  const start = source.indexOf(marker)
  if (start === -1) {
    throw new Error(`No se encontró "${marker}" en el codigo del nodo -- ¿se renombró la función?`)
  }
  const braceStart = source.indexOf('{', start)
  if (braceStart === -1) {
    throw new Error(`"${marker}" encontrado pero sin "{" que le siga -- codigo inesperado.`)
  }
  let depth = 0
  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}') {
      depth--
      if (depth === 0) return source.slice(start, i + 1)
    }
  }
  throw new Error(`No se pudo balancear las llaves de "${functionName}" -- codigo truncado o malformado.`)
}

/** Evalúa el texto de una función extraída y la devuelve como función invocable. */
export function evalFunction(functionSource) {
  return new Function(`return (${functionSource});`)()
}
