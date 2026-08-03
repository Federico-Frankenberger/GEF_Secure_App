#!/bin/sh
set -eu

DATA_DIR="/home/node/.n8n"
INIT_MARKER="$DATA_DIR/.gef-bootstrap-done"
WORKFLOWS_DIR="/setup/workflows"
CREDS_FILE="/setup/credentials/credentials.json"

# n8n usa esta variable en tiempo de ejecucion para inyectar los secretos
# reales; se reconstruye en cada arranque por si rotaron valores en .env
export CREDENTIALS_OVERWRITE_DATA=$(cat <<JSON
{
  "postgres": {"host":"postgres","port":5432,"database":"security",
               "user":"${POSTGRES_USER}","password":"${POSTGRES_PASSWORD}"},
  "slackApi": {"accessToken":"${SLACK_BOT_TOKEN}"},
  "httpHeaderAuth": {"name":"Authorization","value":"Bearer ${GITHUB_TOKEN}"}
}
JSON
)

# Publica (activa) todos los workflows importados. n8n 2.x no tiene un
# --all para publish:workflow (fue removido) -- hay que iterar por ID.
# El CLI imprime "Error tracking disabled..." como primera linea de salida
# en TODOS los comandos (verificado) -- el grep '|' filtra esa linea de
# ruido, que no tiene el separador y rompería publish:workflow si se le
# pasara como ID.
publish_all() {
  n8n list:workflow | grep '|' | cut -d '|' -f1 | while IFS= read -r wf_id; do
    [ -n "$wf_id" ] && n8n publish:workflow --id="$wf_id"
  done
}

if [ ! -f "$INIT_MARKER" ]; then
  echo "[gef-bootstrap] Primer arranque: se necesita n8n corriendo para crear el owner via REST."
  n8n start &
  N8N_PID=$!

  echo "[gef-bootstrap] Esperando a que n8n responda..."
  # /healthz/readiness pasa a 200 antes de que el router REST completo este
  # montado (condicion de carrera verificada). Ademas, un solo wget --spider
  # exitoso contra /rest/settings no alcanza: el 404 puede seguir apareciendo
  # de forma intermitente unos segundos mas (tambien verificado). Por eso se
  # reintenta hasta obtener una respuesta real con contenido, en vez de
  # confiar en el primer 200. Esto de paso resuelve si hace falta owner:
  # /rest/owner/setup es de un solo uso, y si un intento anterior murio
  # DESPUES de crear el owner pero ANTES de tocar INIT_MARKER, reintentar el
  # setup rompe con 400 Bad Request -- por eso se chequea antes de llamarlo.
  NEEDS_OWNER=""
  until [ -n "$NEEDS_OWNER" ]; do
    NEEDS_OWNER=$(wget -qO- http://localhost:5678/rest/settings 2>/dev/null \
      | grep -o '"showSetupOnFirstLoad":[a-z]*' | cut -d: -f2)
    [ -z "$NEEDS_OWNER" ] && sleep 1
  done

  if [ "$NEEDS_OWNER" = "true" ]; then
    echo "[gef-bootstrap] Creando owner (POST /rest/owner/setup)..."
    OWNER_PAYLOAD=$(cat <<JSON
{"email":"${N8N_OWNER_EMAIL}","firstName":"${N8N_OWNER_FIRST_NAME}",
"lastName":"${N8N_OWNER_LAST_NAME}","password":"${N8N_OWNER_PASSWORD}"}
JSON
)
    wget -q -O- \
      --header="Content-Type: application/json" \
      --post-data="$OWNER_PAYLOAD" \
      http://localhost:5678/rest/owner/setup \
      >/dev/null
  else
    echo "[gef-bootstrap] Owner ya existe (intento anterior incompleto), sigo."
  fi

  echo "[gef-bootstrap] Owner creado. Importando credenciales y workflows..."
  n8n import:credentials --input="$CREDS_FILE"
  n8n import:workflow --separate --input="$WORKFLOWS_DIR/"
  publish_all

  for f in "$WORKFLOWS_DIR"/*.json; do
    md5sum "$f" | cut -d ' ' -f1 > "$DATA_DIR/.hash-$(basename "$f").md5"
  done

  echo "[gef-bootstrap] Deteniendo instancia temporal para relanzar como proceso final..."
  kill "$N8N_PID"
  wait "$N8N_PID" 2>/dev/null || true
  sleep 2

  touch "$INIT_MARKER"
  echo "[gef-bootstrap] Bootstrap inicial completo."
else
  echo "[gef-bootstrap] Volumen ya inicializado. Verificando cambios en workflows..."
  CHANGED=0
  for f in "$WORKFLOWS_DIR"/*.json; do
    HASH_FILE="$DATA_DIR/.hash-$(basename "$f").md5"
    NEW_HASH=$(md5sum "$f" | cut -d ' ' -f1)
    OLD_HASH=$(cat "$HASH_FILE" 2>/dev/null || echo "")
    if [ "$NEW_HASH" != "$OLD_HASH" ]; then
      echo "[gef-bootstrap] Cambio detectado en $(basename "$f"), reimportando..."
      # import:workflow, list:workflow y publish:workflow son operaciones
      # de CLI contra la base de datos -- no requieren el servidor HTTP
      # arriba, por eso pueden correr antes del exec final de mas abajo.
      n8n import:workflow --input="$f"
      echo "$NEW_HASH" > "$HASH_FILE"
      CHANGED=1
    fi
  done
  [ "$CHANGED" = "1" ] && publish_all
fi

echo "[gef-bootstrap] Arrancando n8n..."
exec n8n start
