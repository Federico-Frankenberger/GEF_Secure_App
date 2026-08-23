# Decisiones y Supuestos

## Decisiones documentadas

Formalizadas como ADRs en `docs/adr/` — acá solo el resumen ejecutivo, ir a cada ADR para Context/Consequences/Alternatives completos.

### DD-01 — JWT stateless sin revocación (ADR-0001)
**Decisión**: no mantener lista de revocación ni verificar el usuario contra la base en cada request.
**Trade-off aceptado**: un token emitido sigue válido hasta expirar aunque el usuario se borre o cambie de rol mientras tanto.

### DD-02 — Esquema SQL manual, sin herramienta de migraciones (ADR-0002)
**Decisión**: 26 scripts SQL idempotentes en `init/`, `ddl-auto=validate`, sin Flyway/Liquibase.
**Trade-off aceptado**: no hay historial de migraciones versionado por herramienta; el orden y la idempotencia dependen de la disciplina de nombrar los archivos secuencialmente.

### DD-03 — n8n como motor externo de scoring (ADR-0003)
**Decisión**: el cálculo de prioridad/riesgo vive en n8n (nodo Code), no en el backend Java.
**Trade-off aceptado**: la lógica de scoring no tiene tests unitarios Java ni type-safety; vive como JavaScript dentro de un nodo n8n.

### DD-04 — Modelo dual detectionStatus/triageStatus (ADR-0004)
**Decisión**: separar el estado "técnico" (lo que dice el último escaneo) del estado "de triage" (lo que decide el analista).
**Trade-off aceptado**: mayor complejidad de modelo (dos máquinas de estado coexistiendo) a cambio de no perder trabajo de análisis humano ante un re-escaneo.

### DD-05 — Cierre inspirado en VEX (ADR-0005)
**Decisión**: exigir un outcome (MITIGADA/NO_APLICA/RIESGO_ACEPTADO) + justificación para cerrar un hallazgo.
**Trade-off aceptado**: fricción adicional en el flujo de cierre, a cambio de defensibilidad ante auditoría.

### DD-06 — RBAC de 4 roles con scoping (ADR-0006)
**Decisión**: ADMIN/SECURITY_ANALYST/ASSET_OWNER/AUDITOR, con ASSET_OWNER limitado a activos asignados.
**Trade-off aceptado**: el frontend replica parcialmente la lógica de permisos para UX, con el riesgo de que diverja del backend si no se mantiene sincronizado a mano.

### DD-07 — Token interno compartido para el webhook n8n (ADR-0007)
**Decisión**: `X-Internal-Token` en vez de JWT para las llamadas n8n→backend.
**Trade-off aceptado**: sin rotación ni expiración automática del token — se evaluó (HMAC con ventana de validez) y se descartó por la misma razón que el propio ADR-0007 rechazó mTLS/JWT-de-servicio: complejidad sin beneficio real para el modelo de confianza actual. Formalizado como riesgo aceptado, con un procedimiento de rotación manual documentado (addendum en el ADR, `docs/deuda-tecnica.md` DT-05).

### DD-08 — Auditoría inmutable append-only (ADR-0008)
**Decisión**: `VulnerabilityAudit`/`RemediationCycle`/`StateTransition` nunca se editan, solo se agregan filas.
**Trade-off aceptado**: crecimiento continuo de estas tablas. Decisión tomada (DT-03): no purgar/archivar por ahora — tamaño real medido en el orden de decenas de KB, faltan años al ritmo real de uso para que sea un problema. Alternativa documentada (particionar por año) y umbral para reabrir la decisión (orden de GB) en `docs/architecture/07-disponibilidad-y-recuperacion.md`.

## Supuestos inferidos (resueltos — ver `docs/deuda-tecnica.md` para el cierre completo de cada uno)

### SU-01 — MTTR mostrado era siempre "declarado", nunca "verificado" — ✅ Resuelto
**Supuesto original**: el KPI de MTTR en el Dashboard reflejaba cuándo el analista marcó RESUELTA, no una confirmación técnica independiente.
**Resolución** (DT-01): implementado `mttrVerifiedDays` — mide el tiempo hasta cierres con `evidenceLevel` E4+ (verificación técnica real), expuesto en el Dashboard junto al declarado.

### SU-02 — El horario del scan automático global es 09:00, no 21:00 — ✅ Confirmado
**Supuesto original**: el valor correcto y vigente es 09:00 (`Scan_Scheduler.triggerAtHour: 9` en `workflows/*.json`).
**Resolución** (DT-09): verificado contra la instancia de n8n corriendo en vivo (no solo el JSON en git) — coincide, sin drift. Corroborado con una ejecución real observada a las 09:03.

### SU-03 — AUDITOR no tenía reglas `@PreAuthorize` explícitas en todos los endpoints — ✅ Descartado
**Supuesto original**: AUDITOR podría depender del fallback "autenticado = accesible" en vez de una regla dedicada.
**Resolución** (DT-04): auditados los 20 controllers uno por uno — todo endpoint de escritura (POST/PUT/PATCH/DELETE) excluye a AUDITOR explícitamente. El fallback "autenticado = accesible" solo aplica a catálogos genéricos sin dato de la organización, donde es el comportamiento deseado. Sin fugas encontradas.
