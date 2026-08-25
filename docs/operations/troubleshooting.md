# Troubleshooting

Problemas conocidos y reproducibles del proyecto, con causa raíz real (no genérica) y
solución verificada. Sintetizado de `docs/deuda-tecnica.md` y los patrones recurrentes de
`docs/bitacora/`. Si aparece un problema nuevo y real, agregarlo acá con la misma
estructura — no inventar entradas para problemas que nunca se vieron.

---

## n8n reinicia en loop / "Mismatching encryption keys"

**Síntomas**: el contenedor `vuln_n8n` no llega a `healthy`, reinicia repetidamente.

**Causa**: `N8N_ENCRYPTION_KEY` en `.env` cambió respecto al valor usado cuando se
crearon las credenciales guardadas en el volumen `n8n_data` — n8n no puede descifrarlas
con la clave nueva.

**Cómo diagnosticar**: `docker logs vuln_n8n` — el mensaje de error lo dice
explícitamente ("Mismatching encryption keys...").

**Solución**: restaurar el valor original de `N8N_ENCRYPTION_KEY` en `.env`, o si no se
puede recuperar, borrar el volumen `n8n_data` (`docker compose down -v` — se pierde el
historial de ejecuciones de n8n, no los datos de la app en `pgdata`) y dejar que se
reconstruya desde cero.

---

## El backend no arranca con `SPRING_PROFILES_ACTIVE=prod`

**Síntomas**: `IllegalStateException: JWT_SECRET no está configurado...` (o el mismo
error para `N8N_INTERNAL_TOKEN`) en los logs de `gef_backend`, el contenedor no llega a
`Started BackendApplication`.

**Causa**: `SecretsValidator` hace fail-fast a propósito cuando el perfil `prod` está
activo y alguno de los dos secretos quedó vacío o con el valor de ejemplo de
`application.properties` — es el comportamiento deseado, no un bug.

**Solución**: generar secretos reales (`openssl rand -base64 32`) y ponerlos en el
`.env`/`.env.prod` real antes de levantar con ese perfil. Ver
[`docs/operations/deployment.md`](deployment.md).

---

## Un escaneo queda en `RUNNING` para siempre

**Síntomas**: el frontend hace polling indefinido esperando que un escaneo termine; en
`scan_reports`, la fila tiene `status='RUNNING'` y `executed_at` en `NULL` mucho después
de cuándo debería haber terminado.

**Causa posible 1**: n8n falló silenciosamente o el webhook de cierre
(`POST /api/webhook/scan-report`) nunca llegó al backend.

**Causa posible 2**: el software escaneado no tiene ninguna advisory en GitHub —
escenario legítimo y frecuente, ya corregido con una rama de fallback garantizada en el
workflow (`Compute_Empty_Fallback_Metrics`).

**Cómo diagnosticar**: `docker logs vuln_n8n` (buscar la ejecución del workflow
correspondiente); `SELECT * FROM scan_reports WHERE status='RUNNING' AND started_at <
now() - interval '30 minutes'` contra Postgres.

**Solución**: no hace falta intervención manual — el watchdog
(`ScanService.closeStaleRunningScans()`, `@Scheduled` cada 5 minutos por defecto) marca
automáticamente como `FAILED` cualquier escaneo `RUNNING` que no se actualizó dentro de
la ventana configurada (`scan.watchdog.check-interval-ms`). Si se repite seguido para el
mismo tipo de escaneo, revisar el workflow de n8n en busca de una rama sin salida hacia
`Persist_Scan_Statistics`.

---

## Login rechazado sin razón aparente

**Síntomas**: `401` con el mensaje genérico "Usuario o contraseña inválidos" para un
usuario que el ADMIN sabe que tiene la contraseña correcta.

**Causas posibles** (el sistema usa el mismo mensaje genérico para las 3, a propósito,
para no filtrar cuál aplica — ver RN-AU-03):
1. Usuario o contraseña realmente incorrectos.
2. El usuario fue desactivado (`active=false`) por un ADMIN.
3. Rate limit alcanzado (10 intentos/min por esa IP) — da `429`, no `401`, así que es
   distinguible por el código de estado si se inspecciona la respuesta cruda.

**Cómo diagnosticar**: un ADMIN puede consultar `GET /api/users/{id}` para confirmar si
`active` es `false`; el código de estado HTTP (`401` vs `429`) distingue rate limit de
credenciales/usuario inactivo.

**Solución**: reactivar el usuario (`PATCH /api/users/{id}/active`) si corresponde, o
esperar la ventana de 1 minuto si es rate limit.

---

## Cambié el esquema (agregué un `init/*.sql` nuevo) y el backend no arranca contra una base ya existente

**Síntomas**: `SchemaManagementException` de Hibernate al arrancar (`ddl-auto=validate`
detecta una columna/tabla que la entidad JPA espera y la base no tiene).

**Causa**: los scripts de `init/` **solo se ejecutan automáticamente contra un volumen
de Postgres nuevo** (`docker-entrypoint-initdb.d`) — no se re-ejecutan contra un volumen
que ya existe, aunque se agregue un script nuevo con número más alto.

**Solución**: aplicar el script nuevo a mano contra el volumen existente
(`docker exec vuln_postgres psql -U <user> -d security -f /ruta/al/script.sql`, o el
`ALTER TABLE`/`CREATE` puntual que agrega) antes de reiniciar el backend. Para un
entorno realmente nuevo (CI, un volumen fresco), los scripts se aplican solos en orden.

---

## `scripts/backup.sh` falla con rutas raras en Windows/Git Bash

**Síntomas**: `docker cp`/`docker exec` fallan con una ruta que no tiene sentido (algo
como `C:/Program Files/Git/tmp/...` en vez de `/tmp/...`).

**Causa**: MSYS (el entorno de Git Bash en Windows) reescribe cualquier argumento con
forma de ruta POSIX antes de pasarlo al comando — rompe rutas que en realidad son
internas del contenedor Docker, no del host.

**Solución**: ya resuelto dentro del propio script (`MSYS_NO_PATHCONV=1` en los
`docker exec` que necesitan la ruta tal cual) — no hace falta ningún workaround manual
al correrlo. Si aparece en un script nuevo que interactúe con Docker en Windows, aplicar
el mismo patrón.
