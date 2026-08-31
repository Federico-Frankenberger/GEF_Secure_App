# n8n — Automatización (extra)

El pipeline de detección/scoring es lo bastante complejo (49 nodos) como para merecer su propio archivo además de `02_descripcion_general.md`. Detalle completo en `docs/architecture/04-n8n-pipeline.md`.

## Provisión del contenedor (`n8n/Dockerfile` + `n8n/bootstrap.sh`)

Imagen custom sobre `n8nio/n8n:2.4.6`. En el primer arranque: crea el owner de n8n vía `POST /rest/owner/setup`, resuelve placeholders de credenciales (`__POSTGRES_USER__`, `__SLACK_BOT_TOKEN__`, `__GITHUB_TOKEN__`, etc.) con `sed`, importa credenciales (`n8n import:credentials` — se eligió por sobre `CREDENTIALS_OVERWRITE_DATA`, que no funcionaba en la versión 2.4.6), importa y publica los workflows, y calcula un hash de cada archivo de workflow para detectar cambios en reinicios posteriores (evita reimportar/republicar si no cambió nada). En reinicios, si el hash cambió, reimporta solo ese workflow.

## El workflow: "Pipeline de Gestión Automatizada de Vulnerabilidades (VMP)"

**Triggers**:
- `Scan_Scheduler` — `scheduleTrigger`, dispara todos los días a las **09:00** (`triggerAtHour: 9`).
- `Webhook` — `POST /webhook/auditoria-automatizada`, invocado por el backend (`N8nWebhookService`) para escaneos bajo demanda.
- `Webhook_Inject_Asset` — `POST /webhook/inject-test-asset`, inyección de datos de prueba.
- `Error_Trigger` — workflow de error global de n8n.

**Flujo principal**:
```
Fetch_CISA_KEV ─┐
                ├→ Extract_Advisory_Items → Deduplicate_Advisories
Fetch_GitHub_Advisories ─┘
   → Sync_Software_Catalog (Postgres)
   → Check_Internal_Assets (Postgres) → Filter_Matched_Assets / Validate_Asset_Match
   → Risk_Assessment_Engine (nodo Code: CVSS + criticidad de entorno + CISA KEV + zero-day)
   → Persist_Audit_Findings + Update_Asset_Audit_Timestamp (Postgres)
   → Compute_Audit_Metrics
   → Notify_Security_Status (Slack, ramas por entorno/activo) + Persist_Scan_Statistics (callback HTTP al backend, X-Internal-Token)
```

**Rama de error**: `Error_Trigger` → `Log_System_Failure` (Postgres, tabla `system_errors`) + `Notify_Dev_Slack`.

## Credenciales (`n8n-provisioning/credentials.json`)

3 placeholders sin secretos reales en git: Postgres (host `postgres`, db `security`), Slack API (bot token), HTTP Header Auth "Bearer `__GITHUB_TOKEN__`" (rate limit de GitHub Advisory API). Se resuelven en runtime desde variables de entorno.

## Cómo editar el workflow de forma segura

Editar en la UI de n8n en vivo → exportar → reemplazar el JSON en `workflows/` → reiniciar el contenedor (el hash cambia, se reimporta). Nunca editar el JSON a mano sin probar el resultado en la UI primero — el formato de export de n8n tiene metadatos internos (posiciones, IDs) que son fáciles de romper editando a mano.
