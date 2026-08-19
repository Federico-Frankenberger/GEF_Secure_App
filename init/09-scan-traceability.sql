-- ==========================================================
-- GEF SECURE - TRAZABILIDAD DE ESCANEOS (Etapa 1)
-- ==========================================================
-- scan_reports pasa a representar el ciclo de vida completo de un escaneo
-- (no solo el resultado final): se crea con status=RUNNING antes de disparar
-- n8n, y se completa con status=COMPLETED cuando n8n reporta el resultado.
-- executed_at ya funciona como "cuando termino" (n8n lo setea con NOW() al
-- final de la corrida) -- no hace falta una columna finished_at separada.
-- ==========================================================

ALTER TABLE public.scan_reports
    ADD COLUMN IF NOT EXISTS public_code           VARCHAR(20) UNIQUE,
    ADD COLUMN IF NOT EXISTS status                VARCHAR(25) NOT NULL DEFAULT 'COMPLETED',
    ADD COLUMN IF NOT EXISTS started_at            TIMESTAMP WITHOUT TIME ZONE,
    ADD COLUMN IF NOT EXISTS triggered_by          BIGINT REFERENCES public.users(id),
    ADD COLUMN IF NOT EXISTS software_component_id BIGINT REFERENCES public.software_components(id),
    ADD COLUMN IF NOT EXISTS environment_id        BIGINT REFERENCES public.environments(id),
    ADD COLUMN IF NOT EXISTS error_message         TEXT;

-- Backfill: para los escaneos historicos, lo unico que se sabe es cuando
-- terminaron (executed_at) -- se usa como aproximacion de started_at.
UPDATE public.scan_reports SET started_at = executed_at WHERE started_at IS NULL;
ALTER TABLE public.scan_reports ALTER COLUMN started_at SET NOT NULL;

-- Backfill de public_code para las filas historicas, con el mismo formato
-- que usara ScanService.start() de aca en mas (SCN-<anio>-<id con padding a 6>).
UPDATE public.scan_reports
SET public_code = 'SCN-' || to_char(executed_at, 'YYYY') || '-' || lpad(id::text, 6, '0')
WHERE public_code IS NULL;

-- ==========================================================
-- Etapa 2: scan_id en cada hallazgo -- reemplaza la heuristica de ventana
-- de tiempo (VulnerabilityAuditService.findByScanReport) por una FK real.
-- El backfill de las filas historicas se hace aparte, vulnerabilidad por
-- vulnerabilidad, reusando esa misma heuristica ya probada (ver sesion).
-- ==========================================================
ALTER TABLE public.vulnerabilities_audit
    ADD COLUMN IF NOT EXISTS scan_id BIGINT REFERENCES public.scan_reports(id);

-- ==========================================================
-- Etapa 3: AssetVulnerability -- estado persistente por (componente, CVE),
-- separado del hallazgo puntual e inmutable en vulnerabilities_audit. Es lo
-- que responde "cuanto tiempo lleva abierta", "volvio a aparecer", etc.
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.asset_vulnerabilities (
    id                     BIGSERIAL PRIMARY KEY,
    software_component_id  BIGINT NOT NULL REFERENCES public.software_components(id),
    cve_id                 VARCHAR(50) NOT NULL,
    status                 VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    priority               VARCHAR(20),
    decision               TEXT,
    assigned_to            VARCHAR(100) DEFAULT 'SIN_ASIGNAR',
    first_detected_at      TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    last_detected_at       TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    resolved_at            TIMESTAMP WITHOUT TIME ZONE,
    reopen_count           INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT unique_component_cve UNIQUE (software_component_id, cve_id)
);

ALTER TABLE public.vulnerabilities_audit
    ADD COLUMN IF NOT EXISTS asset_vulnerability_id BIGINT REFERENCES public.asset_vulnerabilities(id);

-- ==========================================================
-- Etapa 4: campos denormalizados del ultimo hallazgo -- necesarios para que
-- VulnerabilityAuditDTO.Response mantenga la misma forma leyendo desde
-- AssetVulnerability en vez de vulnerabilities_audit (Kanban/Dashboard sin cambios).
-- ==========================================================
ALTER TABLE public.asset_vulnerabilities
    ADD COLUMN IF NOT EXISTS cvss        VARCHAR(20),
    ADD COLUMN IF NOT EXISTS exploited   BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS ghsa_id     VARCHAR(30),
    ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMP WITHOUT TIME ZONE;

-- "status" separa en dos ejes distintos que se pisaban mal en un solo campo:
--   detection_status (OPEN/RESOLVED) -- lo maneja el sistema segun lo que los
--     escaneos siguen encontrando (applyLifecycle).
--   triage_status (DETECTADA/EN_ANALISIS/RESUELTA) -- lo maneja el analista
--     via Kanban (updateStatus), mismo vocabulario que ya usaba vulnerabilities_audit.
-- Si un CVE reaparece (REOPENED), applyLifecycle fuerza triage_status de
-- vuelta a DETECTADA -- para que no quede oculto como "resuelto" en el Kanban
-- mientras en realidad volvio a detectarse. La resolucion automatica por
-- ausencia SOLO toca detection_status, nunca triage_status: la ultima
-- palabra sobre "esta resuelto" en el Kanban la sigue teniendo el analista.
ALTER TABLE public.asset_vulnerabilities RENAME COLUMN status TO detection_status;
ALTER TABLE public.asset_vulnerabilities
    ADD COLUMN IF NOT EXISTS triage_status VARCHAR(20) NOT NULL DEFAULT 'DETECTADA';
