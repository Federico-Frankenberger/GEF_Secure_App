#!/usr/bin/env bash
# DT-06 (docs/deuda-tecnica.md): backup real de los 2 volúmenes con estado
# (pgdata + n8n_data, ver docs/architecture/07-disponibilidad-y-recuperacion.md)
# -- antes esto era solo un comando de ejemplo en un doc, nunca un script que
# alguien pudiera correr o programar. Pensado para invocarse a mano o desde un
# cron/Task Scheduler (no hay servidor productivo real donde programarlo desde
# acá, así que este script es la pieza que faltaba, no la programación en sí).
#
# Uso: ./scripts/backup.sh [directorio_destino]
# Default: ./backups/ (se crea si no existe)
set -euo pipefail

BACKUP_DIR="${1:-backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
KEEP_LAST=14  # retención: se conservan los últimos 14 backups de cada tipo

POSTGRES_CONTAINER="vuln_postgres"
N8N_CONTAINER="vuln_n8n"
N8N_DATA_PATH="/home/node/.n8n"

mkdir -p "$BACKUP_DIR"
# Resuelve a ruta absoluta antes de usarla en docker cp -- si BACKUP_DIR ya
# viene absoluto (ej. invocado desde otro directorio o con una ruta de otro
# disco), concatenar "$(pwd)/$BACKUP_DIR" a mano rompe el path. `cd ... && pwd`
# funciona para ambos casos por igual.
BACKUP_DIR=$(cd "$BACKUP_DIR" && pwd)

if ! docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}$"; then
  echo "ERROR: el contenedor ${POSTGRES_CONTAINER} no está corriendo." >&2
  exit 1
fi
if ! docker ps --format '{{.Names}}' | grep -q "^${N8N_CONTAINER}$"; then
  echo "ERROR: el contenedor ${N8N_CONTAINER} no está corriendo." >&2
  exit 1
fi

# Toma POSTGRES_USER del propio contenedor -- no depende de que el .env local
# esté cargado en la shell que ejecuta el script (ej. un cron sin entorno).
POSTGRES_USER=$(docker exec "$POSTGRES_CONTAINER" printenv POSTGRES_USER)

echo "→ Dump lógico de Postgres (security + n8n)..."
docker exec "$POSTGRES_CONTAINER" pg_dumpall -U "$POSTGRES_USER" \
  > "${BACKUP_DIR}/postgres_${TIMESTAMP}.sql"
gzip -f "${BACKUP_DIR}/postgres_${TIMESTAMP}.sql"
echo "  OK: ${BACKUP_DIR}/postgres_${TIMESTAMP}.sql.gz"

echo "→ Volumen n8n_data (workflows re-importan solos, esto guarda historial/credenciales resueltas)..."
# docker exec + docker cp en vez de "docker run -v" con un contenedor alpine
# nuevo: en Git Bash/Windows, MSYS reescribe cualquier argumento con forma de
# ruta POSIX (ej. "/tmp/x.tar.gz" -> "C:/Users/.../Temp/x.tar.gz"), rompiendo
# rutas que en realidad son internas del contenedor. MSYS_NO_PATHCONV=1 evita
# esa reescritura SOLO en los "docker exec" (donde "/tmp/..." debe llegar tal
# cual al contenedor) -- el "docker cp" de abajo NECESITA la conversión normal
# de MSYS para el lado host (BACKUP_DIR ya viene en formato POSIX de git-bash,
# docker cp en Windows espera una ruta real de Windows), por eso corre sin la
# variable. Nada de esto tiene efecto en Linux/macOS real. Usar el contenedor
# YA corriendo (no uno nuevo) también evita depender del nombre interno del
# volumen, que no hace falta conocer para esto.
N8N_TMP_TAR="/tmp/n8n_data_${TIMESTAMP}.tar.gz"
MSYS_NO_PATHCONV=1 docker exec "$N8N_CONTAINER" tar czf "$N8N_TMP_TAR" -C "$N8N_DATA_PATH" .
docker cp "${N8N_CONTAINER}:${N8N_TMP_TAR}" "${BACKUP_DIR}/n8n_data_${TIMESTAMP}.tar.gz"
MSYS_NO_PATHCONV=1 docker exec "$N8N_CONTAINER" rm -f "$N8N_TMP_TAR"
echo "  OK: ${BACKUP_DIR}/n8n_data_${TIMESTAMP}.tar.gz"

# Rotación: conserva solo los últimos KEEP_LAST de cada tipo. `shopt -s nullglob`
# evita que un patrón sin coincidencias se pase como string literal a `ls` (que
# fallaría con "No such file" y, por pipefail, cortaría el script entero).
shopt -s nullglob
for prefix in "postgres_*.sql.gz" "n8n_data_*.tar.gz"; do
  files=("${BACKUP_DIR}"/$prefix)
  if [ "${#files[@]}" -gt "$KEEP_LAST" ]; then
    ls -t "${files[@]}" | tail -n +$((KEEP_LAST + 1)) | xargs -r rm -f
  fi
done

echo "→ Backup completo. Retención: últimos ${KEEP_LAST} de cada tipo en ${BACKUP_DIR}/"
