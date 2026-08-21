# Checklist de despliegue a producción — GEF Secure

Este proyecto está pensado hoy para correr como entorno de desarrollo/demo local (`docker-compose.yml`, sin perfiles de Spring, sin TLS). Antes de exponerlo fuera de una red local de confianza, resolver lo siguiente (ver `docs/20-08-26/AUDITORIA_END_TO_END.md` para el detalle completo de cada hallazgo).

## Obligatorio

- [ ] **Secretos reales**: `JWT_SECRET` (`openssl rand -base64 32`) y `N8N_INTERNAL_TOKEN` configurados con un valor real y distinto de `""`/el default de ejemplo, en el `.env` del entorno de destino — **backend y n8n deben compartir el mismo valor de `N8N_INTERNAL_TOKEN`**.
- [ ] Levantar el backend con `SPRING_PROFILES_ACTIVE=prod` — con ese perfil activo, `SecretsValidator` (backend) hace fallar el arranque si `JWT_SECRET`/`N8N_INTERNAL_TOKEN` quedan vacíos o con el valor de ejemplo, en vez de arrancar igual de forma insegura. También deshabilita Swagger/OpenAPI (`application-prod.properties`).
- [ ] **pgAdmin y n8n no deben quedar expuestos directo a internet** (DOCKER-01): en `docker-compose.yml` ambos publican su puerto (`5678`, `8080`) al host. En un despliegue real, sacar esos `ports:` (o moverlos a un `docker-compose.prod.yml` aparte) y acceder solo por túnel SSH / VPN / red interna. pgAdmin da acceso completo de lectura-escritura a la base (incluido `users.password_hash`); n8n expone el editor del pipeline y sus credenciales configuradas.
- [ ] `ALLOWED_ORIGINS` acotado al dominio real (no dejar el default de `localhost`).
- [ ] Si se sirve detrás de un reverse proxy con TLS, agregar `Strict-Transport-Security` ahí (el `nginx.conf` del frontend no termina TLS, así que no lo declara).

## Conocido y aceptado (no requiere acción, dejar documentado)

- **CFG-04** — la contraseña de los usuarios semilla (`init/05-auth.sql`, `init/07-rbac-demo-users.sql`) está en texto plano en el propio script SQL versionado (`GefSecure2026!`). Es intencional para que el entorno de demo/tesis sea reproducible sin pasos manuales — el *hash* BCrypt en la base sí es real. **Si este repositorio se hace público, o si alguna vez se usa este `init/` contra un despliegue con datos reales, esa contraseña debe rotarse** (no hay hoy un mecanismo de "forzar cambio en el primer login" ni de generarla al azar por instalación).
- **DB-01** — 3 de los 14 scripts de `init/*.sql` no son re-ejecutables de forma segura contra una base ya existente (`00`, `02`, `09`) y no hay tracking de cuáles ya se aplicaron a mano. Solo importa si se reconstruye el esquema contra una base preexistente en vez de un volumen nuevo.

## Referencia

Historial completo de hallazgos y su severidad: `docs/20-08-26/AUDITORIA_END_TO_END.md`.
Plan de implementación por fases: `docs/20-08-26/PLAN_DE_IMPLEMENTACION.md`.
