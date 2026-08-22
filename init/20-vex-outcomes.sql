-- ==========================================================
-- Fase 5 del plan de tracking de remediacion (docs/21-08-26/Plan_Implementacion_Tracking_Solido.md):
-- vocabulario VEX (Vulnerability Exploitability eXchange) para distinguir COMO se cerro
-- un caso, no solo que se cerro. Antes, "remediar" y "mitigar" eran indistinguibles del
-- "sin tratar" -- todo colapsaba en triage_status = 'RESUELTA'.
--
-- outcome (nullable, solo aplica cuando triage_status = 'RESUELTA'):
--   NULL             -> cierre "plano", sin clasificar (comportamiento previo).
--   MITIGADA         -> requiere mitigation_control.
--   NO_APLICA        -> requiere justification (obligatoria, no opcional).
--   RIESGO_ACEPTADO  -> requiere accepted_by + risk_accepted_until (obligatoria: sin
--                       vencimiento, la aceptacion de riesgo se vuelve perpetua).
--
-- Deliberadamente NULL para las filas existentes -- no se backfillea ningun outcome
-- retroactivo, porque ese dato nunca se capturo (mismo criterio que 18 y 19).
-- ==========================================================

ALTER TABLE public.asset_vulnerabilities
    ADD COLUMN IF NOT EXISTS outcome VARCHAR(20),
    ADD COLUMN IF NOT EXISTS mitigation_control TEXT,
    ADD COLUMN IF NOT EXISTS justification TEXT,
    ADD COLUMN IF NOT EXISTS accepted_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS risk_accepted_until TIMESTAMP WITHOUT TIME ZONE;
