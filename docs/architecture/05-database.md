# 05 — Base de datos

Ver ADR-0002 para por qué el esquema se gestiona con scripts SQL manuales en vez de una herramienta de migración.

## Modelo de gestión del esquema

`spring.jpa.hibernate.ddl-auto=validate` — Hibernate **valida** que las entidades coincidan con el esquema, pero nunca lo modifica. El esquema completo es propiedad de **26 scripts SQL idempotentes** en `init/`, montados en Postgres vía `docker-entrypoint-initdb.d` y ejecutados **una sola vez**, contra un volumen de base de datos nuevo. Si cambia el esquema, agregar un script nuevo numerado — no se puede depender de que Hibernate genere DDL, y los scripts existentes no se re-ejecutan contra una base ya inicializada (hay que migrarla a mano si ya existe, según lo señalan los propios comentarios de los scripts).

## Línea de tiempo del esquema (`init/00` → `init/25`)

Los nombres de archivo son, en la práctica, el changelog del modelo de datos:

| Script | Qué agrega |
|---|---|
| `00` | Crea la base `n8n`, propiedad de `security_user` |
| `01` | Esquema base: `environments`, `assets`, `scan_reports`, `vulnerabilities_audit`, `vulnerabilities_ignored`, `users`, `system_errors` + una vista |
| `02` | Datos semilla: 3 entornos (BAJA/MEDIA/CRITICA), 6 activos, 9 vulnerabilidades |
| `03` | Catálogo de software (desde ingesta GHSA) |
| `04` | Separa `assets` en jerarquía `Asset` (host) / `software_components` |
| `05` | Autenticación (`password_hash` con bcrypt) |
| `06` | RBAC — `CHECK (role IN (...))` + tabla de scoping `user_asset_assignments` |
| `07` | Usuarios demo de RBAC |
| `08` | Soft-delete sobre `assets` |
| `09` | Trazabilidad de scans — agrega `scan_reports.status/started_at/public_code`, crea **`asset_vulnerabilities`** (hallazgo persistente, con `detection_status` OPEN/RESOLVED gestionado por el sistema + `triage_status` DETECTADA/EN_ANALISIS/RESUELTA gestionado por el analista, `reopen_count`) |
| `10` | Catálogos configurables por admin (tipos de host, ecosistemas) |
| `11` | Elimina el vínculo antiguo componente/entorno |
| `12` | FK `scan_report` ↔ `asset` |
| `13` | Hechos `patched_version`/`is_zero_day` |
| `14` | Caché de advisories GHSA |
| `15` | Corrige un bug de CASCADE heredado |
| `16` | Constraint unique en `software_components` |
| `17` | Índices de FK faltantes |
| `18` | Columnas de snapshot de auditoría (congela la versión de software al momento de la detección) |
| `19` | **`remediation_cycles`** (ciclo de apertura/cierre por reapertura) + **`state_transitions`** (rastro append-only: `from_state`/`to_state`/`actor`/`trigger`/`evidence_ref`) |
| `20` | Outcomes VEX (`MITIGADA`/`NO_APLICA`/`RIESGO_ACEPTADO`, con justificación obligatoria) |
| `21` | `priority_variables` JSONB + `due_date` |
| `22` | Nivel de evidencia (escala E0–E6) en `state_transitions` |
| `23` | Datos estructurados de GHSA |
| `24` | Normaliza `assigned_to` a FK sobre `users` |
| `25` | Flag manual `exposed` en `assets` |

Ver `02-backend.md` para el detalle de cada entidad JPA correspondiente, y `06-vulnerability-lifecycle.md` para el detalle funcional de `19`, `20` y `22` (el corazón del modelo de ciclo de vida).

## Entidades principales y relaciones

```
Environment ──┐
              │ 1:N
              ▼
            Asset ──┐ 1:N          UserAssetAssignment ──▶ User
   (soft-delete)    │                    ▲
                     ▼                    │ scoping ASSET_OWNER
           SoftwareComponent ──┐
                                │ 1:N
                                ▼
                      AssetVulnerability ──┬──▶ RemediationCycle (1:N)
                       (detectionStatus,   │
                        triageStatus,      └──▶ StateTransition (1:N, append-only)
                        outcome VEX,
                        priorityVariables)
                                │
                                ▼
                      VulnerabilityAudit (1:N, inmutable, por scan)
                                ▲
                                │
                          ScanReport
```

Catálogos de soporte (sin relaciones jerárquicas complejas): `SoftwareCatalog`, `Ecosystem`, `AssetType`, `GhsaAdvisoryCache`, `SystemError`.

## Datos semilla

`init/02` carga 3 entornos, 6 activos y 9 vulnerabilidades en distintos estados — pensado para que Dashboard, Inventario y Kanban se vean funcionando desde el primer arranque (ver `README.md` raíz, sección "Datos de ejemplo").
