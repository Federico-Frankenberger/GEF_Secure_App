# Diagrama de clases — capa de servicios del backend

No es un diagrama de las entidades JPA (eso ya lo cubre el [ERD](erd.md) sin
redundancia) — muestra las clases `@Service`/`@Controller` reales de
`backend/src/main/java/com/gef/gefsecureapp/` con más lógica de negocio, y cómo se
llaman entre sí. Acotado a las clases centrales del dominio de escaneo/vulnerabilidades
(el resto de los catálogos — `EnvironmentController`, `EcosystemController`,
`AssetTypeController` — son CRUDs simples sin lógica propia que aporte valor en este
diagrama).

```mermaid
classDiagram
    class WebhookController {
        -runWithDeadlockRetry(action, logId) ScanReport
        +receiveScanReport(token, payload) void
        +receiveVulnerabilities(token, vulns) void
    }

    class ScanService {
        +start(targetType, targetName, ...) ScanReport
        +complete(scanId, payload) ScanReport
        +completeAutomatic(payload) ScanReport
        +closeStaleRunningScans() void
    }

    class VulnerabilityAuditService {
        +applyLifecycle(scan) void
        +updateStatus(id, dto) Response
        +getSummary() VulnerabilitySummaryDTO
        +getAnalysis(days) VulnerabilityAnalysisDTO
        +getRemediationAnalysis(days) RemediationAnalysisDTO
        +reconcileOrphanScanLinks() void
        +linkOrphanFindings(scanReportId, windowStart) void
    }

    class GhsaAdvisoryService {
        +getByGhsaId(ghsaId) GhsaAdvisoryDTO
    }

    class ReportPdfService {
        +generateExecutiveReport() byte[]
        +generateRemediationReport(days) byte[]
        +generateCveReport(identifier) byte[]
        +previewCve(identifier) CvePreviewDTO
        -fetchAdvisoryOrNull(matches) GhsaAdvisoryDTO
    }

    class UserAssetAssignmentService {
        +assign(userId, assetId) void
        +unassign(userId, assetId) void
        +assignedAssetIds(userId) Set~Long~
        +findByUser(userId) List~Response~
    }

    class UserService {
        +create(dto) Response
        +setActive(id, active) Response
        +delete(id) void
    }

    class DashboardService {
        +getStats() DashboardStatsDTO
    }

    WebhookController --> ScanService : delega (con retry ante deadlock/optimistic lock)
    ScanService --> VulnerabilityAuditService : applyLifecycle()
    ReportPdfService --> VulnerabilityAuditService : reusa metricas (sin recalcular)
    ReportPdfService --> GhsaAdvisoryService : fetchAdvisoryOrNull() [REQUIRES_NEW, ver RPT-GHSA-404]
    VulnerabilityAuditService --> UserAssetAssignmentService : scope ASSET_OWNER
    DashboardService --> UserAssetAssignmentService : scope ASSET_OWNER
    UserService --> UserAssetAssignmentService : borrado en cascada
```

**Notas fieles al código real**:
- `ReportPdfService --> GhsaAdvisoryService` es la relación que causó el bug RPT-GHSA-404
  (`UnexpectedRollbackException`): `getByGhsaId()` corría con `propagation = REQUIRED`
  (compartía la transacción de `ReportPdfService`) hasta el fix del 24-08-26, que la
  cambió a `REQUIRES_NEW` — ver [ADR](../../adr/README.md) y
  `docs/bitacora/24-08-26/AUDITORIA_SECCIONES_NUEVAS.md`.
- `VulnerabilityAuditService` y `DashboardService` no dependen una de la otra — ambas
  dependen de `UserAssetAssignmentService` de forma independiente para resolver el scope
  de `ASSET_OWNER`, sin una clase intermedia compartida.
