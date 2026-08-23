# Preguntas Abiertas

## Inconsistencias detectadas (resueltas)

### IN-01 — Horario del scan automático global (README vs. workflow n8n) — ✅ Resuelto
**Documento A decía**: `README.md` (previo a esta ronda de documentación) afirmaba "corre un scan global automático todos los días a las 21:00".
**Documento B decía**: `workflows/Pipeline de Gestión Automatizada de Vulnerabilidades (VMP).json`, nodo `Scan_Scheduler`, tiene `triggerAtHour: 9` (09:00).
**Resolución**: confirmado con el responsable del proyecto que 09:00 es el valor correcto; README y docs corregidos. Verificado además contra la instancia de n8n corriendo en vivo (no solo el JSON en git, ver DT-09 en `docs/deuda-tecnica.md`): `Scan_Scheduler.triggerAtHour=9`, sin drift entre config real y versionada — corroborado con una ejecución real observada a las 09:03.

### IN-02 — `mttrVerifiedDays` existía en el modelo pero no estaba implementado — ✅ Resuelto
**Documento A decía**: el modelo de datos y el Dashboard exponen un concepto de "MTTR verificado" (distinto del declarado).
**Documento B decía**: `DashboardService` solo implementaba `mttrDeclaradoDays`; el campo para verificado era un stub que no calculaba nada real.
**Resolución** (DT-01 en `docs/deuda-tecnica.md`): implementado `AssetVulnerabilityRepository.findAverageMttrVerifiedDays()` — mide el tiempo de cierre solo para hallazgos con `evidenceLevel` E4+ (verificación técnica real, no una declaración humana). Expuesto en el Dashboard junto al declarado. Devuelve vacío (no un número inventado) mientras no haya ningún cierre con esa evidencia.

## Preguntas priorizadas (todas resueltas — ver `docs/deuda-tecnica.md` para el detalle de cada cierre)

| Prioridad | Pregunta | Resolución |
|-----------|----------|------------|
| Alta | ¿La instancia de n8n real tiene el scan configurado a las 09:00? | Sí, verificado en vivo (DT-09) |
| Alta | ¿Se va a implementar `mttrVerifiedDays` o queda fuera de alcance? | Implementado (DT-01) |
| Media | ¿AUDITOR tiene reglas `@PreAuthorize` explícitas en todos los endpoints? | Auditado uno por uno, sin fugas — todo endpoint de escritura lo excluye explícitamente (DT-04) |
| Media | ¿Hay un plan de archivado/retención para `VulnerabilityAudit`/`StateTransition`? | Decisión documentada: no purgar ahora (tamaño real en el orden de decenas de KB), con umbral y alternativa (particionar por año) para cuando sí haga falta (DT-03) |
| Baja | ¿El token `X-Internal-Token` se va a rotar o dotar de expiración? | Se evaluó y se descartó automatizarlo (mismo criterio que ADR-0007); se documentó el procedimiento de rotación manual paso a paso (DT-05) |
| Baja | Los binarios `.docx`/`.pdf` en `docs/All/` no se parsearon en profundidad para esta KB. | Sigue como contexto histórico/secundario — no bloqueante, no forma parte de la deuda técnica registrada |

## Gaps nuevos encontrados durante el cierre de deuda técnica (no bloqueantes)

- `WebhookController./vulnerabilities` y `/error` son endpoints inalcanzables: el pipeline real de n8n persiste hallazgos con nodos Postgres directos, nunca llama a esas rutas por HTTP. No es un problema de seguridad (fallan cerrados, exigen JWT que n8n no tiene) — es código muerto, candidato a eliminar en una pasada de limpieza si se decide hacerlo (hallazgo lateral de DT-04, no una tarea abierta en sí).
