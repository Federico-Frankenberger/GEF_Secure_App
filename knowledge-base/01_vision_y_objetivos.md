# Visión y Objetivos

## Propósito del sistema

GEF Secure es un sistema de gestión automatizada de vulnerabilidades: cruza el inventario de activos de una organización contra el GitHub Advisory Database y el catálogo CISA KEV (Known Exploited Vulnerabilities), prioriza los hallazgos según la criticidad de negocio del entorno donde vive cada activo, y gestiona el ciclo de vida de cada hallazgo (Detectada → En Análisis → Resuelta) con métricas de MTTR (Mean Time To Remediate). Es un proyecto de tesis universitaria: varias decisiones de diseño están documentadas explícitamente pensando en su defensa (ver `docs/adr/`).

## Objetivos por actor

| Actor | Objetivo principal | Objetivos secundarios |
|---|---|---|
| ADMIN | Administrar el sistema completo (usuarios, catálogos, entornos) | Ver todo el inventario y todas las vulnerabilidades sin restricción |
| SECURITY_ANALYST | Triagear y cerrar hallazgos (Kanban) | Generar reportes ejecutivos, gestionar el ciclo de vida y las justificaciones VEX |
| ASSET_OWNER | Ver y gestionar solo los activos que tiene asignados | Recibir visibilidad de las vulnerabilidades de "sus" activos |
| AUDITOR | Consultar el estado del sistema sin poder modificarlo | Revisar trazabilidad (auditoría append-only) para verificación externa |

## Alcance v2.0

- Inventario de activos (hosts) con jerarquía de componentes de software instalados (SBOM vía Syft).
- Escaneo automatizado (por activo, por componente de software, por entorno o global) contra GitHub Advisory DB y CISA KEV, orquestado por n8n.
- Motor de scoring externo (n8n) que combina CVSS + criticidad de negocio del entorno + presencia en CISA KEV + condición de zero-day.
- Ciclo de vida de triage con estados DETECTADA → EN_ANALISIS → RESUELTA, más un estado de detección técnica independiente (OPEN/RESOLVED).
- Modelo de cierre inspirado en VEX (MITIGADA / NO_APLICA / RIESGO_ACEPTADO) con justificación obligatoria.
- Auditoría append-only de hallazgos y transiciones de estado, con escala de evidencia E0–E6.
- RBAC de 4 roles con scoping de activos para ASSET_OWNER.
- Dashboard con MTTR declarado, tasa de recurrencia y desgloses por severidad/entorno.
- Notificaciones a Slack y reportes PDF (ejecutivo, por escaneo, por CVE).

## Fuera de alcance

- MTTR **verificado** (basado en confirmación técnica real de la remediación, no solo en el cambio de estado declarado por el analista) — campo `mttrVerifiedDays` existe en el modelo pero no está implementado (stub, ver `10_preguntas_abiertas.md`).
- Revocación de tokens JWT antes de su expiración natural (ver ADR-0001).
- Rotación automática del token interno n8n↔backend (ver ADR-0007).
- Escaneo de vulnerabilidades más allá de lo que exponen GitHub Advisory DB y CISA KEV (no hay motor propio de detección, no hay integración con Qualys/Tenable/Nessus/etc.).
- Gestión de usuarios externos o self-service signup — los usuarios se administran manualmente vía ADMIN.

## Métricas de éxito

- MTTR declarado por criticidad de entorno, visible en el Dashboard.
- Tasa de recurrencia de vulnerabilidades (hallazgos reabiertos tras un cierre).
- Cobertura de activos con software escaneado vs. activos totales del inventario.
- Ausencia de vulnerabilidades CISA KEV sin resolver en entornos de criticidad CRITICA más allá del `dueDate` calculado.
