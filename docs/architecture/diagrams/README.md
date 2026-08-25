# Diagramas de arquitectura

Diagramas versionados en Mermaid, generados a partir de las entidades JPA
(`backend/src/main/java/com/gef/gefsecureapp/model/`), los controllers reales y la
topología de `docker-compose.yml`/`docker-compose.prod.yml` — no son diagramas
aspiracionales. Si el modelo o la topología cambian, actualizar el diagrama
correspondiente en el mismo cambio.

| Diagrama | Qué muestra |
|---|---|
| [arquitectura-sistema.md](arquitectura-sistema.md) | Vista por capas: frontend, backend (controller/service/repository) y etapas del pipeline de n8n |
| [contexto-componentes.md](contexto-componentes.md) | Los 5 servicios Docker y sus integraciones externas |
| [casos-de-uso.md](casos-de-uso.md) | Actores/roles y casos de uso, con el RBAC real por caso de uso |
| [erd.md](erd.md) | Modelo de datos completo (15 entidades JPA) |
| [clases-servicios.md](clases-servicios.md) | Clases `@Service`/`@Controller` centrales del dominio de escaneo/vulnerabilidades y sus relaciones |
| [secuencia-escaneo.md](secuencia-escaneo.md) | Ejecución de punta a punta de un escaneo ([UC-001](../../use-cases/UC-001-ejecutar-escaneo.md)) |
| [secuencia-triage.md](secuencia-triage.md) | Triage/cierre manual de un hallazgo en el Kanban ([UC-002](../../use-cases/UC-002-triage-cierre-hallazgo.md)) |
| [secuencia-reapertura.md](secuencia-reapertura.md) | Reapertura automática y cierre por ausencia (el camino no manual de "remediación") |
| [secuencia-informe-pdf.md](secuencia-informe-pdf.md) | Generación de un informe PDF ([UC-003](../../use-cases/UC-003-generar-informe.md)) |
| [estados-vulnerabilidad.md](estados-vulnerabilidad.md) | Diagrama de estados formal de `AssetVulnerability` (los 2 ejes: detección automática y triage manual) |
| [actividad-ciclo-vida.md](actividad-ciclo-vida.md) | Diagrama de actividad del proceso `applyLifecycle()` — decisión completa por hallazgo |
| [despliegue.md](despliegue.md) | Topología de contenedores, dev vs. prod |
