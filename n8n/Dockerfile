ARG N8N_VERSION=2.4.6
FROM n8nio/n8n:${N8N_VERSION}

USER root
# La imagen base es una "Docker Hardened Image" (verificado: /etc/os-release
# dice "Docker Hardened Images (Alpine)") -- no tiene gestor de paquetes
# (apk fue removido por endurecimiento de seguridad), asi que no se puede
# instalar nada en build time. No hace falta: tini ya viene en /sbin/tini
# y wget (BusyBox, con --post-data) ya viene en /usr/bin/wget. bootstrap.sh
# usa wget en vez de curl para las llamadas HTTP.
COPY --chown=node:node bootstrap.sh /docker-entrypoint-gef.sh
RUN chmod +x /docker-entrypoint-gef.sh

USER node
ENTRYPOINT ["tini", "--", "/docker-entrypoint-gef.sh"]
