# GEF Secure

Sistema de gestión automatizada de vulnerabilidades: detecta hallazgos cruzando el
inventario de activos contra GitHub Advisory Database y CISA KEV, prioriza según la
criticidad de negocio del entorno, y gestiona el ciclo de vida (Detectada → En Análisis →
Resuelta) con métricas de MTTR.

## Estado del proyecto

| Campo | Valor |
|---|---|
| Estado | Proyecto de tesis — en desarrollo activo |
| Versión | 2.0.0 (ver [CHANGELOG](CHANGELOG.md) para cambios posteriores sin release formal) |
| Última actualización | 2026-08-22 |
| Ambiente productivo | No — pensado para levantarse localmente vía Docker Compose |

## Características principales

- Inventario de activos (hosts/apps/VMs) y del software instalado en cada uno, con importación de SBOM (Syft) o carga manual.
- Escaneo automatizado que cruza ese inventario contra GitHub Advisory Database y CISA KEV.
- Priorización de hallazgos por CVSS + criticidad de negocio del entorno + presencia en CISA KEV + zero-day.
- Ciclo de vida de vulnerabilidades en Kanban (Detectada → En Análisis → Resuelta), con cierre estilo VEX (Mitigada / No aplica / Riesgo aceptado).
- Centro de Escaneos: disparo por activo, por componente de software, por entorno o global, con seguimiento de progreso en la UI.
- Dashboard con MTTR, aging y breakdowns por severidad/estado/responsable.
- RBAC con 4 roles (`ADMIN`, `SECURITY_ANALYST`, `ASSET_OWNER`, `AUDITOR`) y scoping de activos por usuario.
- Auditoría append-only del historial de cada hallazgo (quién, cuándo, con qué evidencia).
- Notificaciones por Slack y automatización completa vía n8n (self-hosted).

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
| PostgreSQL | localhost:5433 | Bases `security` y `n8n` (5433 en el host para no chocar con un Postgres nativo en 5432; el contenedor sigue escuchando en 5432 puertas adentro de la red de Docker) |

Desde la Fase 3 el frontend pide login. Usuarios del seed, **solo para entorno local**
(`init/05-auth.sql`):

| Usuario | Password | Rol |
|---|---|---|
| `fede.frankenberger` | `GefSecure2026!` | ADMIN |
| `auditor.demo` | `GefSecure2026!` | AUDITOR |

**Límite conocido de esta fase**: el JWT es autocontenido y sin estado — un token
emitido sigue siendo válido hasta que vence (`jwt.expiration-minutes`, 8hs por
defecto) aunque el usuario se borre o cambie de rol mientras tanto. Es una
decisión consciente de alcance, no un descuido — detalle completo, alternativas
consideradas y consecuencias en [ADR-0001](docs/adr/0001-jwt-stateless-sin-revocacion.md).

El primer arranque tarda un poco más que los siguientes: n8n necesita crear su usuario,
importar el workflow y activarlo. Seguir el progreso con:

```bash
docker compose logs -f n8n
```

Buscar la línea `[gef-bootstrap] Bootstrap inicial completo.`

## Datos de ejemplo

La base arranca con datos precargados (3 entornos, 6 activos, 9 vulnerabilidades en
distintos estados) para que el Dashboard, el Inventario y el Kanban se vean funcionando
desde el primer momento. Se cargan siempre en un volumen nuevo, igual que el resto de la
inicialización de la base.

## Escaneo de vulnerabilidades

El backend dispara escaneos contra n8n en 4 alcances, todos vía el mismo webhook
(`N8nWebhookService`) y con la misma UI de progreso (polling acotado):

| Alcance | Cómo se dispara | Endpoint |
|---|---|---|
| Por activo | Botón en la fila del activo, en Inventario | `POST /api/assets/{id}/scan` |
| Por componente de software | Botón en la fila del componente, dentro del detalle de un activo en Inventario | `POST /api/software-components/{id}/scan` |
| Por entorno | Selector de entorno + botón, en Inventario | `POST /api/environments/{id}/scan` |
| Global | Botón "Escanear todo", en el Dashboard | `POST /api/scan` |

Además corre un scan global automático todos los días a las 09:00 (scheduler propio de
n8n, no requiere el backend arriba). El resultado más reciente de cada alcance se consulta
con `GET /api/scan-reports/latest?targetType=...&targetName=...`.

## Validación rápida

```bash
docker compose ps                                    # todo healthy/running
docker compose exec n8n n8n list:workflow             # workflow presente y activo
docker compose exec n8n n8n list:credentials           # 3 credenciales cargadas
```

## Problemas comunes

- **n8n reinicia en loop**: `N8N_ENCRYPTION_KEY` cambió respecto al valor usado cuando se
  crearon las credenciales guardadas en el volumen. Restaurar el valor original o borrar el
  volumen `n8n_data` para que se reconstruya (se pierde el historial de ejecuciones).
- **El backend no arranca**: revisar `docker compose logs n8n` — suele ser que n8n todavía
  no llegó a `healthy`.
- **Instalación limpia falla al crear el volumen de Postgres**: correr
  `docker compose down -v` antes de un `docker compose up -d` en un entorno de prueba (nunca
  contra datos reales sin backup).

## Testing

```bash
# Backend (Gradle)
cd backend && ./gradlew test

# Frontend (Vitest)
cd frontend && npm run test
```

Detalle de qué cubre cada suite en [`backend/README.md`](backend/README.md) y
[`frontend/README.md`](frontend/README.md) — la cobertura del frontend hoy es
mínima, es un gap conocido (ver [deuda técnica](docs/deuda-tecnica.md), DT-02).

## Estructura relevante

```
backend/                Spring Boot 3 / Java 21 — API REST, lógica de negocio
frontend/               React 18 + TypeScript + Vite — UI
docs/                   Documentación técnica (arquitectura, ADRs, glosario, bitácora)
n8n/                    Dockerfile + script de arranque (bootstrap.sh) de n8n
n8n-provisioning/       Credenciales placeholder que usa el workflow (sin secretos reales)
workflows/              Workflow de n8n versionado en git
init/                   Scripts SQL de inicialización de Postgres (esquema + datos de ejemplo)
```

## Roadmap

Basado en lo real registrado en [`docs/deuda-tecnica.md`](docs/deuda-tecnica.md) —
no incluye nada que no esté ya identificado como pendiente:

- [x] Inventario de activos + software, escaneo automatizado, priorización de riesgo
- [x] Ciclo de vida de vulnerabilidades (Kanban) + cierre VEX
- [x] RBAC con 4 roles + scoping por activo
- [x] Centro de Escaneos + Dashboard con MTTR declarado
- [ ] MTTR verificado (hoy es un stub, ver DT-01)
- [ ] Backup automatizado de Postgres/n8n (hoy es manual, ver DT-06)
- [ ] Escaneo automatizado de las dependencias propias del proyecto (ver DT-07)
- [ ] Ampliar cobertura de tests del frontend (ver DT-02)

## Más documentación

- [Arquitectura](docs/architecture/README.md) — qué es cada módulo y cómo se conectan
- [Decisiones de diseño (ADRs)](docs/adr/README.md) — por qué se tomó cada decisión relevante
- [CHANGELOG](CHANGELOG.md)
- [SECURITY](SECURITY.md) — incluye modelo de amenazas (STRIDE) y controles implementados
- [Glosario](docs/glosario.md)
- [Deuda técnica](docs/deuda-tecnica.md)
- [Base de conocimiento](knowledge-base/README.md)
- READMEs por módulo: [backend](backend/README.md) · [frontend](frontend/README.md) · [n8n](n8n/README.md)

## Licencia

Distribuido bajo licencia MIT — ver [`LICENSE`](LICENSE).

## Autores

Proyecto de tesis desarrollado por:

- Federico Frankenberger
- Guadalupe Maricchiolo
- Emilia Barros
