#!/usr/bin/env bash
# DT-06 (docs/deuda-tecnica.md): contraparte de backup.sh. Restaura Postgres
# desde un dump de pg_dumpall generado por ese script.
#
# Uso: ./scripts/restore.sh backups/postgres_20260823_1200.sql.gz
#
# ADVERTENCIA: pg_dumpall + psql sobre una base ya poblada puede fallar por
# objetos duplicados (roles/DBs que ya existen). Pensado para restaurar sobre
# un volumen NUEVO/vacío (`docker compose down -v && docker compose up -d postgres`
# antes de correr esto), no para fusionar con datos existentes.
set -euo pipefail

DUMP_FILE="${1:?Uso: ./scripts/restore.sh <archivo .sql.gz>}"
POSTGRES_CONTAINER="vuln_postgres"

if [ ! -f "$DUMP_FILE" ]; then
  echo "ERROR: no existe el archivo ${DUMP_FILE}" >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}$"; then
  echo "ERROR: el contenedor ${POSTGRES_CONTAINER} no está corriendo (docker compose up -d postgres)." >&2
  exit 1
fi

POSTGRES_USER=$(docker exec "$POSTGRES_CONTAINER" printenv POSTGRES_USER)

echo "→ Restaurando ${DUMP_FILE} contra ${POSTGRES_CONTAINER}..."
gunzip -c "$DUMP_FILE" | docker exec -i "$POSTGRES_CONTAINER" psql -U "$POSTGRES_USER"
echo "→ Restauración completa."
