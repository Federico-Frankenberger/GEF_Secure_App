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
**Trade-off aceptado**: sin rotación ni expiración del token hoy — es un secreto de larga vida.

### DD-08 — Auditoría inmutable append-only (ADR-0008)
**Decisión**: `VulnerabilityAudit`/`RemediationCycle`/`StateTransition` nunca se editan, solo se agregan filas.
**Trade-off aceptado**: crecimiento continuo de estas tablas sin estrategia de archivado definida todavía.

## Supuestos inferidos

### SU-01 — MTTR mostrado es siempre "declarado", nunca "verificado"
**Supuesto**: el KPI de MTTR en el Dashboard refleja cuándo el analista marcó RESUELTA, no una confirmación técnica independiente de que la vulnerabilidad efectivamente dejó de existir.
**Origen**: `DashboardService` — `mttrVerifiedDays` está en el modelo pero el método que lo calcula devuelve `null` (stub).
**Riesgo si es falso** (es decir, si se asumiera que sí está verificado): sobreestimar la confiabilidad del KPI frente a un cliente o en una auditoría externa.
**Cómo validar**: leer `DashboardService.calcularMttr*` y confirmar que no hay lógica de verificación técnica implementada.

### SU-02 — El horario del scan automático global es 09:00, no 21:00
**Supuesto**: el valor correcto y vigente es 09:00 (`Scan_Scheduler.triggerAtHour: 9` en `workflows/*.json`).
**Origen**: discrepancia detectada entre el README (decía 21:00) y el workflow real; confirmado con el responsable del proyecto que 09:00 es el valor correcto, README corregido en consecuencia.
**Riesgo si es falso**: si en producción se cambió manualmente a otra hora dentro de la UI de n8n sin re-exportar el JSON, el workflow versionado en git quedaría desactualizado.
**Cómo validar**: inspeccionar la configuración real del workflow activo en la instancia de n8n corriendo (no solo el JSON en git) antes de una demo en vivo.

### SU-03 — AUDITOR no tiene reglas `@PreAuthorize` explícitas en todos los endpoints
**Supuesto**: AUDITOR obtiene acceso de solo lectura "por defecto" (cualquier usuario autenticado) en los endpoints que no restringen explícitamente por rol, más que por una regla `@PreAuthorize("hasRole('AUDITOR')")` dedicada en cada uno.
**Origen**: los exploradores de código no encontraron referencias explícitas a AUDITOR en la mayoría de los `@PreAuthorize` revisados.
**Riesgo si es falso**: AUDITOR podría tener permisos de escritura no intencionados en algún endpoint que solo verifica "autenticado", no "de solo lectura".
**Cómo validar**: grep de `@PreAuthorize` en todos los controladores y confirmar que ningún endpoint de escritura (POST/PUT/PATCH/DELETE) queda accesible sin una allowlist de roles que excluya a AUDITOR.
