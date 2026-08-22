# 0003 — n8n como motor externo de scoring y detección, no en el backend

## Status

Accepted

## Context

El sistema necesita cruzar el inventario de activos contra fuentes externas de vulnerabilidades (GitHub Advisory Database y CISA KEV), deduplicar hallazgos, hacer matching contra el catálogo de software instalado, y calcular una prioridad multi-variable (CVSS + criticidad de negocio del entorno + presencia en CISA KEV + condición de zero-day). Este trabajo podía implementarse como un servicio más dentro del backend Spring Boot, o delegarse a una herramienta de orquestación externa.

Se optó por n8n (self-hosted, Community Edition) como motor de automatización: el workflow `Pipeline de Gestión Automatizada de Vulnerabilidades (VMP)` (49 nodos) hace todo el trabajo de fetch (`Fetch_CISA_KEV`, `Fetch_GitHub_Advisories`), deduplicación, sincronización de catálogo, matching contra activos internos, filtrado por whitelist, y el cálculo de prioridad en un nodo `Risk_Assessment_Engine` (Code node). El resultado se empuja de vuelta al backend vía `POST /api/webhook/vulnerabilities`, no al revés.

El backend en sí **no contiene lógica de scoring de riesgo**: `N8nWebhookService` solo dispara el scan (`POST` al webhook de n8n con `{activo_name, entorno, scan_id}`) y `WebhookController` solo persiste lo que n8n le devuelve.

## Decision

El backend actúa como sistema de registro (system of record) y disparador de escaneos; n8n es el motor de detección, scoring y notificación (Slack), operando como un servicio externo desacoplado. La comunicación es bidireccional por HTTP: backend → n8n para disparar (`N8nWebhookService`), n8n → backend para persistir resultados (`WebhookController`, endpoints `/api/webhook/vulnerabilities`, `/api/webhook/scan-report`, `/api/webhook/error`).

## Consequences

**Positive**
- La lógica de scoring (fórmula de prioridad, fuentes externas consultadas, reglas de whitelist) se puede iterar y desplegar editando el workflow de n8n, sin tocar ni redesplegar el backend.
- Separación de responsabilidades clara: el backend no necesita clientes HTTP para GitHub Advisory API ni CISA KEV, ni lógica de deduplicación de hallazgos externos — solo modela el dominio de negocio (activos, vulnerabilidades, ciclo de vida, RBAC).
- n8n aporta observabilidad de flujo out-of-the-box (historial de ejecuciones, reintentos, notificación de errores vía `Error_Trigger` → Slack) sin tener que construir eso a mano en Java.
- El disparo también puede ser autónomo: n8n tiene su propio trigger programado (`Scan_Scheduler`, ver ADR relacionado en `docs/architecture/04-n8n-pipeline.md`) independiente de que el backend esté arriba.

**Negative**
- La lógica de negocio más sensible del sistema (cómo se calcula la prioridad de una vulnerabilidad) vive fuera del backend, en un Code node de n8n — no está bajo el mismo régimen de tests unitarios (`VulnerabilityAuditServiceTest`, etc.) ni de revisión de código Java del resto del dominio.
- Introduce una dependencia operativa dura: si n8n está caído o mal configurado, no hay detección de vulnerabilidades nueva, aunque el backend siga funcionando con los datos ya persistidos.
- El contrato entre ambos sistemas (forma del payload del webhook) es un acoplamiento implícito vía JSON, sin un esquema formal compartido (ni OpenAPI ni JSON Schema) — un cambio en el Code node de n8n puede romper `WebhookController` silenciosamente si no se coordinan ambos lados.

## Alternatives Considered

- **Job programado dentro del backend** (`@Scheduled`, como ya existe para el watchdog de scans) que llamara directamente a las APIs de GitHub Advisory y CISA KEV: mantiene todo en un solo lenguaje/deploy, pero pierde la ventaja de iteración visual/rápida de n8n y obliga a construir a mano manejo de reintentos, notificación a Slack y orquestación de pasos que n8n ya resuelve.
- **Cola de mensajes + workers Java** (ej. RabbitMQ + un servicio worker) para el pipeline de detección: más "propio" del stack pero significativamente más infraestructura y código para el alcance de un proyecto de tesis.
