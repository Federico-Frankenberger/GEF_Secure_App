# 0004 — Modelo dual de estado: detección automática vs. triage analista

## Status

Accepted

## Context

`AssetVulnerability` es la entidad que representa un hallazgo persistente (una tupla `softwareComponent` + `cveId`). Dos procesos distintos necesitan escribir estado sobre ella: los escaneos automáticos de n8n (que detectan si una vulnerabilidad sigue presente o ya no) y el analista humano que la trabaja en el Kanban del frontend (moviéndola de "Detectada" a "En Análisis" a "Resuelta").

Si existiera un único campo de estado compartido entre ambos procesos, un re-escaneo automático que vuelve a encontrar la misma vulnerabilidad podría pisar silenciosamente el trabajo de triage ya hecho por el analista (por ejemplo, marcarla otra vez como "abierta" cuando el analista ya la había avanzado a "En Análisis" con una justificación cargada), o al revés: un analista marcándola "Resuelta" manualmente podría ocultar que el scanner la sigue viendo activa.

## Decision

Modelar dos ejes de estado independientes sobre `AssetVulnerability`:

- **`detectionStatus`** (`OPEN` / `RESOLVED`): gestionado por el sistema, refleja si el último escaneo sigue encontrando la vulnerabilidad o no.
- **`triageStatus`** (`DETECTADA` / `EN_ANALISIS` / `RESUELTA`): gestionado por el analista vía el Kanban, refleja en qué punto del flujo de trabajo humano está el hallazgo.

`VulnerabilityAuditService` implementa la máquina de estados del triage con un mapa explícito `TRANSICIONES_PERMITIDAS` (`DETECTADA → EN_ANALISIS → RESUELTA`, con vuelta permitida `RESUELTA → EN_ANALISIS`), y el método `applyLifecycle()` es el que reconcilia ambos ejes: si un re-escaneo vuelve a detectar una vulnerabilidad que el analista había marcado `RESUELTA`, el sistema fuerza `triageStatus` de nuevo a `DETECTADA` (reapertura) e incrementa `reopenCount`, en vez de dejar coexistir un `triageStatus=RESUELTA` con un hallazgo que el scanner ve activo otra vez.

## Consequences

**Positive**
- El trabajo de análisis humano (justificaciones, VEX, asignación) no se pierde ni se pisa por un re-escaneo automático rutinario — solo se fuerza una reapertura cuando hay evidencia real de que la vulnerabilidad sigue presente.
- Permite responder por separado dos preguntas distintas que antes se confundían en un solo campo: "¿el scanner todavía ve esto?" (`detectionStatus`) vs. "¿dónde está esto en el proceso de remediación?" (`triageStatus`).
- El contador `reopenCount` y el historial en `RemediationCycle`/`StateTransition` (ver ADR-0008) quedan naturalmente alimentados por esta reconciliación, dando métricas reales de reincidencia.

**Negative**
- Dos campos de estado en la misma entidad son inherentemente más difíciles de razonar que uno solo — cualquier consulta o reporte que solo mire `triageStatus` sin considerar `detectionStatus` (o viceversa) puede dar una lectura incompleta del estado real de una vulnerabilidad.
- La lógica de reconciliación (`applyLifecycle`) concentra una responsabilidad delicada en un único método de `VulnerabilityAuditService` (672 líneas): un bug ahí afecta la integridad de todo el historial de triage.

## Alternatives Considered

- **Un solo campo de estado combinado** (ej. un enum `DETECTADA_ABIERTA`, `EN_ANALISIS_ABIERTA`, `RESUELTA_CERRADA`, `RESUELTA_REABIERTA`...): técnicamente posible, pero explota combinatoriamente y mezcla dos dimensiones ortogonales (quién la escribe, con qué cadencia) en un solo enum difícil de extender.
- **Dejar que el triage sea la única fuente de verdad y que el scanner nunca reabra automáticamente**: más simple, pero le quita al sistema la capacidad de alertar automáticamente sobre regresiones (una vulnerabilidad que vuelve a aparecer tras haber sido marcada resuelta) sin que un humano la vuelva a detectar por casualidad.
