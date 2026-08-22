-- ==========================================================
-- Fase 1 del plan de tracking de remediacion (docs/21-08-26/Plan_Implementacion_Tracking_Solido.md):
-- Componente F (auditoria inmutable de transiciones) + Componente E (separar el
-- ciclo de remediacion del hallazgo persistente).
--
-- asset_vulnerabilities sigue siendo el hallazgo persistente (par componente+CVE,
-- no cambia). Se agregan dos tablas nuevas:
--   remediation_cycles: un ciclo de apertura-cierre por cada vez que el hallazgo
--     estuvo abierto -- antes, cada reapertura pisaba first_detected_at/resolved_at
--     de la misma fila y se perdia la duracion del ciclo anterior.
--   state_transitions: un registro append-only por cada cambio de estado dentro
--     de un ciclo (quien lo hizo, cuando, y por que disparador). Nunca se actualiza
--     ni se borra una fila existente.
--
-- Backfill de remediation_cycles para los hallazgos que ya existen hoy: se crea
-- exactamente 1 ciclo por fila, con datos reales (last_detected_at, resolved_at,
-- reopen_count) -- nada inventado. NO se crea ninguna fila de state_transitions
-- para el pasado: esas transiciones nunca se capturaron, y fabricar una fila que
-- diga "ocurrio en tal momento" seria inventar historia (mismo criterio ya
-- aplicado en 18-audit-snapshot-columns.sql). El trail de auditoria arranca vacio
-- para los casos viejos y se llena desde el primer cambio real que ocurra de aca
-- en mas.
--
-- Igual que los scripts anteriores, el CREATE TABLE solo corre en un volumen de
-- Postgres nuevo. Para la base de desarrollo ya existente hay que aplicarlo a mano.
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.remediation_cycles (
    id                       BIGSERIAL PRIMARY KEY,
    asset_vulnerability_id   BIGINT NOT NULL REFERENCES public.asset_vulnerabilities(id),
    cycle_number             INTEGER NOT NULL,
    detected_at              TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    closed_at                TIMESTAMP WITHOUT TIME ZONE,
    created_at               TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_av_cycle_number UNIQUE (asset_vulnerability_id, cycle_number)
);

CREATE TABLE IF NOT EXISTS public.state_transitions (
    id                       BIGSERIAL PRIMARY KEY,
    remediation_cycle_id     BIGINT NOT NULL REFERENCES public.remediation_cycles(id),
    from_state               VARCHAR(30),
    to_state                 VARCHAR(30) NOT NULL,
    occurred_at              TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    actor_id                 BIGINT,
    actor_type               VARCHAR(20) NOT NULL,
    trigger_type              VARCHAR(50),
    comment                  TEXT,
    evidence_ref             TEXT
);

CREATE INDEX IF NOT EXISTS idx_remediation_cycles_asset_vulnerability
    ON public.remediation_cycles (asset_vulnerability_id);

CREATE INDEX IF NOT EXISTS idx_state_transitions_remediation_cycle
    ON public.state_transitions (remediation_cycle_id);

INSERT INTO public.remediation_cycles (asset_vulnerability_id, cycle_number, detected_at, closed_at, created_at)
SELECT av.id, av.reopen_count + 1, av.last_detected_at, av.resolved_at, NOW()
FROM public.asset_vulnerabilities av
WHERE NOT EXISTS (
    SELECT 1 FROM public.remediation_cycles rc WHERE rc.asset_vulnerability_id = av.id
);
