# UC-005 — Gestionar usuarios y asignaciones de activos

**Actor principal**: ADMIN (único rol con acceso a estos endpoints).

**Actores secundarios**: ninguno.

**Precondiciones**: el ADMIN está autenticado; para asignar un activo a un ASSET_OWNER, tanto el usuario como el activo ya existen.

## Flujo principal — alta y gestión de usuarios

1. El ADMIN entra a Configuración → Usuarios y Accesos y ve el listado (`GET /api/users`) con buscador.
2. Para dar de alta un usuario nuevo, completa el formulario (`POST /api/users`) con su rol (`ADMIN` / `SECURITY_ANALYST` / `AUDITOR` / `ASSET_OWNER`).
3. Para modificar datos de un usuario existente, usa `PUT /api/users/{id}`.
4. Para desactivar (no borrar) un usuario que deja el equipo o pierde acceso, usa `PATCH /api/users/{id}/active` (ver `RN-USR-01`) — el usuario no puede autenticarse más, pero su historial de auditoría/asignaciones se conserva intacto.

## Flujo principal — asignación de activos a un ASSET_OWNER

5. El ADMIN entra al detalle de un activo y consulta quién lo tiene asignado (`GET /api/assets/{id}/assignments`), o entra al detalle de un usuario y ve sus asignaciones (`GET /api/users/{id}/assignments`) — vista bidireccional.
6. El ADMIN asigna un usuario `ASSET_OWNER` a ese activo (`POST /api/assets/{id}/assignments`).
7. A partir de ese momento, el scoping por asset-owner (`ADR-0006`) hace que ese usuario solo vea/opere sobre los hallazgos y datos de los activos que tiene asignados.

## Flujos alternativos

- **El ADMIN intenta desactivarse a sí mismo**: bloqueado explícitamente por `RN-USR-01` (self-deactivation), para evitar que el sistema quede sin ningún ADMIN activo.

## Excepciones

- **Un rol no-ADMIN intenta acceder a cualquiera de estos endpoints**: 403 — `UserController` y las rutas de `/assignments` requieren `hasRole('ADMIN')` explícito, sin excepciones.
- **Se intenta asignar un activo a un usuario que no es `ASSET_OWNER`**: rechazado por la validación de negocio del alta de asignación (la asignación solo tiene sentido para ese rol).

## Postcondiciones

El usuario queda creado/actualizado/activo-o-inactivo según la operación; las asignaciones activo↔usuario quedan reflejadas de forma bidireccional y determinan de inmediato el scope de datos visible para ese `ASSET_OWNER`.
