-- ==========================================================
-- Fase 8 del plan de tracking de remediacion (docs/21-08-26/Plan_Implementacion_Tracking_Solido.md),
-- Componente D -- la fase mas importante del plan: mueve al sistema de nivel 2 a nivel 3
-- de madurez de verificacion (Seccion 10.1 del marco).
--
-- advisory_type ('REVIEWED'/'UNREVIEWED'/'MALWARE') y vulnerable_version_range (string,
-- tal como lo devuelve la API REST de GitHub -- no el formato de eventos de OSV) llegan
-- ahora desde n8n (Risk_Assessment_Engine + Persist_Audit_Findings), igual que
-- patched_version/is_zero_day en 13-vulnerability-remediation-facts.sql. Se usan para no
-- tratar un cierre automatico respaldado por un advisory no revisado o con rango
-- placeholder como verificacion fuerte (Seccion 7.2 del marco).
--
-- reviewed/withdrawn_at en ghsa_advisory_cache son del otro lado del sistema (la cache de
-- presentacion que llena GhsaAdvisoryService al mostrar el detalle en el Kanban) -- misma
-- distincion reviewed/unreviewed, fuente distinta (fetch perezoso a GitHub, no n8n).
--
-- Deliberadamente NULL para las filas existentes -- no se fabrica esta clasificacion
-- retroactiva para hallazgos ya detectados (mismo criterio que las migraciones anteriores).
-- ==========================================================

ALTER TABLE public.vulnerabilities_audit
    ADD COLUMN IF NOT EXISTS advisory_type VARCHAR(20),
    ADD COLUMN IF NOT EXISTS vulnerable_version_range VARCHAR(255);

ALTER TABLE public.asset_vulnerabilities
    ADD COLUMN IF NOT EXISTS advisory_type VARCHAR(20),
    ADD COLUMN IF NOT EXISTS vulnerable_version_range VARCHAR(255);

ALTER TABLE public.ghsa_advisory_cache
    ADD COLUMN IF NOT EXISTS reviewed BOOLEAN,
    ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMP WITHOUT TIME ZONE;
