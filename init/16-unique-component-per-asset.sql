-- ==========================================================
-- GEF SECURE - UNIQUE EN software_components (asset + software + ecosystem + version)
-- ==========================================================
-- DB-05 (docs/20-08-26/AUDITORIA_END_TO_END.md): el unico UNIQUE que alguna vez
-- protegio esta tabla contra duplicados (unique_component_per_environment, sobre
-- software+version+environment_id) se cayo automaticamente en
-- 11-drop-component-environment.sql al dropear la columna environment_id de la
-- que dependia -- ningun script posterior lo reemplazo. Desde entonces, la unica
-- proteccion es un chequeo de aplicacion en SoftwareComponentService.create()
-- con una condicion de carrera real (SELECT seguido de INSERT, sin lock).
--
-- Decision confirmada con el usuario: dos versiones del mismo paquete en el
-- mismo activo son filas separadas (no un upsert de version) -- por eso la
-- clave incluye version, a diferencia de la clave de upsert que usa la
-- importacion de SBOM (asset_id+software+ecosystem, ver
-- SoftwareComponentRepository.findByAsset_IdAndSoftwareAndEcosystemAndDeletedAtIsNull).
--
-- Indice unico PARCIAL (WHERE deleted_at IS NULL), mismo patron que
-- unique_active_asset_name_per_environment de 08-soft-delete-assets.sql, para
-- no chocar con filas ya borradas logicamente.
--
-- Verificado antes de aplicar: SELECT ... GROUP BY ... HAVING COUNT(*) > 1
-- sobre (asset_id, software, ecosystem, version) no devuelve filas en la base
-- actual (2026-08-20) -- no hace falta resolver duplicados previos.
-- ==========================================================

CREATE UNIQUE INDEX IF NOT EXISTS unique_component_per_asset ON public.software_components
    (asset_id, software, ecosystem, version) WHERE deleted_at IS NULL;
