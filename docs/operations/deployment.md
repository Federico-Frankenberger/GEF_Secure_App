# Deployment

**Estado honesto**: este documento describe infraestructura de producción **preparada
y probada en ejecución**, no un despliegue productivo real. No hay hoy un dominio ni un
servidor productivo activo corriendo GEF Secure — el proyecto vive como Docker Compose
local (desarrollo/demo). Si en algún momento hay un despliegue real, revisar y actualizar
esta sección con los datos concretos (dominio, proveedor, reverse proxy elegido).

## Dos entornos, dos archivos de compose

| Archivo | Para qué | Diferencias clave |
|---|---|---|
| `docker-compose.yml` | Desarrollo/demo local | Sin `SPRING_PROFILES_ACTIVE` (Swagger habilitado), `pgadmin`/`n8n` con puertos publicados al host, frontend con accesos rápidos de demo login habilitados |
| `docker-compose.prod.yml` | Producción (standalone, no una extensión del anterior) | `SPRING_PROFILES_ACTIVE=prod` (activa `SecretsValidator` fail-fast + deshabilita Swagger), `pgadmin`/`n8n` **sin** puertos publicados (solo accesibles por la red interna `gef_net`), sin accesos rápidos de demo login |

## Cómo se probó `docker-compose.prod.yml`

Se levantó de verdad (no solo `docker compose config`) con secretos generados
(`openssl rand -base64 32`) en un proyecto Docker aislado (`docker compose -p
gef_prod_test -f docker-compose.prod.yml --env-file .env.prod.test up -d`), con
volúmenes propios que nunca tocaron los de desarrollo. Confirmado:

- El backend arranca con el perfil `prod` activo y **no** falla `SecretsValidator`
  (secretos reales, no el default de ejemplo).
- `/swagger-ui/index.html` y `/v3/api-docs` ya no sirven la documentación de la API
  (500/401 en vez del 200 de desarrollo).
- `docker port` confirma que `pgadmin`/`n8n` no publican ningún puerto.
- Login + lectura de datos autenticada funcionan de punta a punta contra una base
  fresca (mismos scripts `init/00`→`init/29`).

Ver `docs/bitacora/24-08-26/` para el detalle completo de esta verificación.

## Cómo desplegar

```bash
# 1. Generar secretos reales (nunca reusar los de .env.example ni los de desarrollo)
openssl rand -base64 32   # para JWT_SECRET
openssl rand -base64 32   # para N8N_INTERNAL_TOKEN (mismo valor en backend y n8n)
openssl rand -base64 32   # para N8N_ENCRYPTION_KEY (generar UNA VEZ, no rotar después)

# 2. Armar un .env.prod (NUNCA el .env de desarrollo) con esos valores + el resto de
#    las variables de .env.example (POSTGRES_*, PGADMIN_*, N8N_OWNER_*, ALLOWED_ORIGINS
#    apuntando al dominio real, etc.)

# 3. Levantar
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

## Qué falta para un despliegue productivo real (no cubierto por este repo)

- **Dominio y DNS real** — `N8N_HOST`/`N8N_WEBHOOK_PUBLIC_URL`/`ALLOWED_ORIGINS` hoy
  apuntan a `localhost` en los ejemplos; deben apuntar al dominio real.
- **Reverse proxy con TLS** — ni `docker-compose.prod.yml` ni `frontend/nginx.conf`
  terminan TLS. `nginx.conf` ya configura headers de seguridad (CSP, X-Frame-Options,
  X-Content-Type-Options, Referrer-Policy) pero **no** `Strict-Transport-Security` a
  propósito — HSTS debe agregarse en el reverse proxy real que sí termine TLS delante
  de este stack.
- **Acceso administrativo a pgAdmin/n8n** — sin puertos publicados en
  `docker-compose.prod.yml` (ver tabla arriba), el acceso real debe ser por túnel
  SSH o VPN a la red interna del servidor, no expuesto directo a internet.
- **Backup automatizado** — `scripts/backup.sh`/`scripts/restore.sh` ya existen y
  están probados (ver [`docs/architecture/07-disponibilidad-y-recuperacion.md`](../architecture/07-disponibilidad-y-recuperacion.md)),
  pero la *ejecución periódica* (cron/Task Scheduler) todavía no está configurada
  en ningún lado — no hay un servidor productivo real donde programarla todavía.

## Referencia

- [Checklist de despliegue completo](../bitacora/20-08-26/CHECKLIST_DESPLIEGUE.md) —
  ítems obligatorios y ya resueltos, con fecha de verificación
- [Disponibilidad y recuperación](../architecture/07-disponibilidad-y-recuperacion.md)
- [SECURITY.md](../../SECURITY.md)
