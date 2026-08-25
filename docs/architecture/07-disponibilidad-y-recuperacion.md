# 07 — Disponibilidad y recuperación

Ver también [`docs/operations/deployment.md`](../operations/deployment.md) para el
estado de la infraestructura de despliegue (`docker-compose.prod.yml`, probada
en ejecución pero sin un despliegue productivo real todavía).

## Estado actual (honesto)

El backup sigue siendo **manual** (no hay un cron/scheduler productivo real
donde programarlo — este proyecto corre en Docker Compose local), pero desde
DT-06 (`docs/deuda-tecnica.md`) existe una herramienta real para correrlo, en
vez de solo comandos de ejemplo copiados a mano: `scripts/backup.sh` +
`scripts/restore.sh`. Antes de esto, la única operación de recuperación
documentada era destructiva: `docker compose down -v` para reconstruir un
ambiente limpio, que **borra todo el historial** (ver README, sección
"Problemas comunes").

## Qué hay que respaldar

| Volumen (`docker-compose.yml`) | Contenido | Contenedor |
|---|---|---|
| `pgdata` | Bases `security` (dominio de la app: activos, vulnerabilidades, usuarios, auditoría) y `n8n` (estado interno de n8n) | `vuln_postgres` |
| `n8n_data` | Configuración de n8n: workflows activos, credenciales resueltas, historial de ejecuciones | `vuln_n8n` |

`init/` (los 30 scripts SQL) no necesita backup — es código versionado en git,
no estado. Solo `pgdata` y `n8n_data` son estado real que se pierde si se
destruyen sin respaldo.

## Backup real (`scripts/backup.sh`)

```bash
./scripts/backup.sh                # backup en ./backups/ (default)
./scripts/backup.sh /otra/ruta      # o un destino explícito
```

Hace, en un solo paso:

- Dump lógico de Postgres (`pg_dumpall`, ambas bases: `security` y `n8n`),
  comprimido.
- Backup del volumen de n8n (`docker exec` + `docker cp` sobre el contenedor
  `vuln_n8n` ya corriendo — historial de ejecuciones y credenciales
  resueltas; los workflows en sí ya están versionados en git y se
  re-importan solos en cada arranque vía `n8n/bootstrap.sh`).
- Rotación automática: conserva los últimos 14 backups de cada tipo.

Probado de punta a punta contra los contenedores reales (`vuln_postgres` +
`vuln_n8n`), incluida la rotación forzando archivos viejos de prueba.

Nota Windows/Git Bash: el script ya resuelve el problema conocido de MSYS
reescribiendo rutas POSIX de argumentos de `docker exec`/`docker cp` (ver
comentarios en el propio script) — no hace falta ningún workaround manual al
correrlo.

## Restauración (`scripts/restore.sh`)

```bash
docker compose down -v && docker compose up -d postgres   # volumen limpio
./scripts/restore.sh backups/postgres_20260823_1200.sql.gz
```

Pensado para un volumen nuevo/vacío, no para fusionar con datos existentes
(`pg_dumpall` + `psql` sobre una base ya poblada puede fallar por objetos
duplicados).

Para el volumen de n8n, restaurar el `.tar.gz` correspondiente dentro del
volumen `gef_secure_app_n8n_data` antes de levantar el contenedor `n8n`.

## Cadencia recomendada

No hay un servidor productivo real donde programar esto todavía (proyecto en
Docker Compose local) — cuando lo haya, la recomendación es:

- **Diario** (cron/Task Scheduler, fuera del horario del escaneo automático de
  las 09:00): `./scripts/backup.sh /ruta/persistente/fuera/del/host`.
- Guardar el destino en almacenamiento distinto al host que corre los
  contenedores (si el disco se pierde, el backup no debe estar en el mismo
  disco).
- Antes de cualquier demo formal a cliente/inversor: correr `restore.sh`
  contra un volumen de prueba al menos una vez, para confirmar que el
  procedimiento realmente funciona (no asumirlo).

## RTO / RPO (objetivo, no medido)

No se hicieron pruebas de restauración cronometradas. Como objetivo razonable
para la etapa actual de este producto (demo/staging, todavía no en producción con clientes):

- **RTO objetivo**: < 30 min (tiempo de `docker compose up -d` + restaurar el
  dump de Postgres).
- **RPO objetivo**: depende de la frecuencia real con la que se corra
  `scripts/backup.sh` — sigue siendo manual (ver "Cadencia recomendada"
  arriba), pero ya no falta la herramienta para cumplirla (DT-06, cerrado en
  `docs/deuda-tecnica.md`).

## Retención de datos append-only (DT-03, `docs/deuda-tecnica.md`)

`vulnerabilities_audit`, `state_transitions` y `remediation_cycles` son
append-only por diseño (ver ADR-0008): nunca se actualiza ni se borra una fila
para preservar la trazabilidad completa de cada hallazgo y cada decisión.
Eso significa que crecen para siempre, sin ningún mecanismo de limpieza.

**Tamaño real hoy** (2026-08-23, dataset de demo): 12 filas / 80kB
(`vulnerabilities_audit`), 19 filas / 48kB (`state_transitions`), 10 filas /
56kB (`remediation_cycles`). Al ritmo de una organización real (1 escaneo
automático diario + escaneos manuales puntuales), esto crece en cientos de
filas por año, no en millones — a esta escala, miles de años de historial
todavía entrarían cómodos en una instancia chica de Postgres. **No es un
problema de espacio en el horizonte de este producto.**

**Decisión**: no implementar archivado/purga automática ahora. Sería una
solución para un problema que no existe todavía, y purgar auditoría de
seguridad tiene un costo real si se hace mal (perder trazabilidad que
después se necesita para una investigación o una auditoría de cumplimiento).
Si en el futuro el volumen de datos realmente lo justifica (una
organización grande, con miles de activos y años de historial), la opción
más simple es particionar `vulnerabilities_audit`/`state_transitions` por
año (`PARTITION BY RANGE` sobre `detected_at`/`occurred_at`) y mover
particiones viejas a almacenamiento más barato — no borrar nada por
default. Revisar esta decisión si el tamaño de estas 3 tablas supera el
orden de los GB, no antes.

## Qué falta (fuera de alcance de este documento)

- Automatizar la EJECUCIÓN de `scripts/backup.sh` (cron externo, Task
  Scheduler o job de n8n) una vez que exista un servidor productivo real
  donde programarlo — el script en sí ya está listo, hoy solo falta el
  disparador periódico.
- Backup incremental (hoy es siempre completo — razonable al tamaño actual
  de los datos, no a gran escala).
- Probar una restauración completa de punta a punta contra un entorno nuevo
  al menos una vez antes de cualquier demo formal a un cliente o inversor
  (`scripts/restore.sh` se probó su mecánica de pipe, pero no una
  restauración completa contra un volumen realmente vacío).
