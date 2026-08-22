# Arquitectura — GEF Secure

Esta carpeta documenta el sistema *tal como está implementado hoy*: módulos, modelo de datos, pipeline de automatización y el ciclo de vida de una vulnerabilidad.

## Cómo leer esto junto con `docs/adr/`

- **`docs/adr/`** responde el **por qué**: qué alternativas se consideraron y por qué se descartaron, para cada decisión de arquitectura relevante.
- **Esta carpeta (`docs/architecture/`)** responde el **qué y el cómo**: la forma actual del sistema, sin repetir la justificación de cada decisión — solo referenciarla por número de ADR (ej. "ver ADR-0001").

Si estás buscando "cómo funciona X", empezá acá. Si estás buscando "por qué se hizo así y no de otra forma", andá a `docs/adr/`.

## Índice

| Doc | Contenido |
|---|---|
| [`01-system-overview.md`](01-system-overview.md) | Contexto general, los 5 servicios de `docker-compose.yml`, flujo de datos end-to-end |
| [`02-backend.md`](02-backend.md) | Paquetes Spring Boot, entidades JPA, servicios, scheduler |
| [`03-frontend.md`](03-frontend.md) | Routing, estado, capa de API, páginas principales |
| [`04-n8n-pipeline.md`](04-n8n-pipeline.md) | El workflow de automatización (49 nodos) |
| [`05-database.md`](05-database.md) | Modelo de datos y cómo evolucionó el esquema (`init/00`→`init/25`) |
| [`06-vulnerability-lifecycle.md`](06-vulnerability-lifecycle.md) | El modelo de ciclo de vida de una vulnerabilidad — el aporte central del proyecto |
| [`07-disponibilidad-y-recuperacion.md`](07-disponibilidad-y-recuperacion.md) | Backup/restore de Postgres y n8n, RTO/RPO objetivo |

Documentación relacionada: [`docs/adr/`](../adr/) (decisiones), [`docs/glosario.md`](../glosario.md) (términos), [`docs/deuda-tecnica.md`](../deuda-tecnica.md) (gaps conocidos), `CHANGELOG.md` y `SECURITY.md` (raíz del repo), READMEs de módulo (`backend/README.md`, `frontend/README.md`, `n8n/README.md`).
