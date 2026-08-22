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
| AUDITOR | Lectura | Lectura | — | Lectura | Lectura total |

## Rutas públicas (sin autenticación)

- `POST /api/auth/login`
- `POST /api/webhook/scan-report` (público a nivel Spring Security, pero protegido por `X-Internal-Token` a nivel de aplicación)
- `/swagger-ui.html`, `/v3/api-docs/**`
- `/actuator/health`, `/actuator/info` (el resto de `/actuator/**` requiere rol ADMIN)
