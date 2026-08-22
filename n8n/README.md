# n8n — GEF Secure

Instancia n8n self-hosted (Community Edition) que corre el pipeline de escaneo/scoring de vulnerabilidades. Carpetas relacionadas: `n8n/` (imagen + bootstrap), `n8n-provisioning/` (credenciales placeholder), `workflows/` (el workflow versionado en git).

## Qué hace `bootstrap.sh`

Reemplaza el entrypoint por defecto de la imagen `n8nio/n8n`. En el primer arranque:

1. Levanta n8n temporalmente y espera a que `/rest/settings` responda.
2. Crea el **usuario owner** vía `POST /rest/owner/setup` con las variables `N8N_OWNER_*`.
3. Resuelve los placeholders de `n8n-provisioning/credentials.json` (`__POSTGRES_USER__`, `__POSTGRES_PASSWORD__`, `__SLACK_BOT_TOKEN__`, `__GITHUB_TOKEN__`) con `sed` sobre un archivo temporal, y los importa (`n8n import:credentials`).
4. Importa el/los workflow(s) desde `/setup/workflows` (`n8n import:workflow --separate`) y los publica todos.
5. Guarda un hash de cada archivo de workflow para detectar cambios en arranques futuros.
6. Mata la instancia temporal y arranca n8n como proceso final (`n8n start`).

En arranques siguientes (si ya existe el marcador de bootstrap): reimporta credenciales de forma idempotente (soporta rotación de secretos) y solo reimporta/republica los workflows cuyo hash cambió.

## Cómo editar el workflow de forma segura

**No edites `workflows/*.json` a mano.** El flujo correcto es:

1. Editar el workflow en la UI de n8n (`http://localhost:5678`).
2. Exportar el workflow actualizado desde la UI.
3. Reemplazar el archivo correspondiente en `workflows/`.
4. Reiniciar el contenedor (`docker compose restart n8n`) — el hash cambiado dispara la reimportación automática.

Si se edita solo en la UI y nunca se reexporta, el JSON versionado en git queda desactualizado respecto a lo que corre en producción — ya pasó una vez con el horario del scan (ver más abajo), prestar atención a esto.

## Credenciales

`n8n-provisioning/credentials.json` contiene 3 credenciales placeholder (Postgres, Slack Bot Token, GitHub HTTP Header Auth) **sin secretos reales** — los valores reales salen de las variables de entorno del `.env` y se inyectan recién en runtime por `bootstrap.sh`.

## Horario del scan automático

El scan global automático corre todos los días a las **09:00** (`Scan_Scheduler`, `scheduleTrigger` con `triggerAtHour: 9`, en el workflow `Pipeline de Gestión Automatizada de Vulnerabilidades (VMP)`). El README principal del repo tenía este dato desactualizado (decía 21:00); ya se corrigió ahí también. Si en algún momento se cambia el horario, hacerlo en la UI de n8n **y** reexportar el JSON, no solo uno de los dos lugares.

## Ver también

- [`docs/architecture/04-n8n-pipeline.md`](../docs/architecture/04-n8n-pipeline.md) — el pipeline completo de 49 nodos (fetch de CISA KEV/GitHub Advisories, matching contra inventario, motor de scoring, persistencia, notificaciones).
