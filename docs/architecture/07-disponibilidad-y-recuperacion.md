# 07 — Disponibilidad y recuperación

## Estado actual (honesto)

Hoy **no existe un procedimiento de backup automatizado** para este proyecto.
La única operación de recuperación documentada hasta ahora era destructiva:
`docker compose down -v` para reconstruir un ambiente limpio, que **borra todo
el historial** (ver README, sección "Problemas comunes"). Este documento
define el procedimiento manual mínimo para no depender de esa única opción, y
dejar explícito qué NO está resuelto todavía (ver también
`docs/deuda-tecnica.md`).

## Qué hay que respaldar

| Volumen (`docker-compose.yml`) | Contenido | Contenedor |
|---|---|---|
| `pgdata` | Bases `security` (dominio de la app: activos, vulnerabilidades, usuarios, auditoría) y `n8n` (estado interno de n8n) | `vuln_postgres` |
| `n8n_data` | Configuración de n8n: workflows activos, credenciales resueltas, historial de ejecuciones | `vuln_n8n` |

`init/` (los 26 scripts SQL) no necesita backup — es código versionado en git,
no estado. Solo `pgdata` y `n8n_data` son estado real que se pierde si se
destruyen sin respaldo.

## Backup manual de Postgres

```bash
# Dump lógico de ambas bases (security + n8n), desde el host
docker compose exec postgres pg_dumpall -U "$POSTGRES_USER" > backup_$(date +%Y%m%d_%H%M).sql
```

Restauración (contra un volumen nuevo/vacío):

```bash
docker compose up -d postgres
cat backup_YYYYMMDD_HHMM.sql | docker compose exec -T postgres psql -U "$POSTGRES_USER"
```

Alternativa a nivel de volumen (más rápida, menos portable entre versiones de
Postgres):

```bash
docker run --rm -v gef_secure_app_pgdata:/data -v "$PWD":/backup \
  alpine tar czf /backup/pgdata_$(date +%Y%m%d).tar.gz -C /data .
```

## Backup de n8n

n8n no tiene un comando de export equivalente a `pg_dumpall` para todo su
estado (workflows sí se pueden exportar individualmente vía UI o `n8n export:workflow`,
pero el historial de ejecuciones y credenciales resueltas viven en el volumen).
Mientras no haya una estrategia mejor, el volumen completo se respalda igual
que arriba:

```bash
docker run --rm -v gef_secure_app_n8n_data:/data -v "$PWD":/backup \
  alpine tar czf /backup/n8n_data_$(date +%Y%m%d).tar.gz -C /data .
```

Nota: los workflows en sí ya están versionados en git (`workflows/*.json`) y se
re-importan automáticamente en cada arranque (`n8n/bootstrap.sh`) — lo único
que se perdería sin backup del volumen es historial de ejecuciones y
credenciales ya resueltas (que igual se regeneran desde `.env` +
`n8n-provisioning/credentials.json` en el próximo bootstrap).

## RTO / RPO (objetivo, no medido)

No se hicieron pruebas de restauración cronometradas. Como objetivo razonable
para el alcance de este proyecto (demo/tesis, no producción crítica):

- **RTO objetivo**: < 30 min (tiempo de `docker compose up -d` + restaurar el
  dump de Postgres).
- **RPO objetivo**: depende de la frecuencia real de backup, que hoy es
  **manual y sin cadencia definida** — este es el gap real a cerrar (ver
  `docs/deuda-tecnica.md`, DT-06).

## Qué falta (fuera de alcance de este documento)

- Automatizar el backup (cron externo o job de n8n) en vez de dejarlo manual.
- Backup incremental/rotación con retención definida.
- Probar una restauración completa de punta a punta al menos una vez antes de
  cualquier demo/defensa formal, para validar que el procedimiento de arriba
  realmente funciona.
