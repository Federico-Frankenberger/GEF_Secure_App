# 02 — Backend (Spring Boot)

Paquete raíz: `com.gef.gefsecureapp`, en `backend/src/main/java/com/gef/gefsecureapp/`.

`BackendApplication.java` habilita `@EnableScheduling` (lo necesita el watchdog de scans, ver más abajo) y excluye `UserDetailsServiceAutoConfiguration` — la autenticación es JWT manual de punta a punta, no hay `UserDetailsService` de Spring Security en juego.

## Paquetes

| Paquete | Responsabilidad |
|---|---|
| `config/` | `AppConfig`, `SecretsValidator` (valida secretos requeridos al arrancar) |
| `controller/` | 15 controladores REST |
| `dto/` | DTOs de entrada/salida de la API |
| `exception/` | `GlobalExceptionHandler` + excepciones de dominio |
| `mapper/` | Entidad ↔ DTO |
| `model/` | 15 entidades JPA |
| `repository/` | Spring Data JPA |
| `security/` | Filtro y servicio JWT |
| `service/` | ~13 servicios (lógica de negocio) |
| `util/` | ej. `PurlParser` (parseo de package URLs para el catálogo de software) |
| `validation/` | validadores custom |

## Entidades (`model/`)

- **Environment** — nombre, `businessCriticality`, descripción. Es la unidad que define cuánto "pesa" una vulnerabilidad en el scoring de n8n.
- **Asset** — host/aplicación/VM. Soft-delete vía `deletedAt`. Campo `exposed` (Boolean, nullable = "no declarado") que indica exposición a internet.
- **SoftwareComponent** — paquete de software instalado en un Asset (software/ecosystem/version), FK a `Asset` (nullable).
- **AssetVulnerability** (`asset_vulnerabilities`) — el hallazgo persistente, una fila por `(softwareComponent, cveId)`. Ver el detalle completo de sus campos y su máquina de estados en [`06-vulnerability-lifecycle.md`](06-vulnerability-lifecycle.md).
- **VulnerabilityAudit** (`vulnerabilities_audit`) — log inmutable por scan, con FK a `SoftwareComponent`, `ScanReport` y `AssetVulnerability`; congela software/ecosystem/version al momento de la detección (ver ADR-0008).
- **RemediationCycle** / **StateTransition** — rastro de auditoría append-only de ciclos de apertura/cierre y de cambios de estado, con escala de evidencia E0–E6 (ver ADR-0008 y `06-vulnerability-lifecycle.md`).
- **ScanReport** — registro de una ejecución de scan (totales por severidad, `systemStatus`, breakdown por entorno en JSON, `targetType`/`targetName`).
- **User** / **UserAssetAssignment** — usuarios y la tabla de scoping que usa `ASSET_OWNER` para limitarse a sus activos asignados (ver ADR-0006).
- **SoftwareCatalog**, **Ecosystem**, **AssetType** — catálogos de configuración.
- **GhsaAdvisoryCache** — caché de resúmenes de GitHub Advisory, TTL 30 días.
- **SystemError** — log de errores reportados por el workflow de n8n.

## Endpoints REST (por controlador)

| Controlador | Base path | Endpoints |
|---|---|---|
| `AuthController` | `/api/auth` | `POST /login` |
| `AssetController` | `/api/assets` | `GET`, `GET /deleted`, `POST /{id}/restore`, `GET /{id}`, `POST`, `PUT /{id}`, `DELETE /{id}`, `POST /{id}/scan`, `POST /{id}/inventory/preview`, `POST /{id}/inventory/import`, `POST /inject-test-data`, `GET`/`POST /{id}/assignments`, `DELETE /{id}/assignments/{userId}` |
| `AssetTypeController` | `/api/asset-types` | `GET`, `POST`, `PUT /{id}`, `DELETE /{id}` |
| `EcosystemController` | `/api/ecosystems` | `GET`, `POST`, `PUT /{id}`, `DELETE /{id}` |
| `EnvironmentController` | `/api/environments` | `GET`, `GET /{id}`, `POST`, `PUT /{id}`, `DELETE /{id}`, `POST /{id}/scan` |
| `SoftwareCatalogController` | `/api/software-catalog` | `GET` |
| `SoftwareComponentController` | `/api/software-components` | `GET`, `GET /{id}`, `POST`, `PUT /{id}`, `DELETE /{id}`, `POST /{id}/scan` |
| `ScanController` | `/api` | `POST /scan`, `GET /scan-reports/latest`, `GET /scan-reports`, `GET /scan-reports/{id}/vulnerabilities`, `GET /scan-reports/{id}/compare/{otherId}` |
| `VulnerabilityAuditController` | `/api/vulnerabilities` | `GET`, `GET /{id}`, `GET /scan-result`, `POST`, `PATCH /{id}/status`, `DELETE /{id}` |
| `GhsaAdvisoryController` | `/api/ghsa-advisories` | `GET /{ghsaId}` |
| `DashboardController` | `/api/dashboard` | `GET /stats` |
| `ReportController` | `/api/reports` | `GET /scan/{scanId}`, `GET /comparison`, `GET /executive`, `GET /cve/{identifier}` |
| `UserController` | `/api/users` | `GET`, `GET /{id}`, `POST`, `PUT /{id}`, `DELETE /{id}` |
| `SystemErrorController` | `/api/system-errors` | `GET`, `DELETE /{id}` — clase completa con `@PreAuthorize("hasRole('ADMIN')")` |
| `WebhookController` | `/api/webhook` | `POST /vulnerabilities`, `/scan-report`, `/error` — autenticados con `X-Internal-Token`, no JWT (ver ADR-0007) |

## Servicios con lógica no trivial

- **`VulnerabilityAuditService`** (~672 líneas, el más grande) — la máquina de estados del ciclo de vida (mapa `TRANSICIONES_PERMITIDAS`), validación de outcomes VEX, cálculo de `dueDate` por prioridad, scoping de `ASSET_OWNER`. Ver `06-vulnerability-lifecycle.md`.
- **`ScanService`** — orquesta scans; incluye el watchdog `@Scheduled(fixedDelayString = "${scan.watchdog.check-interval-ms:300000}")` (cada 5 minutos por defecto) que cierra scans que quedaron en `RUNNING` sin actualizarse (`closeStaleRunningScans()`).
- **`N8nWebhookService`** — dispara scans llamando a n8n vía `RestClient` (POST con `{activo_name, entorno, scan_id}`); también expone `triggerAssetInjection()` para el flujo de datos de prueba.
- **`GhsaAdvisoryService`** — consulta y cachea `https://api.github.com/advisories/{ghsaId}`, TTL 30 días en `GhsaAdvisoryCache`.
- **`DashboardService`** — agregación de MTTR vía queries de repositorio (`findAverageMttrDeclaredDays[ByPriority]`), aging buckets, breakdowns por severidad/estado/responsable.
  - `mttrVerifiedDays` (DT-01, cerrado): mide el tiempo hasta cierres con `evidenceLevel` E4+ (verificación técnica real, ej. un inventario posterior que confirma la versión corregida) — distinto de `mttrDeclaredDays`, que es lo que el analista marca. Devuelve vacío mientras no haya ningún cierre con esa evidencia.
- Resto: `InventoryService`, `ReportPdfService`, `AssetService`, `SoftwareComponentService`, `UserAssetAssignmentService`, `AuthService`, `UserService` — CRUD y soporte, sin lógica de dominio destacable más allá de lo ya cubierto.

**Nota importante**: el backend NO calcula el score de riesgo (CVSS + criticidad + CISA KEV + zero-day). Ese cálculo vive enteramente en el nodo `Risk_Assessment_Engine` de n8n y llega ya calculado por webhook. Ver ADR-0003 y `04-n8n-pipeline.md`.

## Seguridad

JWT stateless (ver ADR-0001), BCrypt, `JwtAuthenticationFilter` antes de `UsernamePasswordAuthenticationFilter`. CORS restringido a orígenes configurables, CSRF deshabilitado (API sin sesión de navegador). Rutas públicas: `/api/auth/**`, `/api/webhook/scan-report`, swagger/api-docs, `/actuator/health` y `/actuator/info`; el resto de `/actuator/**` requiere `ADMIN`. 4 roles vía `@PreAuthorize` + `CHECK` constraint en la base (ver ADR-0006): `ADMIN`, `SECURITY_ANALYST`, `ASSET_OWNER`, `AUDITOR`. `ASSET_OWNER` se limita a sus activos asignados vía `user_asset_assignments`. Expiración de token configurable (`jwt.expiration-minutes`, 480 min por defecto). Respuestas 401 estandarizadas en JSON vía un `AuthenticationEntryPoint` custom.

## Persistencia

`spring.jpa.hibernate.ddl-auto=validate` — sin Flyway ni Liquibase. El esquema completo es responsabilidad de 26 scripts SQL idempotentes en `init/` (ver ADR-0002 y `05-database.md` para el detalle).

## Configuración

`application.properties` (dev) + `application-prod.properties`. Puntos relevantes: datasource Postgres (`jdbc:postgresql://localhost:5433/security`), tuning de reintentos de Hikari, JPA en modo `validate`, fechas ISO vía Jackson, límites de multipart (15MB/20MB para import de SBOM), virtual threads habilitados, `n8n.webhook.url` / `n8n.inject-webhook.url` / `n8n.internal-token`, orígenes CORS, `jwt.secret` / `jwt.expiration-minutes` (sobreescribibles por variable de entorno; hay defaults inseguros de desarrollo marcados en comentarios).

## Tests

Mayormente tests unitarios de servicio con repositorios mockeados (`AssetServiceTest`, `AuthServiceTest`, `DashboardServiceTest`, `GhsaAdvisoryServiceTest`, `InventoryServiceTest`, `ReportPdfServiceTest`, `ScanServiceTest`, `SoftwareCatalogServiceTest`, `SoftwareComponentServiceTest`, `VulnerabilityAuditServiceTest`), más tests de seguridad (`JwtServiceTest`, `CurrentUserTest`), de mappers y DTOs, `GlobalExceptionHandlerTest`, `PurlParserTest`, un par de tests de controlador (`ScanControllerTest`, `WebhookControllerTest`) y un test de repositorio (`ScanReportRepositoryTest`, estilo `@DataJpaTest`). `BackendApplicationTests` es el smoke test de carga de contexto.

**Gap conocido**: la cobertura está sesgada hacia unit tests de servicio con mocks; hay mínima cobertura de integración full-stack (`@SpringBootTest`). Ver `frontend/README.md` para el gap equivalente del lado frontend.
