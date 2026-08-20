import { useCallback, useRef, useState } from 'react'
import { scanApi } from '../services/api'
import type { ScanTargetType } from '../types'

export type ScanPollState = 'idle' | 'running' | 'done' | 'timeout' | 'error'

// Global/Entorno procesan potencialmente muchos mas activos que un scan
// puntual -- se les da mas tiempo antes de declarar timeout.
const TIMEOUT_MS: Record<ScanTargetType, number> = {
  ACTIVO: 30_000,
  HOST: 45_000,
  ENTORNO: 60_000,
  GLOBAL: 90_000,
}
const POLL_INTERVAL_MS = 3_000

export function useScanPolling() {
  const [state, setState] = useState<ScanPollState>('idle')
  const timerRef = useRef<number | null>(null)

  const stop = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = null
    setState('idle')
  }, [])

  const start = useCallback((
    targetType: ScanTargetType,
    targetName: string,
    onDone?: () => void,
    onTimeout?: () => void,
  ) => {
    stop()
    setState('running')
    const baselineAt = Date.now()
    const deadline = baselineAt + TIMEOUT_MS[targetType]

    const poll = async () => {
      try {
        const { status, data } = await scanApi.latestReport(targetType, targetName)
        if (status === 200 && data && new Date(data.executedAt).getTime() >= baselineAt) {
          setState('done')
          onDone?.()
          return
        }
      } catch {
        // error de red puntual: se sigue reintentando hasta el timeout,
        // no se corta el polling por un solo fallo transitorio
      }
      if (Date.now() >= deadline) {
        setState('timeout')
        onTimeout?.()
        return
      }
      timerRef.current = window.setTimeout(poll, POLL_INTERVAL_MS)
    }
    timerRef.current = window.setTimeout(poll, POLL_INTERVAL_MS)
  }, [stop])

  return { state, start, stop }
}
