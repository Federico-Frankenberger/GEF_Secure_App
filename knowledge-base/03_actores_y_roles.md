# Actores y Roles

## Actores del sistema

| Actor | Descripción | Cómo interactúa |
|---|---|---|
| ADMIN | Administrador del sistema | Frontend completo + endpoints de gestión (usuarios, catálogos, `/api/system-errors`, `/actuator/**`) |
| SECURITY_ANALYST | Analista de seguridad, dueño del triage | Kanban, reportes, cierre de hallazgos con outcome VEX |
| ASSET_OWNER | Responsable de un subconjunto de activos | Solo ve/gestiona activos que tiene asignados vía `user_asset_assignments` |
| AUDITOR | Rol de solo lectura | Consulta el sistema, apoya verificación externa/trazabilidad |
| n8n (sistema) | No es un usuario humano — es el motor de automatización | Llama a `/api/webhook/*` con `X-Internal-Token` (no JWT), no pasa por el login |

## RBAC — Matriz de permisos

Enforzado en el backend vía `@PreAuthorize` por endpoint + una constraint `CHECK` en la tabla `users` (`init/06-rbac.sql`) que limita `role` a estos 4 valores. El **gating de rol en el frontend (Sidebar, botones deshabilitados) es solo cosmético** — la autorización real ocurre exclusivamente en el backend (ver `docs/architecture/03-frontend.md`).

| Rol | Activos/Inventario | Vulnerabilidades (Kanban) | Usuarios/Catálogos | Reportes | Auditoría |
|---|---|---|---|---|---|
| ADMIN | CRUD total | CRUD total | CRUD total | Todos | Lectura total |
| SECURITY_ANALYST | Lectura + disparo de scan | CRUD (triage completo, cierre VEX) | Lectura | Todos | Lectura total |
| ASSET_OWNER | CRUD solo sobre activos asignados | Lectura/edición limitada a sus activos | — | Limitado a sus activos | — |
| AUDITOR | Lectura | Lectura | Lectura (Catálogos) | Lectura | Lectura total |

### Excepciones granulares (verificadas contra `@PreAuthorize` real, no la matriz simplificada de arriba)

La matriz de arriba es la vista de alto nivel. A nivel de endpoint, hay 2 categorías que no encajan en una celda simple:

- **Catálogos de configuración sin dato específico de la organización** (`GET /api/environments`, `/api/ecosystems`, `/api/asset-types`, `/api/software-catalog`, `/api/ghsa-advisories/{id}`) y **KPIs agregados sin detalle sensible por activo** (`GET /api/dashboard/stats`) — sin `@PreAuthorize` propio: accesibles a **cualquier rol autenticado**, incluido `ASSET_OWNER`, a propósito (auditado en DT-04 — no es una fuga, es el comportamiento deseado para taxonomía genérica). Las mutaciones (`POST`/`PUT`/`DELETE`) de estos catálogos sí exigen `ADMIN` explícito.
- **Lectura del propio módulo de Vulnerabilidades** (`GET /api/vulnerabilities`, `/summary`, `/analysis`, `/search`, `/remediation-analysis`, `/scan-result`) y **de escaneos** (`GET /api/scan-reports*`) — tampoco tienen `@PreAuthorize` propio (cualquier autenticado), pero SÍ aplican el scoping de `ASSET_OWNER` a nivel de servicio (nunca ven datos fuera de sus activos asignados). Las mutaciones (`PATCH /{id}/status`, `DELETE /{id}`) sí excluyen a `AUDITOR`/`ASSET_OWNER` vía `@PreAuthorize` explícito.
- `ReportController` (Informes) es la única excepción a "AUDITOR = solo lectura de todo": sus 7 endpoints exigen `hasAnyRole('ADMIN','SECURITY_ANALYST','AUDITOR')` explícito, dejando a `ASSET_OWNER` afuera incluso de lectura (los informes agregan datos de toda la organización, no solo los activos propios de un `ASSET_OWNER`).

## Rutas públicas (sin autenticación)

- `POST /api/auth/login`
- `POST /api/webhook/scan-report` (público a nivel Spring Security, pero protegido por `X-Internal-Token` a nivel de aplicación)
- `/swagger-ui.html`, `/v3/api-docs/**`
- `/actuator/health`, `/actuator/info` (el resto de `/actuator/**` requiere rol ADMIN)
