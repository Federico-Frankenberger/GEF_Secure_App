# Preguntas Abiertas

## Inconsistencias detectadas

### IN-01 — Horario del scan automático global (README vs. workflow n8n)
**Documento A dice**: `README.md` (previo a esta ronda de documentación) afirmaba "corre un scan global automático todos los días a las 21:00".
**Documento B dice**: `workflows/Pipeline de Gestión Automatizada de Vulnerabilidades (VMP).json`, nodo `Scan_Scheduler`, tiene `triggerAtHour: 9` (09:00).
**Impacto**: expectativas operativas equivocadas (alguien podría esperar el scan a la noche y no verlo correr).
**Resolución propuesta / aplicada**: se confirmó con el responsable del proyecto que 09:00 es el valor correcto. El README y los nuevos docs (`docs/architecture/04-n8n-pipeline.md`, `n8n/README.md`) ya quedaron corregidos con 09:00 en esta misma ronda de trabajo. **Pendiente real**: verificar que la instancia de n8n en producción/demo esté efectivamente configurada a las 09:00 y no haya sido cambiada manualmente en la UI sin re-exportar el JSON.

### IN-02 — `mttrVerifiedDays` existe en el modelo pero no está implementado
**Documento A dice**: el modelo de datos y el Dashboard exponen un concepto de "MTTR verificado" (distinto del declarado).
**Documento B dice**: `DashboardService` solo implementa `mttrDeclaradoDays`; el campo/método para verificado es un stub que no calcula nada real (retorna null o equivalente).
**Impacto**: si se presenta el sistema (ej. defensa de tesis) sugiriendo que el MTTR está "verificado técnicamente", sería inexacto — hoy es puramente declarativo (lo que el analista marca).
**Resolución propuesta**: documentarlo explícitamente como gap conocido (ya hecho en `01_vision_y_objetivos.md` §Fuera de alcance y `docs/architecture/02-backend.md`) y decidir si se implementa antes de la entrega final o se deja fuera de alcance formalmente.

## Preguntas abiertas (priorizadas)

| Prioridad | Pregunta | Bloquea | Decisor |
|-----------|----------|---------|---------|
| Alta | ¿La instancia de n8n real (no solo el JSON en git) tiene el scan configurado a las 09:00? | Confiabilidad de la documentación operativa antes de una demo/defensa | Responsable del proyecto |
| Alta | ¿Se va a implementar `mttrVerifiedDays` o queda formalmente fuera de alcance de esta versión? | Alcance de la tesis, contenido del Dashboard | Responsable del proyecto |
| Media | ¿AUDITOR tiene reglas `@PreAuthorize` explícitas en todos los endpoints, o depende del fallback "autenticado = accesible"? (ver SU-03 en `09_decisiones_y_supuestos.md`) | Corrección del modelo RBAC documentado | Equipo técnico |
| Media | ¿Hay un plan de archivado/retención para `VulnerabilityAudit`/`StateTransition` (append-only, crecimiento sin límite)? | Escalabilidad de largo plazo, no bloquea la versión actual | Equipo técnico |
| Baja | ¿El token `X-Internal-Token` (n8n↔backend) se va a rotar o dotar de expiración en el futuro? | Endurecimiento de seguridad post-entrega | Responsable del proyecto |
| Baja | Los binarios `.docx`/`.pdf` en `docs/All/` (ej. `Tracking_Remediacion_Marco_de_Referencia_v3.docx`, varios PDFs) no se parsearon en profundidad para esta KB — se usaron como contexto secundario a partir de su nombre y de lo ya sintetizado en `docs/adr/` y `docs/architecture/`. Si contienen decisiones no reflejadas en el código actual, revisarlos manualmente. | Completitud de la KB | Responsable del proyecto |
