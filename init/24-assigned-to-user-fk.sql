-- ==========================================================
-- Fase 9 del plan de tracking de remediacion (docs/21-08-26/Plan_Implementacion_Tracking_Solido.md):
-- normalizar assigned_to (texto libre) a una relacion real con users. La UI del Kanban ya
-- restringia la asignacion a un selector de usuarios reales -- este era un gap de esquema,
-- no de experiencia de usuario.
--
-- assigned_to_user_id se agrega EN PARALELO a assigned_to (no se borra la columna vieja):
-- se backfillea por match exacto de username, y queda NULL donde no matchea ningun usuario
-- real (ej. el placeholder "SIN_ASIGNAR") -- no se inventa un usuario para esas filas.
-- ==========================================================

ALTER TABLE public.asset_vulnerabilities
    ADD COLUMN IF NOT EXISTS assigned_to_user_id BIGINT REFERENCES public.users(id);

UPDATE public.asset_vulnerabilities av
SET assigned_to_user_id = u.id
FROM public.users u
WHERE u.username = av.assigned_to
  AND av.assigned_to_user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_asset_vulnerabilities_assigned_to_user
    ON public.asset_vulnerabilities (assigned_to_user_id);
