# 04 — Pipeline de automatización (n8n)

Ver ADR-0003 para por qué el scoring de riesgo vive acá y no en el backend.

## Provisión automática (`n8n/Dockerfile`, `n8n/bootstrap.sh`)

Imagen custom sobre `n8nio/n8n:2.4.6` (Alpine hardened, sin gestor de paquetes). `bootstrap.sh` reemplaza el entrypoint por defecto:

1. Arranca n8n temporalmente y hace polling a `/rest/settings` hasta que está listo.
2. Crea el **usuario owner** vía `POST /rest/owner/setup` usando las variables `N8N_OWNER_*`.
3. Resuelve los placeholders de credenciales (`__POSTGRES_USER__`, `__POSTGRES_PASSWORD__`, `__SLACK_BOT_TOKEN__`, `__GITHUB_TOKEN__`) con `sed` sobre un archivo temporal, e importa con `n8n import:credentials` (se eligió este camino porque `CREDENTIALS_OVERWRITE_DATA` no funcionaba en la 2.4.6).
4. Importa los workflows desde `/setup/workflows` (`n8n import:workflow --separate`) y los publica todos (`n8n list:workflow | ... | publish:workflow --id=`, ya que la serie 2.x quitó el flag de publicación masiva).
5. Calcula un hash de cada archivo de workflow para detectar cambios en arranques futuros.
6. Mata la instancia temporal y re-ejecuta `n8n start` como proceso final.

En arranques posteriores (si ya existe el marker file): re-importa credenciales de forma idempotente (soporta rotación de secretos) y re-importa/republica solo los workflows cuyo hash cambió.

Ver `n8n/README.md` para instrucciones operativas de cómo editar el workflow de forma segura.

## El workflow principal

Archivo: `workflows/Pipeline de Gestión Automatizada de Vulnerabilidades (VMP).json` (49 nodos).

### Disparadores

| Nodo | Tipo | Detalle |
|---|---|---|
| `Scan_Scheduler` | `scheduleTrigger` | **`triggerAtHour: 9` → corre todos los días a las 09:00.** El `README.md` raíz tenía este dato desactualizado (decía 21:00); se corrigió para reflejar el valor real del workflow. |
| `Webhook` | webhook | `POST /webhook/auditoria-automatizada` — lo llama el backend (`N8nWebhookService`) para scans por activo/entorno/global bajo demanda |
| `Webhook_Inject_Asset` | webhook | `POST /webhook/inject-test-asset` — inyección de datos de prueba |
| `Error_Trigger` | error workflow trigger | Workflow de error global de la instancia |

### Flujo principal

```
Fetch_CISA_KEV ─┐
                ├─▶ (chequeo/log de errores) ─▶ Extract_Advisory_Items ─▶ Deduplicate_Advisories
Fetch_GitHub_Advisories ─┘
        │
        ▼
Sync_Software_Catalog (Postgres)
        │
        ▼
Check_Internal_Assets (Postgres)
        │
        ▼
Filter_Matched_Assets / Validate_Asset_Match  (cruce contra el inventario real)
        │
        ▼
Risk_Assessment_Engine  (Code node — CVSS + criticidad de entorno + CISA KEV + zero-day)
        │
        ▼
Persist_Audit_Findings / Update_Asset_Audit_Timestamp  (Postgres)
        │
        ▼
Compute_Audit_Metrics
        │
        ├──▶ Notify_Security_Status (Slack, con ramas por entorno y por activo)
        └──▶ Persist_Scan_Statistics  (callback HTTP al backend, con `X-Internal-Token`)
```

### Rama de error

`Error_Trigger` → `Log_System_Failure` (Postgres, alimenta `SystemError` del lado backend) → `Notify_Dev_Slack`.

## Credenciales (`n8n-provisioning/credentials.json`)

3 placeholders, sin secretos reales versionados en git:

- **Postgres** — host `postgres`, base `security`, usuario/contraseña resueltos en runtime.
- **Slack API** — token de bot resuelto en runtime.
- **HTTP Header Auth** — `Bearer __GITHUB_TOKEN__`, usado para aumentar el rate limit de la GitHub Advisory API (opcional; sin el token, el pipeline funciona con el límite anónimo).

## Infraestructura (`docker-compose.yml`)

| Servicio | Puerto host | Notas |
|---|---|---|
| `postgres` | 5433→5432 | Volumen `pgdata` + `./init:/docker-entrypoint-initdb.d` |
| `n8n` | 5678 | Volumen `n8n_data` + montajes de solo lectura de `./workflows` y `./n8n-provisioning`; healthcheck sobre `/rest/settings` (no `/healthz/readiness`, por una condición de carrera verificada) |
| `pgadmin` | 8080 | Solo administración |
| `backend` | 8081→8080 | Env: `N8N_WEBHOOK_URL`, `N8N_INJECT_WEBHOOK_URL`, `N8N_INTERNAL_TOKEN` |
| `frontend` | 3000→80 | nginx sirviendo el build |
