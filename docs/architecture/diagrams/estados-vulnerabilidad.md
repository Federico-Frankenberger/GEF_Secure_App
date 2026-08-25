# Estados de una vulnerabilidad (`AssetVulnerability`)

Complementa a [06-vulnerability-lifecycle.md](../06-vulnerability-lifecycle.md) (que
explica el ciclo en prosa) con el diagrama de estados formal. `AssetVulnerability`
tiene **dos ejes de estado deliberadamente separados** (ver comentario de clase en
`backend/src/main/java/com/gef/gefsecureapp/model/AssetVulnerability.java`): uno que
maneja el sistema según lo que ven los escaneos, y otro que maneja el analista desde el
Kanban. No se pisan entre sí, pero sí interactúan — ver las notas al final.

```mermaid
stateDiagram-v2
    state "detectionStatus (motor automático, applyLifecycle)" as Deteccion {
        [*] --> OPEN: primera detección
        OPEN --> RESOLVED: cierre automático por ausencia (cobertura completa)
        RESOLVED --> OPEN: reapertura automática (reaparece en un escaneo)
    }

    --

    state "triageStatus (analista, Kanban)" as Triage {
        [*] --> DETECTADA
        DETECTADA --> EN_ANALISIS: analista toma el caso
        EN_ANALISIS --> DETECTADA: analista lo devuelve
        EN_ANALISIS --> RESUELTA: cierre manual (outcome VEX obligatorio)
        RESUELTA --> EN_ANALISIS: reapertura manual
    }
```

**Reglas de interacción entre los dos ejes (fixes del 24-08-26, ver
`docs/bitacora/24-08-26/plan_fix_bucle_reapertura_vulnerabilidades.md`)**:

1. Cuando `detectionStatus` pasa a `RESOLVED` por ausencia, el sistema **también** fuerza
   `triageStatus = RESUELTA` (antes quedaba congelado en lo que el analista tenía puesto,
   ej. `EN_ANALISIS` para siempre) y setea `resolvedAt`.
2. La reapertura automática se dispara si `detectionStatus` vuelve a `OPEN` **o** si
   `triageStatus` ya era `RESUELTA` mientras `detectionStatus` seguía `OPEN` (caso: un
   analista cerró el caso a mano antes de que el sistema confirmara la ausencia). Ambas
   condiciones fuerzan `triageStatus = DETECTADA` y limpian los campos VEX del cierre
   anterior (`outcome`, `resolvedAt`, `justification`, etc.).
3. Ninguna reapertura tiene límite de veces — `reopenCount` es un contador informativo,
   no un tope (ver `docs/bitacora/24-08-26/AUDITORIA_END_TO_END_2.md`, N8N-03).
4. Desde el 24-08-26, cada escritura sobre `AssetVulnerability` pasa por un chequeo de
   versión optimista (`@Version`) — dos escrituras concurrentes sobre el mismo caso se
   detectan y reintentan (`ConcurrencyFailureException`), no se pisan en silencio.
