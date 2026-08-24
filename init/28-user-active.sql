-- Centro de Administración (docs/bitacora/23-08-26, prompt_mejora_configuracion_gef_secure.md):
-- antes la única forma de "sacar" a un usuario era borrarlo físicamente -- riesgoso si
-- tiene vulnerabilidades asignadas (asset_vulnerabilities.assigned_to_user_id no tiene
-- ON DELETE, el borrado fallaba) o auditoría histórica (StateTransition.actorId).
-- Desactivar preserva ese historial; el usuario simplemente no puede volver a loguearse.
ALTER TABLE users ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
