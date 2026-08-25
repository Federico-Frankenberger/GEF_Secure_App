# Arquitectura del sistema (vista por capas)

Complementa a [contexto-componentes.md](contexto-componentes.md) (que muestra los 5
servicios Docker y las integraciones externas) con una vista interna: las capas reales
del backend y las etapas reales del pipeline de n8n, basada en los paquetes
`controller/`, `service/`, `repository/` de `backend/src/main/java/com/gef/gefsecureapp/`
y en los nodos del workflow `workflows/Pipeline de Gestión Automatizada de
Vulnerabilidades (VMP).json`.

```mermaid
flowchart TB
    subgraph FE["Frontend — React 18 + TS + Vite"]
        Pages["Páginas (Dashboard, Kanban, Informes, Config, Assets, Scans)"]
        AuthCtx["AuthContext (Context API, sin librería de estado global — ver ADR-0009)"]
    end

    subgraph BE["Backend — Spring Boot 3 / Java 21"]
        Controllers["Controllers\n(@PreAuthorize por rol)"]
        Services["Services\n(reglas de negocio, ciclo de vida)"]
        Repos["Repositories\n(Spring Data JPA)"]
        Security["JwtAuthenticationFilter + LoginRateLimitFilter"]
    end

    subgraph N8N["n8n — pipeline de 49 nodos"]
        Trigger["Disparadores\n(Scan_Scheduler diario 09:00 / webhook bajo demanda)"]
        Fetch["Fetch_GitHub_Advisories\nFetch_CISA_KEV"]
        Match["Check_Internal_Assets\nSync_Software_Catalog"]
        Score["Risk_Assessment_Engine\n(compareVersions, prioridad, CVE-NULL fallback)"]
        Persist["Persist_Audit_Findings\nPersist_Scan_Statistics"]
    end

    DB[("Postgres\nasset_vulnerabilities, remediation_cycles,\nstate_transitions, scan_reports, ...")]

    Pages --> AuthCtx
    Pages -->|"REST + JWT"| Security
    Security --> Controllers
    Controllers --> Services
    Services --> Repos
    Repos --> DB

    Controllers -->|"dispara escaneo"| Trigger
    Trigger --> Fetch --> Match --> Score --> Persist
    Persist -->|"INSERT directo"| DB
    Persist -->|"POST /api/webhook/scan-report\n(X-Internal-Token)"| Controllers
```

**Notas fieles al código real**:
- El pipeline de n8n escribe hallazgos **directamente** en Postgres (`Persist_Audit_Findings`),
  no a través del backend — el backend recién se entera al recibir el webhook de cierre
  (`Persist_Scan_Statistics`), que dispara `VulnerabilityAuditService.applyLifecycle()`.
- `Risk_Assessment_Engine` es el nodo más crítico del pipeline (única lógica de negocio real
  embebida en n8n) — es también el único con tests automatizados propios, ver
  `workflows/tests/`.
- No hay una capa de mensajería/colas entre backend y n8n — la comunicación es HTTP directo
  (webhook de ida, webhook de cierre), documentado y aceptado en [ADR-0003](../../adr/0003-n8n-como-motor-de-scoring-externo.md).
