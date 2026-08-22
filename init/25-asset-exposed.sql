-- ==========================================================
-- Fase 10 (opcional) del plan de tracking de remediacion
-- (docs/21-08-26/Plan_Implementacion_Tracking_Solido.md): campo `exposed` manual en
-- Asset -- ver Seccion 5 de Brechas_Tracking_Remediacion.md. Declarado a mano por el
-- analista (sin Caja Negra), distinto de Environment.business_criticality: esa columna
-- ya cubre la criticidad de negocio del entorno, esta es especificamente "alcanzable
-- desde internet".
--
-- NULL para las filas existentes -- no se asume "no expuesto" por omision. Un activo sin
-- declarar no es lo mismo que un activo declarado explicitamente como no expuesto.
-- ==========================================================

ALTER TABLE public.assets
    ADD COLUMN IF NOT EXISTS exposed BOOLEAN;
