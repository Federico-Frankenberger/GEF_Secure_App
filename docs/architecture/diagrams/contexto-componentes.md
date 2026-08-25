# Diagrama de contexto y componentes

Los 5 servicios definidos en `docker-compose.yml` (backend, frontend, n8n, postgres,
pgadmin) y sus integraciones externas reales.

```mermaid
flowchart TB
    subgraph Cliente
        Browser["Navegador (usuario)"]
    end

    subgraph "GEF Secure App — docker compose"
        Frontend["frontend\nReact 18 + Vite\n(servido por nginx)"]
        Backend["backend\nSpring Boot 3 / Java 21"]
        N8n["n8n\npipeline de 49 nodos"]
        Postgres[("postgres\nvolumen: pgdata")]
        Pgadmin["pgadmin\n(solo dev)"]
    end

    subgraph "Servicios externos"
        GHSA["GitHub Advisory Database"]
        KEV["CISA KEV"]
    end

    Browser -->|HTTPS/HTTP| Frontend
    Frontend -->|"REST + JWT"| Backend
    Backend -->|"webhook (dispara escaneo)"| N8n
    N8n -->|"POST /api/webhook/scan-report\n(X-Internal-Token)"| Backend
    N8n -->|consulta advisories| GHSA
    N8n -->|consulta KEV| KEV
    N8n -->|persiste hallazgos directamente| Postgres
    Backend -->|JPA/Hibernate| Postgres
    Pgadmin -.->|solo dev, puerto publicado| Postgres

    style Pgadmin stroke-dasharray: 5 5
```

**Notas fieles al código real**:
- n8n escribe hallazgos **directamente** en Postgres (no solo vía el backend) — el
  backend se entera por el webhook de cierre, no por ser el único escritor.
- En `docker-compose.prod.yml`, `pgadmin` y `n8n` no publican puertos al host — solo
  son alcanzables dentro de la red interna `gef_net` (ver
  [`docs/operations/deployment.md`](../../operations/deployment.md)).
