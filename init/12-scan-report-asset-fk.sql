-- ==========================================================
-- GEF SECURE - FK real de scan_reports hacia assets (escaneo por Activo/host)
-- ==========================================================
-- scan_reports ya tenia software_component_id/environment_id para vincular un
-- escaneo con su objetivo real (init/09-scan-traceability.sql), pero nunca
-- existio un nivel "todos los componentes de este Asset puntual" -- solo
-- Componente (1 software_component), Entorno y Global. Se agrega asset_id,
-- mismo patron que las otras dos FK, para el nuevo modo de escaneo por
-- Activo (targetType='HOST'), sin depender solo del nombre congelado en
-- target_name (mismo criterio que init/09 y la correccion de §11.14 del
-- informe de implementacion: preferir FK vivo sobre matching por nombre).
-- ==========================================================

ALTER TABLE public.scan_reports
    ADD COLUMN IF NOT EXISTS asset_id BIGINT REFERENCES public.assets(id);
