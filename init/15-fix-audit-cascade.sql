-- ==========================================================
-- GEF SECURE - FIX: CASCADE HEREDADO EN vulnerabilities_audit
-- ==========================================================
-- DB-02 (docs/20-08-26/AUDITORIA_END_TO_END.md): fk_audit_asset se creo en
-- 01-create-tables.sql cuando "assets" todavia era software instalado (borrar
-- el software y su historial de vulnerabilidades juntos tenia sentido). Al
-- renombrar esa tabla a software_components en 04-asset-hierarchy.sql,
-- Postgres sigue la FK por OID de tabla, no por nombre -- el ON DELETE CASCADE
-- quedo apuntando a software_components sin que nadie lo revisara.
--
-- Hoy la app nunca hace DELETE fisico de un SoftwareComponent (solo borrado
-- logico via deleted_at, ver 08-soft-delete-assets.sql), asi que no es
-- explotable via la API -- pero cualquier limpieza manual de la base con un
-- DELETE fisico borraria en cascada todo el historial de auditoria
-- (vulnerabilities_audit) sin aviso ni forma de deshacerlo, contradiciendo el
-- objetivo explicito de 08 de preservar ese historial.
--
-- Se aplica en su propio script (no se edita 01, que ya corrio en cualquier
-- base existente) para que quede como migracion incremental, igual que el
-- resto de los init/*.sql posteriores al esquema base.
-- ==========================================================

ALTER TABLE public.vulnerabilities_audit DROP CONSTRAINT IF EXISTS fk_audit_asset;

ALTER TABLE public.vulnerabilities_audit ADD CONSTRAINT fk_audit_asset
    FOREIGN KEY (asset_id) REFERENCES public.software_components(id);
