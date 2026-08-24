-- N8N-03 (docs/bitacora/24-08-26/AUDITORIA_END_TO_END_2.md, plan de confiabilidad
-- 2026-08-24): columna de locking optimista para AssetVulnerability.model.AssetVulnerability
-- (@Version) -- detecta escrituras concurrentes sobre la misma fila (dos escaneos con
-- alcance solapado) ademas del orden deterministico ya existente, que solo evita el
-- deadlock pero no un pisado silencioso bajo otro intercalado de timing.
ALTER TABLE public.asset_vulnerabilities
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
