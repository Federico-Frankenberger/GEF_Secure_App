-- ==========================================================
-- Fase 6 del plan de tracking de remediacion (docs/21-08-26/Plan_Implementacion_Tracking_Solido.md),
-- Componente C: persistir las variables que produjeron `priority`, no solo la etiqueta
-- final, y agregar un campo de plazo (due_date).
--
-- El calculo de prioridad ya es multi-variable en n8n (Risk_Assessment_Engine: CVSS +
-- criticidad de entorno + catalogo CISA KEV + zero-day) -- lo que faltaba era guardar
-- ese desglose, no disenarlo de nuevo. priority_variables lo arma Risk_Assessment_Engine
-- y lo escribe Persist_Audit_Findings (INSERT directo, igual que patched_version/is_zero_day
-- en 13-vulnerability-remediation-facts.sql); asset_vulnerabilities lo recibe de
-- VulnerabilityAuditService.applyLifecycle(), que tambien calcula due_date.
--
-- Deliberadamente NULL para las filas existentes -- no se backfillea ningun desglose
-- retroactivo (ese dato nunca se capturo) ni una fecha limite fabricada con el criterio
-- de hoy aplicado a casos detectados en el pasado (mismo criterio que 18, 19 y 20).
-- ==========================================================

ALTER TABLE public.vulnerabilities_audit
    ADD COLUMN IF NOT EXISTS priority_variables JSONB;

ALTER TABLE public.asset_vulnerabilities
    ADD COLUMN IF NOT EXISTS priority_variables JSONB,
    ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITHOUT TIME ZONE;
