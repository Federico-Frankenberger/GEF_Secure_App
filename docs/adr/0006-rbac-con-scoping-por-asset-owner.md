# 0006 — RBAC de 4 roles con scoping adicional para ASSET_OWNER

## Status

Accepted

## Context

El sistema tiene actores con necesidades de acceso muy distintas: quien administra el sistema y usuarios, quien analiza y prioriza vulnerabilidades, quien es dueño de un subconjunto de activos y solo debería ver/gestionar los suyos, y quien audita el sistema en modo mayormente lectura. Un RBAC plano de "rol → permisos globales" alcanza para los primeros dos casos pero no resuelve el tercero: `ASSET_OWNER` necesita el mismo conjunto de permisos que otro `ASSET_OWNER`, pero acotado a *sus* activos, no a todos.

## Decision

Se definieron cuatro roles (`ADMIN`, `SECURITY_ANALYST`, `ASSET_OWNER`, `AUDITOR`), impuestos con doble barrera: una constraint `CHECK` a nivel de base de datos (`init/06-rbac.sql`, `role IN ('ADMIN','SECURITY_ANALYST','ASSET_OWNER','AUDITOR')`) y anotaciones `@PreAuthorize` a nivel de método en los 15 controladores del backend. Para `ASSET_OWNER` se agregó una tabla adicional de scoping, `user_asset_assignments`, y lógica dedicada en `VulnerabilityAuditService` (`applyScope`/`applyScopeAV`) que filtra las consultas para que un `ASSET_OWNER` solo vea y opere sobre las vulnerabilidades de los activos que tiene asignados.

La autorización real vive exclusivamente en el backend. El frontend replica la lógica de roles solo a nivel de UI (arrays `roles` en `Sidebar.tsx`, chequeos como `isAuditor`/`canListUsers`/`canDelete` en las páginas) para ocultar acciones que el usuario no podría ejecutar de todas formas — es una conveniencia de UX, nunca el mecanismo de seguridad.

## Consequences

**Positive**
- Cuatro roles cubren los perfiles reales del dominio sin sobre-diseñar un sistema de permisos granular (no hace falta ACL por-recurso para los tres roles no scopeados).
- El scoping de `ASSET_OWNER` es aditivo: no complica el modelo de roles en sí, solo agrega una tabla de asignación y un filtro de consulta — el resto del sistema no necesita saber que existe.
- Doble barrera (constraint de DB + `@PreAuthorize`) hace difícil que un rol inválido llegue a persistirse o que un endpoint quede sin protección por descuido, ya que el valor de `role` está validado en el nivel más bajo posible.

**Negative**
- La lógica de scoping (`applyScope`/`applyScopeAV`) vive dentro de `VulnerabilityAuditService`, mezclada con la máquina de estados del triage (ver ADR-0004) — un cambio en una puede afectar involuntariamente a la otra si no se testea con cuidado.
- Al ser UI-only, el gating de roles del frontend (`Sidebar.tsx`, checks por página) puede desincronizarse de las reglas reales del backend si alguien agrega un permiso nuevo del lado del servidor y se olvida de reflejarlo en el menú — no rompe la seguridad (el backend igual rechaza la acción) pero puede confundir al usuario mostrando u ocultando opciones incorrectamente.
- Cuatro roles fijos en un `CHECK` de base de datos significa que agregar un rol nuevo requiere una migración de esquema (un script SQL nuevo), no es data-driven.

## Alternatives Considered

- **Permisos granulares por recurso (ACL)**: máxima flexibilidad (asignar permisos individuales por usuario y recurso), pero muy por encima de la complejidad real necesitada — el dominio tiene perfiles de acceso claros y estables, no una matriz de permisos ad-hoc por cliente.
- **Roles como tabla configurable en vez de `CHECK` constraint fijo**: permitiría agregar roles sin migración, a costa de mover una validación de integridad crítica de la base de datos a la aplicación. Se prefirió la garantía dura de la constraint dado que los roles del dominio son estables y conocidos de antemano.
- **Scoping de `ASSET_OWNER` resuelto completamente en el frontend** (pedir todos los datos y filtrar en el cliente): descartado de inmediato por ser una falla de seguridad obvia — expondría datos de activos ajenos en la respuesta de la API aunque la UI no los mostrara.
