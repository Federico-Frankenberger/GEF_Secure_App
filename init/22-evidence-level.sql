-- ==========================================================
-- Fase 7 del plan de tracking de remediacion (docs/21-08-26/Plan_Implementacion_Tracking_Solido.md):
-- escala de evidencia E0-E6 (Seccion 8.3 del marco) para cada StateTransition -- que tan
-- fuerte es la prueba de un cierre, no solo si se declaro cerrado. evidence_ref (agregada
-- en 19-remediation-cycles-and-transitions.sql) guarda la referencia al respaldo real
-- (URL de reporte, commit, PR); evidence_level clasifica su fuerza.
--
-- Deliberadamente NULL para las filas existentes -- no se fabrica un nivel de evidencia
-- retroactivo para transiciones que ya ocurrieron sin este campo (mismo criterio que las
-- migraciones anteriores de esta serie).
-- ==========================================================

ALTER TABLE public.state_transitions
    ADD COLUMN IF NOT EXISTS evidence_level VARCHAR(5);
