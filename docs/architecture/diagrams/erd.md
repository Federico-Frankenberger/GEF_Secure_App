# ERD — Modelo de datos

Generado a partir de las 15 entidades `@Entity` reales en
`backend/src/main/java/com/gef/gefsecureapp/model/`. `AssetType`, `Ecosystem` y
`SoftwareCatalog` son catálogos de referencia consultados por valor (`asset.assetType`
y `softwareComponent.ecosystem` son columnas `String`, **no** claves foráneas) — se
muestran sin relación dibujada a propósito, para no inventar una FK que no existe en
el esquema real.

```mermaid
erDiagram
    USER ||--o{ USER_ASSET_ASSIGNMENT : "tiene asignados"
    ASSET ||--o{ USER_ASSET_ASSIGNMENT : "asignado a"
    ASSET ||--o{ SOFTWARE_COMPONENT : "contiene"
    ASSET }o--|| ENVIRONMENT : "pertenece a"
    ASSET ||--o{ SCAN_REPORT : "alcance de"
    SOFTWARE_COMPONENT ||--o{ ASSET_VULNERABILITY : "afectado por"
    SOFTWARE_COMPONENT ||--o{ SCAN_REPORT : "alcance de"
    ASSET_VULNERABILITY }o--o| USER : "asignada a (assignedToUser)"
    ASSET_VULNERABILITY ||--o{ REMEDIATION_CYCLE : "genera"
    ASSET_VULNERABILITY ||--o{ VULNERABILITY_AUDIT : "historial de hallazgos"
    REMEDIATION_CYCLE ||--o{ STATE_TRANSITION : "registra"
    SCAN_REPORT ||--o{ VULNERABILITY_AUDIT : "produce"
    SCAN_REPORT }o--o| USER : "disparado por (triggeredBy, null=automático)"
    SCAN_REPORT }o--o| ENVIRONMENT : "alcance de"
    VULNERABILITY_AUDIT }o--o| SOFTWARE_COMPONENT : "referencia"

    USER {
        Long id PK
        string username
        string role
        boolean active
    }
    ASSET {
        Long id PK
        string name
        string assetType "catalogo por valor, no FK"
        LocalDateTime deletedAt "soft delete"
        boolean exposed "declarado a mano, nullable"
    }
    ENVIRONMENT {
        Long id PK
        string name
        string businessCriticality
    }
    SOFTWARE_COMPONENT {
        Long id PK
        Long asset_id FK
        string ecosystem "catalogo por valor, no FK"
        string version
        string purl
        boolean catalogued
        LocalDateTime deletedAt "soft delete"
    }
    ASSET_VULNERABILITY {
        Long id PK
        Long software_component_id FK
        Long assigned_to_user_id FK "nullable"
        string cveId
        string detectionStatus "OPEN/RESOLVED, motor automatico"
        string triageStatus "DETECTADA/EN_ANALISIS/RESUELTA, Kanban"
        string outcome "VEX-like: MITIGADA/NO_APLICA/RIESGO_ACEPTADO"
        Long version "optimistic locking, N8N-03"
        Integer reopenCount
        LocalDateTime dueDate
    }
    SCAN_REPORT {
        Long id PK
        Long triggered_by FK "nullable = automatico"
        Long asset_id FK "nullable = alcance mas amplio"
        Long software_component_id FK "nullable"
        Long environment_id FK "nullable"
        string systemStatus "RUNNING/COMPLETED/FAILED"
        Integer totalDetected
    }
    VULNERABILITY_AUDIT {
        Long id PK
        Long scan_id FK
        Long asset_vulnerability_id FK
        Long asset_id FK "via softwareComponent, columna real: asset_id"
    }
    REMEDIATION_CYCLE {
        Long id PK
        Long asset_vulnerability_id FK
    }
    STATE_TRANSITION {
        Long id PK
        Long remediation_cycle_id FK
    }
    USER_ASSET_ASSIGNMENT {
        Long id PK
        Long user_id FK
        Long asset_id FK
    }
    ASSET_TYPE {
        Long id PK
        string name "catalogo, sin FK entrante"
    }
    ECOSYSTEM {
        Long id PK
        string name "catalogo, sin FK entrante"
    }
    SOFTWARE_CATALOG {
        Long id PK
        string name "catalogo curado, sin FK entrante"
    }
    GHSA_ADVISORY_CACHE {
        Long id PK
        string ghsaId "cache local de GitHub Advisory, sin FK entrante"
        boolean reviewed
    }
    SYSTEM_ERROR {
        Long id PK
        string message "log de errores del sistema, sin FK entrante"
    }
```
