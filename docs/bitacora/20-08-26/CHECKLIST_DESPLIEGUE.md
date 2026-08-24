# Checklist de despliegue a producción — GEF Secure

Este proyecto está pensado hoy para correr como entorno de desarrollo/demo local (`docker-compose.yml`, sin perfiles de Spring, sin TLS). Antes de exponerlo fuera de una red local de confianza, resolver lo siguiente (ver `docs/20-08-26/AUDITORIA_END_TO_END.md` para el detalle completo de cada hallazgo).

**Actualización 2026-08-24**: los dos puntos obligatorios de perfil `prod` y
exposición de puertos ya tienen un artefacto concreto — `docker-compose.prod.yml`
(raíz del repo) es un compose de producción standalone que ya activa
`SPRING_PROFILES_ACTIVE=prod` y ya saca los `ports:` de `pgadmin`/`n8n`. Usarlo con
`docker compose -f docker-compose.prod.yml --env-file .env.prod up -d`, con un
`.env.prod` propio (nunca el `.env` de desarrollo, ver comentario de cabecera del
archivo para la lista de variables obligatorias). El resto de este checklist sigue
vigente igual (`ALLOWED_ORIGINS`, TLS, etc.).

**Actualización 2026-08-24 (2) — probado en ejecución real, no solo sintaxis**:
se levantó `docker-compose.prod.yml` con secretos generados de verdad
(`openssl rand -base64 32`) en un proyecto Docker aislado (volúmenes propios,
sin tocar los de desarrollo), confirmando: backend arranca con el perfil
`prod` activo y NO falla el `SecretsValidator`; `/swagger-ui/index.html` y
`/v3/api-docs` ya no sirven la documentación (500/401 respectivamente, en vez
del 200 de desarrollo); `docker port` confirma que `pgadmin`/`n8n` no
publican ningún puerto; login + lectura de datos autenticada funcionan de
punta a punta contra una base fresca (mismos scripts `init/*.sql`).
`docker-compose.prod.yml` deja de estar "NO VERIFICADO EN EJECUCIÓN".

## Obligatorio

- [x] **Secretos reales**: `JWT_SECRET` (`openssl rand -base64 32`) y `N8N_INTERNAL_TOKEN` configurados con un valor real y distinto de `""`/el default de ejemplo, en el `.env.prod` del entorno de destino — **backend y n8n deben compartir el mismo valor de `N8N_INTERNAL_TOKEN`**. *(Sigue siendo responsabilidad del operador generarlos — `docker-compose.prod.yml` no trae ninguno hardcodeado.)*
- [x] Levantar el backend con `SPRING_PROFILES_ACTIVE=prod` — ya seteado en `docker-compose.prod.yml`. Con ese perfil activo, `SecretsValidator` (backend) hace fallar el arranque si `JWT_SECRET`/`N8N_INTERNAL_TOKEN` quedan vacíos o con el valor de ejemplo, en vez de arrancar igual de forma insegura. También deshabilita Swagger/OpenAPI (`application-prod.properties`).
- [x] **pgAdmin y n8n no deben quedar expuestos directo a internet** (DOCKER-01) — ya resuelto en `docker-compose.prod.yml` (sin `ports:` para esos dos servicios). Acceder solo por túnel SSH / VPN / red interna. pgAdmin da acceso completo de lectura-escritura a la base (incluido `users.password_hash`); n8n expone el editor del pipeline y sus credenciales configuradas.
- [ ] `ALLOWED_ORIGINS` acotado al dominio real (no dejar el default de `localhost`).
- [ ] Si se sirve detrás de un reverse proxy con TLS, agregar `Strict-Transport-Security` ahí (el `nginx.conf` del frontend no termina TLS, así que no lo declara).

## Conocido y aceptado (no requiere acción, dejar documentado)

- **CFG-04** — la contraseña de los usuarios semilla (`init/05-auth.sql`, `init/07-rbac-demo-users.sql`) está en texto plano en el propio script SQL versionado (`GefSecure2026!`). Es intencional para que el entorno de demo/tesis sea reproducible sin pasos manuales — el *hash* BCrypt en la base sí es real. **Si este repositorio se hace público, o si alguna vez se usa este `init/` contra un despliegue con datos reales, esa contraseña debe rotarse** (no hay hoy un mecanismo de "forzar cambio en el primer login" ni de generarla al azar por instalación).
- **DB-01** — 3 de los 14 scripts de `init/*.sql` no son re-ejecutables de forma segura contra una base ya existente (`00`, `02`, `09`) y no hay tracking de cuáles ya se aplicaron a mano. Solo importa si se reconstruye el esquema contra una base preexistente en vez de un volumen nuevo.

## Referencia

Historial completo de hallazgos y su severidad: `docs/20-08-26/AUDITORIA_END_TO_END.md`.
Plan de implementación por fases: `docs/20-08-26/PLAN_DE_IMPLEMENTACION.md`.
