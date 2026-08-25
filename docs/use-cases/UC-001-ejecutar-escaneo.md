# UC-001 — Ejecutar un escaneo de vulnerabilidades

**Actor principal**: ADMIN o SECURITY_ANALYST (manual) / sistema, vía `Scan_Scheduler` de n8n (automático diario 09:00, sin actor humano).

**Actores secundarios**: n8n (pipeline de detección/scoring), GitHub Advisory Database, CISA KEV.

**Precondiciones**: el activo/componente/entorno a escanear ya existe en el inventario (para escaneo manual). Para el escaneo automático, no hace falta ninguna acción previa del usuario.

## Flujo principal (manual)

1. El actor elige el alcance (activo, componente de software, entorno o global) y dispara el escaneo desde el frontend.
2. El backend crea un `ScanReport` en estado `RUNNING` y llama a n8n vía webhook (`N8nWebhookService`), sin esperar respuesta síncrona.
3. n8n obtiene el software instalado en el alcance pedido, consulta GitHub Advisory Database (y CISA KEV) por cada paquete, y calcula el score de riesgo (CVSS + criticidad de entorno + CISA KEV + zero-day).
4. n8n persiste los hallazgos directamente en Postgres y notifica al backend (`POST /api/webhook/scan-report`, autenticado con `X-Internal-Token`).
5. El backend aplica el ciclo de vida de cada hallazgo (crea/actualiza/reabre según corresponda, ver `docs/architecture/06-vulnerability-lifecycle.md`) y marca el `ScanReport` como `COMPLETED`.
6. El frontend, que hace polling acotado desde el paso 2, muestra el resultado.

## Flujos alternativos

- **Escaneo automático diario**: mismo flujo desde el paso 3, pero sin un `ScanReport` previo creado por un usuario — n8n dispara el proceso solo, y el backend crea el `ScanReport` (con `triggeredBy=null` como marca de origen automático) recién al recibir el resultado.
- **Software sin ninguna advisory en GitHub** (caso legítimo y frecuente): n8n sigue el camino de fallback garantizado (`Compute_Empty_Fallback_Metrics`) para no dejar el escaneo colgado sin resultado.

## Excepciones

- **n8n no responde o falla silenciosamente**: el watchdog (`ScanService.closeStaleRunningScans()`, cada 5 minutos por defecto) marca `FAILED` cualquier `ScanReport` que quede en `RUNNING` más allá de la ventana configurada.
- **GitHub Advisory API caída/rate-limited**: `Fetch_GitHub_Advisories` tiene manejo de error dedicado en el workflow (`onError: continueRegularOutput` + `Check_Advisory_Fetch_Error`).
- **El hallazgo llega huérfano** (sin `scan_id` vinculado, propio del camino automático): se reconcilia de forma reactiva (ventana de 60 min) y, si no alcanza, con un barrido periódico cada 30 min (`VulnerabilityAuditService.reconcileOrphanScanLinks()`, ventana de 12hs).

## Postcondiciones

`ScanReport` en `COMPLETED` (o `FAILED` si el watchdog actuó); los hallazgos quedan reflejados en `AssetVulnerability` (creados, actualizados o reabiertos) y visibles en el módulo de Vulnerabilidades y el Dashboard.
