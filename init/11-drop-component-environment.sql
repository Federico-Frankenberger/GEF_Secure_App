-- ==========================================================
-- GEF SECURE - eliminar el entorno independiente de software_components
-- ==========================================================
-- software_components.environment_id se podia setear de forma independiente
-- del environment_id de su propio activo (assets.environment_id), arrastrado
-- desde la Fase 2 cuando el componente era la unica entidad. Con asset_id ya
-- obligatorio desde init/08-soft-delete-assets.sql, el activo pasa a ser la
-- unica fuente de verdad para el entorno.
--
-- Postgres dropea automaticamente unique_component_per_environment y
-- fk_components_environment junto con la columna (ambas constraints
-- dependen solo de ella).
--
-- view_vulnerability_details (init/01-create-tables.sql) tambien depende de
-- esta columna. No la usa ningun codigo de la aplicacion (grep sobre backend/
-- frontend/workflows no encuentra referencias) y ya estaba stale desde la
-- Etapa 3/4 de trazabilidad (referencia v.status, columna que se dejo de usar
-- al migrar el ciclo de vida a asset_vulnerabilities.triage_status) -- se
-- dropea en vez de recrearse.
-- ==========================================================

DROP VIEW IF EXISTS public.view_vulnerability_details;

ALTER TABLE public.software_components DROP COLUMN IF EXISTS environment_id;
