# Actividad — ciclo de vida completo de una vulnerabilidad por escaneo

Diagrama de actividad (aproximado con `flowchart`, Mermaid no tiene un tipo "activity"
nativo) del proceso real que corre `VulnerabilityAuditService.applyLifecycle()` por
cada escaneo — la decisión de tres ramas (nuevo/persiste/reabre) más el cierre
automático por ausencia al final. Es el proceso de negocio más complejo del sistema;
complementa al [diagrama de estados](estados-vulnerabilidad.md) mostrando el flujo de
decisión, no solo los estados posibles.

```mermaid
flowchart TD
    Start(["Escaneo completado\n(webhook de n8n)"]) --> ForEach["Por cada hallazgo del escaneo\n(ordenado componente+CVE, evita deadlocks)"]

    ForEach --> Lookup{"¿Existe ya un\nAssetVulnerability\npara este componente+CVE?"}

    Lookup -->|No, y tampoco por ghsa_id| Crear["Crear nuevo\ndetectionStatus=OPEN\ntriageStatus=DETECTADA\nreopenCount=0"]
    Lookup -->|"No por cve_id, pero SÍ\npor ghsa_id (migración de\nidentidad, GitHub asignó CVE)"| Migrar["Migrar cve_id al real\n(mismo caso, no duplica)"]

    Lookup -->|"Sí, y detectionStatus=OPEN\ny triageStatus≠RESUELTA"| Persiste["Actualizar métricas\n(prioridad, CVSS, exploited...)\nsin tocar triageStatus"]

    Lookup -->|"Sí, y (detectionStatus=RESOLVED\nO triageStatus=RESUELTA)"| Reabre["Reabrir:\ndetectionStatus=OPEN\ntriageStatus=DETECTADA\nreopenCount++\nlimpiar campos VEX"]

    Crear --> Cycle1["Nuevo RemediationCycle\n+ StateTransition (ESCANER)"]
    Reabre --> Cycle2["Nuevo RemediationCycle\n+ StateTransition (ESCANER,\nREAPERTURA_ESCANEO)"]
    Migrar --> Continua1["continúa según su\ndetectionStatus/triageStatus actual"]
    Persiste --> Siguiente["Siguiente hallazgo"]
    Cycle1 --> Siguiente
    Cycle2 --> Siguiente
    Continua1 --> Siguiente

    Siguiente --> MasHallazgos{"¿Quedan\nhallazgos?"}
    MasHallazgos -->|Sí| ForEach
    MasHallazgos -->|No| Cobertura{"¿El escaneo tuvo\ncobertura completa?\n(audited+ignored ≥ totalDetected)"}

    Cobertura -->|No| FinIncompleto(["Fin — no se cierra nada\npor ausencia (evita el\nantipatrón de mejorar\nmétricas por mala cobertura)"])

    Cobertura -->|Sí| BuscarAbiertos["Buscar AssetVulnerability\nOPEN en el alcance del escaneo\nno tocados en esta corrida"]
    BuscarAbiertos --> HayAbiertos{"¿Hay alguno?"}
    HayAbiertos -->|No| FinOk(["Fin"])
    HayAbiertos -->|Sí| CerrarAusencia["Cerrar por ausencia:\ndetectionStatus=RESOLVED\ntriageStatus=RESUELTA\nresolvedAt=ahora"]
    CerrarAusencia --> Evidencia["StateTransition (POLITICA,\nCIERRE_POR_AUSENCIA,\nnivel de evidencia E2/E4\nsegún calidad del advisory)"]
    Evidencia --> FinOk
```

**Notas fieles al código real** (`VulnerabilityAuditService.applyLifecycle()`,
`backend/src/main/java/com/gef/gefsecureapp/service/VulnerabilityAuditService.java`):

- La rama de migración de identidad (`ghsa_id` estable, `cve_id` recién asignado) es un
  fix del 24-08-26 — antes de eso, una advisory que pasaba de "solo GHSA" a tener CVE
  real generaba un `AssetVulnerability` duplicado.
- El cierre por ausencia respeta el alcance real del escaneo (componente/activo/entorno/
  global) — un escaneo de un solo activo nunca cierra por ausencia vulnerabilidades de
  otros activos (ver `findOpenInScope()`).
- Ninguna de estas transiciones automáticas pasa por la máquina de estados manual
  (`TRANSICIONES_PERMITIDAS`, que solo rige `updateStatus()` desde el Kanban) — es
  intencional, ver el comentario de clase de `AssetVulnerability`.
