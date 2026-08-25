# Secuencia — reapertura automática y cierre por ausencia

[secuencia-triage.md](secuencia-triage.md) cubre el camino **manual** (un analista
cerrando un caso desde el Kanban). Esta secuencia cubre el camino **automático**: qué
pasa cuando un escaneo posterior vuelve a detectar (o deja de detectar) algo que ya
existía — el corazón real de "remediación" en este sistema, y la parte que tuvo más
bugs encontrados y corregidos en las auditorías del 24-08-26.

```mermaid
sequenceDiagram
    participant N8N as n8n (escaneo)
    participant WH as WebhookController
    participant SS as ScanService
    participant VAS as VulnerabilityAuditService
    participant DB as Postgres

    N8N->>WH: POST /api/webhook/scan-report (X-Internal-Token)
    WH->>WH: runWithDeadlockRetry()\n(reintenta ante deadlock u\noptimistic lock, hasta 3 veces)
    WH->>SS: complete(scanId, payload) / completeAutomatic(payload)

    alt escaneo automático (Scan_Scheduler)
        SS->>SS: existsByAutomaticScanTrueAndExecutedAtAfter()\n(guarda contra webhooks duplicados, fix 2026-08-24)
        SS->>VAS: linkOrphanFindings(scanReportId, ventana 60min)
    end

    SS->>VAS: applyLifecycle(scan)
    VAS->>DB: por cada hallazgo: crear / persistir / reabrir\n(AssetVulnerability, ver diagrama de actividad)
    VAS->>DB: cerrar por ausencia lo que no apareció\n(si cobertura completa)
    VAS-->>SS: OK
    SS-->>WH: ScanReport actualizado
    WH-->>N8N: 200 OK

    Note over VAS,DB: Reconciliación periódica (cada 30 min, @Scheduled)
    VAS->>DB: reconcileOrphanScanLinks()\n(vincula hallazgos huérfanos al scan automático más cercano)
    VAS->>VAS: re-ejecuta applyLifecycle()\npara los ScanReport recién vinculados\n(fix 2026-08-24 — antes solo vinculaba\nscan_id sin reabrir nada)
```

**Notas fieles al código real**:
- La guarda de idempotencia (`existsByAutomaticScanTrueAndExecutedAtAfter`) es el fix
  más crítico de la sesión: sin ella, un webhook automático duplicado podía auto-resolver
  por ausencia el 100% del inventario abierto de la organización (`ScanReport` sin
  alcance → `findOpenInScope()` cae en "todas las `OPEN`") — ver
  `docs/bitacora/24-08-26/plan_fix_bucle_reapertura_vulnerabilidades.md`.
- `reconcileOrphanScanLinks()` corre cada 30 minutos (`@Scheduled`) para hallazgos que
  llegaron con `scan_id` nulo y no se vincularon dentro de la ventana reactiva de 60 min
  — antes del fix, esta reconciliación tardía nunca volvía a evaluar el ciclo de vida,
  así que un caso que debía reabrirse podía quedar "oculto" como resuelto indefinidamente.
