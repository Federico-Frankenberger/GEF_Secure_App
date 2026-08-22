# 0005 — Modelo de cierre inspirado en VEX (VEX-like outcome)

## Status

Accepted

## Context

Marcar una vulnerabilidad como "Resuelta" con un simple cambio de estado no distingue *por qué* dejó de ser una preocupación: puede haberse aplicado un parche, puede no aplicar al contexto real de uso del componente, o puede haberse aceptado el riesgo conscientemente por una decisión de negocio con plazo. Los frameworks de referencia de la industria para esto (VEX — Vulnerability Exploitability eXchange, CISA BOD 26-04, SSVC) exigen justificar el cierre con una categoría explícita, no solo un booleano "resuelto/no resuelto".

El proyecto adoptó esta idea vía el campo `outcome` en `AssetVulnerability` con tres valores: `MITIGADA`, `NO_APLICA`, `RIESGO_ACEPTADO`, acompañado de `mitigationControl` (qué control mitigante se aplicó), `justification` (texto obligatorio explicando el porqué), `acceptedBy` (quién aceptó el riesgo) y `riskAcceptedUntil` (fecha límite de la aceptación de riesgo, cuando aplica). Estos campos se introdujeron junto con `priorityVariables` (jsonb con el desglose de la fórmula de prioridad) y `dueDate` (fecha límite de remediación calculada según prioridad).

## Decision

Ninguna vulnerabilidad puede cerrarse (`triageStatus = RESUELTA`) sin un `outcome` válido y su justificación asociada. El cierre queda modelado como una decisión documentada, no como un flip de estado silencioso, y la aceptación de riesgo (`RIESGO_ACEPTADO`) lleva fecha de vencimiento propia (`riskAcceptedUntil`) independiente de la fecha límite general de remediación (`dueDate`).

## Consequences

**Positive**
- Da trazabilidad real para una auditoría o defensa de tesis: cada cierre queda respaldado por un motivo categorizado y una justificación en texto, no solo un timestamp.
- Distingue explícitamente "se arregló" (`MITIGADA`) de "no era un problema real acá" (`NO_APLICA`) de "sabemos que sigue siendo un problema y lo aceptamos por un plazo" (`RIESGO_ACEPTADO`) — tres situaciones con implicancias de riesgo muy distintas que un simple estado "Resuelta" ocultaría.
- `riskAcceptedUntil` habilita, a futuro, alertar automáticamente cuando una aceptación de riesgo vence sin que el hallazgo se haya vuelto a evaluar (aunque esa alerta automática todavía no está implementada — es una extensión natural, no parte de esta decisión).

**Negative**
- Agrega fricción al flujo de cierre: un analista no puede simplemente arrastrar la tarjeta en el Kanban a "Resuelta" sin completar outcome + justificación, lo cual es intencional pero es más pasos que un sistema de tracking más simple.
- El campo `riskAcceptedUntil` no tiene hoy (según lo relevado) un job automático que revise vencimientos y reabra o alerte — queda como dato capturado pero sin explotación activa todavía.

## Alternatives Considered

- **Un booleano simple `resolved: true/false`**: es lo que muchos sistemas de tracking más básicos usan. Se descartó porque no distingue las tres situaciones de cierre mencionadas y no deja rastro de justificación, lo cual iba en contra del objetivo explícito del proyecto de acercarse a un modelo de tracking de remediación "sólido" (ver `docs/bitacora/21-08-26/Tracking_Remediacion_Documento_Unificado.md`).
- **VEX completo con el vocabulario formal de estados VEX** (`not_affected`, `affected`, `fixed`, `under_investigation`) en vez de las tres categorías en español actuales: se prefirió un vocabulario propio más simple (`MITIGADA`/`NO_APLICA`/`RIESGO_ACEPTADO`) adaptado al proceso real del equipo, en vez de adoptar la taxonomía VEX íntegra, que agrega estados (`under_investigation`) que ya están cubiertos por `triageStatus = EN_ANALISIS`.
