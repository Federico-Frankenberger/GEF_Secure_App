# 01 — Visión general del sistema

## Qué es

GEF Secure detecta vulnerabilidades cruzando el inventario de activos de la organización contra dos fuentes públicas (GitHub Advisory Database y CISA KEV), prioriza cada hallazgo según la criticidad de negocio del entorno donde vive el activo afectado, y gestiona el ciclo de vida de la remediación (`Detectada → En Análisis → Resuelta`) con métricas de MTTR. Ver [`06-vulnerability-lifecycle.md`](06-vulnerability-lifecycle.md) para el detalle de ese ciclo.

## Los 5 servicios (`docker-compose.yml`)

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  frontend   │─────▶│   backend    │◀────▶│  postgres   │
│ React/Vite  │ /api │ Spring Boot  │      │  (esquema   │
│  :3000→80   │      │  :8081→8080  │      │  `security`)│
└─────────────┘      └──────┬───────┘      └──────┬──────┘
                             │ webhook              │
                             │ (X-Internal-Token)   │ (esquema `n8n`)
                             ▼                      │
                      ┌─────────────┐               │
                      │     n8n     │───────────────┘
                      │  :5678      │
                      └──────┬──────┘
                             │ HTTP
                 ┌───────────┴────────────┐
                 ▼                        ▼
       GitHub Advisory API           CISA KEV feed

                      ┌─────────────┐
                      │   pgadmin   │  (administración de Postgres, :8080)
                      └─────────────┘
```

- **frontend** — React 18 + TypeScript + Vite, servido por nginx en producción. Ver [`03-frontend.md`](03-frontend.md).
- **backend** — Spring Boot 3 / Java 21, sistema de registro (assets, vulnerabilidades, usuarios, reportes). Ver [`02-backend.md`](02-backend.md).
- **postgres** — PostgreSQL 15, dos bases: `security` (dominio de la app) y `n8n` (estado interno de n8n). Esquema de `security` gestionado por scripts SQL manuales, no por una herramienta de migración (ver ADR-0002). Ver [`05-database.md`](05-database.md).
- **n8n** — motor de automatización self-hosted; corre el pipeline que consulta las fuentes externas y calcula el score de riesgo (ver ADR-0003). Ver [`04-n8n-pipeline.md`](04-n8n-pipeline.md).
- **pgadmin** — solo administración/debug de la base, no forma parte del flujo funcional.

## Flujo de datos end-to-end

1. **Disparo de scan** — por activo, por componente de software, por entorno, o global (botón en el frontend, o el scheduler diario de n8n a las 09:00). El backend llama a n8n vía webhook (`N8nWebhookService`, ver ADR-0003) o n8n se dispara solo.
2. **n8n consulta las fuentes externas** — GitHub Advisory Database y CISA KEV — y cruza los resultados contra el catálogo de software instalado (`software_components`) de los activos del alcance pedido.
3. **n8n calcula el score de riesgo** (CVSS + criticidad del entorno + presencia en CISA KEV + zero-day) en su nodo `Risk_Assessment_Engine`, y llama de vuelta al backend (`POST /api/webhook/vulnerabilities`, autenticado con `X-Internal-Token`, ver ADR-0007) para persistir los hallazgos.
4. **El backend persiste el hallazgo** aplicando el modelo dual `detectionStatus`/`triageStatus` (ver ADR-0004 y `06-vulnerability-lifecycle.md`): el estado de detección lo controla el scan, el de triage lo controla el analista.
5. **El analista trabaja el hallazgo** desde el Kanban del frontend, moviéndolo por `DETECTADA → EN_ANALISIS → RESUELTA`, y cerrándolo con un outcome estilo VEX (ver ADR-0005) cuando corresponde.
6. **El Dashboard** agrega MTTR, aging y breakdowns por severidad/estado/responsable a partir de esos datos (`DashboardService`).

## Alcance fuera de este documento

Detalle de endpoints, entidades, y lógica de negocio → `02-backend.md`. Detalle de nodos del pipeline de n8n → `04-n8n-pipeline.md`.
