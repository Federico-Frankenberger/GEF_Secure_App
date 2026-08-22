# 0008 — Auditoría inmutable y append-only para hallazgos y cambios de estado

## Status

Accepted

## Context

`AssetVulnerability` es una entidad mutable: su `detectionStatus`, `triageStatus`, `outcome`, asignación, etc. cambian con el tiempo (ver ADR-0004 y ADR-0005). Un sistema de tracking de remediación serio necesita, además del estado *actual*, poder reconstruir *qué pasó* — cuándo se detectó por primera vez cada hallazgo, en qué escaneo, qué versión de software y ecosistema tenía en ese momento, y qué transiciones de estado sufrió con qué evidencia y quién las hizo. Si esa historia se derivara solo de UPDATEs sobre la fila mutable, se perdería en cuanto ocurriera el siguiente cambio.

## Decision

Separar el estado mutable (`AssetVulnerability`) de dos mecanismos de historial estrictamente append-only:

- **`VulnerabilityAudit`** (`vulnerabilities_audit`): un registro inmutable por cada vez que un escaneo encuentra un hallazgo, con FK a `SoftwareComponent`, `ScanReport` y `AssetVulnerability`, y una *snapshot* de software/ecosistema/versión tal como estaban en el momento de la detección (no una referencia al estado actual, que puede haber cambiado desde entonces).
- **`RemediationCycle`** y **`StateTransition`** (`init/19`): el primero registra ciclos completos de apertura/cierre por hallazgo (permitiendo contar reincidencias, ver `reopenCount` en ADR-0004); el segundo es un log append-only de cada transición de estado individual, con `from_state`/`to_state`/actor/trigger y una referencia de evidencia (`evidence_ref`) sobre una escala E0–E6 (`init/22`) que gradúa qué tan verificado está ese cambio de estado.

Ninguna de estas tablas se actualiza in-place: solo se insertan filas nuevas.

## Consequences

**Positive**
- Las métricas de MTTR y de reincidencia (ver `DashboardService`, `findAverageMttrDeclaredDays[ByPriority]`) se calculan sobre datos que no pudieron haber sido alterados retroactivamente — un requisito razonable para que esas métricas sean defendibles como parte de la tesis.
- Permite responder preguntas forenses ("¿cuándo se detectó esto la primera vez y con qué severidad tenía entonces?") que un modelo puramente mutable no puede responder una vez que el dato cambió.
- La escala de evidencia E0–E6 en `StateTransition` deja explícito no solo *qué* cambió sino *qué tan confiable* es esa transición, en vez de tratar todos los cambios de estado como igualmente verificados.

**Negative**
- Tres tablas de historial (`vulnerabilities_audit`, `remediation_cycles`, `state_transitions`) más la entidad mutable en sí es más superficie de datos para razonar y mantener consistente que un solo modelo de estado con updates.
- Crecimiento de datos sin acotar: al ser append-only por diseño, estas tablas crecen indefinidamente con cada escaneo y cada transición — no hay (según lo relevado) una política de purga/archivado definida todavía.
- La snapshot de software/ecosistema/versión en `VulnerabilityAudit` duplica datos que también existen (de forma mutable) en `SoftwareComponent` — es una duplicación intencional por motivos de auditoría, pero exige disciplina para no confundir "el componente tal como es hoy" con "el componente tal como era cuando se detectó esto".

## Alternatives Considered

- **Versionado genérico tipo Hibernate Envers** (auditoría automática de cambios sobre las entidades JPA): hubiera evitado escribir el modelo de historial a mano, pero audita *todos* los cambios de *todas* las entidades de forma genérica, sin el vocabulario específico de dominio (ciclos de remediación, escala de evidencia) que este proyecto necesitaba exponer explícitamente en su modelo de datos.
- **Un único log de eventos genérico (event sourcing completo)**: reconstruir el estado actual a partir de un stream de eventos es más flexible a largo plazo, pero es un cambio de paradigma mucho más profundo (todo el estado mutable pasaría a ser una proyección) que excede el alcance de lo que este dominio necesitaba resolver.
