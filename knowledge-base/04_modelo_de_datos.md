# Modelo de Datos

Fuente: entidades JPA reales (`backend/src/main/java/com/gef/gefsecureapp/model/`) + 30 scripts SQL en `init/00`→`init/29` (ver evolución completa en `docs/architecture/05-database.md`). Sin Flyway/Liquibase — `ddl-auto=validate` (ver ADR-0002).

## Dominios

- **Inventario**: Environment, Asset, SoftwareComponent, catálogos (SoftwareCatalog, Ecosystem, AssetType).
- **Vulnerabilidades**: AssetVulnerability (finding persistente), VulnerabilityAudit (log inmutable por escaneo), GhsaAdvisoryCache.
- **Ciclo de vida / auditoría**: RemediationCycle, StateTransition.
- **Escaneo**: ScanReport.
- **Identidad**: User, UserAssetAssignment.
- **Operación**: SystemError.

## ERD (simplificado)

```
Environment 1───N Asset 1───N SoftwareComponent 1───N AssetVulnerability
                                                          │  1
                                                          │
                                            ┌─────────────┼──────────────┐
                                            N              N              N
                                      VulnerabilityAudit  RemediationCycle  StateTransition
                                            │
                                            N───1 ScanReport

User 1───N UserAssetAssignment N───1 Asset
AssetVulnerability N───1 User (assignedToUser)
SoftwareComponent N───1 GhsaAdvisoryCache (por ghsaId, TTL 30 días)
```

## Entidades

### Environment
- Atributos: name, businessCriticality (BAJA/MEDIA/CRITICA), description.
- Usada para ponderar el score de prioridad (ver `13_n8n_automatizacion.md`).

### Asset
- Atributos: name, assetType (FK), environment (FK, EAGER), description, deletedAt (soft-delete), exposed (Boolean nullable = "no declarado").
- Post "Fase 2" se separó de `software_components` (antes un solo modelo, `init/04`).

### SoftwareComponent
- Atributos: software, ecosystem, version; FK a Asset (nullable).
- Unicidad: constraint agregada en `init/16` para evitar duplicados.

### AssetVulnerability (`asset_vulnerabilities`) — el finding persistente
- Una fila por (softwareComponent, cveId).
- Dos ejes de estado independientes:
  - `detectionStatus`: OPEN/RESOLVED — gestionado por el sistema (según lo que el último escaneo detecta).
  - `triageStatus`: DETECTADA/EN_ANALISIS/RESUELTA — gestionado por el analista (Kanban). Ver ADR-0004.
- priority, cvss, exploited, ghsaId, decision, assignedToUser (FK, normalizada en `init/24`), firstDetectedAt/lastDetectedAt/resolvedAt, reopenCount.
- outcome (VEX): MITIGADA / NO_APLICA / RIESGO_ACEPTADO + mitigationControl, justification, acceptedBy, riskAcceptedUntil (ver ADR-0005, `init/20`).
- priorityVariables (jsonb, `init/21`), dueDate (calculado desde priority).
- advisoryType, vulnerableVersionRange.

### VulnerabilityAudit (`vulnerabilities_audit`)
- Log inmutable, una fila por hallazgo detectado en un escaneo puntual. FK a SoftwareComponent, ScanReport, AssetVulnerability.
- Congela software/ecosystem/version al momento de la detección (`init/18`, snapshot). Ver ADR-0008.

### RemediationCycle / StateTransition
- Append-only. RemediationCycle registra ciclos de apertura/cierre (incluye reaperturas). StateTransition registra cada cambio de estado con from_state/to_state/actor/trigger/evidence_ref y escala de evidencia E0–E6 (`init/22`). Ver ADR-0008 y `docs/architecture/06-vulnerability-lifecycle.md`.

### ScanReport
- targetType/targetName (ACTIVO/HOST/ENTORNO/GLOBAL), totales por severidad, systemStatus, environmentBreakdown (json), started_at, status (`init/09`).

### User / UserAssetAssignment
- User: username, fullName, email, role, passwordHash (BCrypt).
- UserAssetAssignment: tabla de scoping para ASSET_OWNER (`init/06`, `init/07`).

### SoftwareCatalog / Ecosystem / AssetType
- Catálogos administrables por ADMIN (`init/10`), poblados inicialmente desde ingesta de GHSA (`init/03`).

### GhsaAdvisoryCache
- Cache de la GitHub Advisory API por `ghsaId`, TTL 30 días (`init/14`, estructura ampliada en `init/23`).

### SystemError
- Log de errores del pipeline de n8n, recibido vía `/api/webhook/error`.

## Seed data inicial

3 entornos (criticidad BAJA/MEDIA/CRITICA), 6 activos, 9 vulnerabilidades en distintos estados (`init/02`), más usuarios demo por rol (`init/07`) — se cargan siempre en un volumen nuevo de Postgres.
