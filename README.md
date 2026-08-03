# GEF Secure

Sistema de gestión automatizada de vulnerabilidades: detecta hallazgos cruzando el
inventario de activos contra GitHub Advisory Database y CISA KEV, prioriza según la
criticidad de negocio del entorno, y gestiona el ciclo de vida (Detectada → En Análisis →
Resuelta) con métricas de MTTR.

> **Documentación completa**: ver [`GEF_Secure_Automatizacion_n8n.pdf`](./GEF_Secure_Automatizacion_n8n.pdf)
> para el detalle de arquitectura, cada variable de entorno, checklist de validación y
> troubleshooting extendido. Este README es la versión corta para levantar el proyecto.

## Stack

- **Backend**: Spring Boot 3 / Java 21
- **Frontend**: React 18 + TypeScript + Vite
- **Base de datos**: PostgreSQL 15
- **Automatización**: n8n (self-hosted, Community Edition)

## Requisitos

- Docker y Docker Compose
- (Opcional) Cuenta de Slack y token de GitHub si querés notificaciones y mayor rate limit
  en la GitHub Advisory API

## Levantar el proyecto

```bash
git clone <url-del-repo>
cd GEF_Secure_App
cp .env.example .env
```

Editar `.env` y completar como mínimo:

- `POSTGRES_PASSWORD`, `PGADMIN_DEFAULT_PASSWORD`, `N8N_OWNER_PASSWORD` — contraseñas propias
- `N8N_ENCRYPTION_KEY` — generar una sola vez con `openssl rand -base64 32` y no volver a
  cambiarla
- `SLACK_BOT_TOKEN` / `GITHUB_TOKEN` — opcionales, dejar vacío si no se van a usar todavía

```bash
docker compose up -d
```

Con eso alcanza. Sin pasos manuales adicionales en la interfaz de n8n, al terminar quedan
disponibles:

| Servicio | URL | Notas |
|---|---|---|
| Frontend | http://localhost:3000 | Dashboard con datos de ejemplo precargados |
| Backend (API + Swagger) | http://localhost:8081/swagger-ui.html | |
| n8n | http://localhost:5678 | Owner y workflow ya creados y activos |
| pgAdmin | http://localhost:8080 | Login con las credenciales de `.env` |
| PostgreSQL | localhost:5432 | Bases `security` y `n8n` |

El primer arranque tarda un poco más que los siguientes: n8n necesita crear su usuario,
importar el workflow y activarlo. Seguir el progreso con:

```bash
docker compose logs -f n8n
```

Buscar la línea `[gef-bootstrap] Bootstrap inicial completo.`

## Datos de ejemplo

La base arranca con datos precargados (3 entornos, 6 activos, 9 vulnerabilidades en
distintos estados) para que el Dashboard, el Inventario y el Kanban se vean funcionando
desde el primer momento — ver `init/02-seed-data.sql`. Se cargan siempre en un volumen
nuevo, igual que el resto de la inicialización de la base.

## Validación rápida

```bash
docker compose ps                                    # todo healthy/running
docker compose exec n8n n8n list:workflow             # workflow presente y activo
docker compose exec n8n n8n list:credentials           # 3 credenciales cargadas
```

Checklist completo (11 puntos) en el PDF, sección 10.

## Problemas comunes

- **n8n reinicia en loop**: `N8N_ENCRYPTION_KEY` cambió respecto al valor usado cuando se
  crearon las credenciales guardadas en el volumen. Restaurar el valor original o borrar el
  volumen `n8n_data` para que se reconstruya (se pierde el historial de ejecuciones).
- **El backend no arranca**: revisar `docker compose logs n8n` — suele ser que n8n todavía
  no llegó a `healthy`.
- **Instalación limpia falla al crear el volumen de Postgres**: correr
  `docker compose down -v` antes de un `docker compose up -d` en un entorno de prueba (nunca
  contra datos reales sin backup).

Troubleshooting extendido con más síntomas y comandos de diagnóstico: PDF, sección 11.

## Estructura relevante

```
n8n/                    Dockerfile + script de arranque (bootstrap.sh) de n8n
n8n-provisioning/       Credenciales placeholder que usa el workflow (sin secretos reales)
workflows/              Workflow de n8n versionado en git
init/                   Scripts SQL de inicialización de Postgres (esquema + datos de ejemplo)
```
