-- ==========================================================
-- GEF SECURE - FASE 2: JERARQUIA ASSET (HOST) / SOFTWARE_COMPONENT
-- ==========================================================
-- Lo que hasta ahora se llamaba "assets" era en realidad un componente de
-- software instalado (identificado por software+ecosystem+version), no un
-- host/aplicacion real. Este script:
--   1) renombra esa tabla a software_components (preservando sus datos),
--   2) crea una tabla assets nueva = el activo real (host/app/VM/contenedor),
--   3) vincula software_components con el nuevo assets via asset_id (nullable,
--      retrocompatible: un componente sin host asignado sigue funcionando
--      exactamente como antes).
-- Igual que init/03, solo corre solo en un volumen de Postgres nuevo. Para la
-- base de desarrollo ya existente hay que aplicarlo a mano (ver
-- Plan_Unificado_Implementacion_GEF_Secure.md).
-- ==========================================================

-- 1) Renombrar la tabla actual (componente de software)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'assets')
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables
                        WHERE table_schema = 'public' AND table_name = 'software_components')
    THEN
        ALTER TABLE public.assets RENAME TO software_components;
        -- El RENAME de tabla no renombra la sequence del BIGSERIAL.
        ALTER SEQUENCE public.assets_id_seq RENAME TO software_components_id_seq;
        ALTER TABLE public.software_components
            RENAME CONSTRAINT unique_asset_per_environment TO unique_component_per_environment;
        ALTER TABLE public.software_components
            RENAME CONSTRAINT fk_assets_environment TO fk_components_environment;
    END IF;
END $$;

-- 2) Nueva tabla assets = el activo real (host / aplicacion / VM / contenedor)
CREATE TABLE IF NOT EXISTS public.assets (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL,
    asset_type      VARCHAR(30)  NOT NULL DEFAULT 'SERVIDOR',
    environment_id  BIGINT,
    description     TEXT,
    created_at      TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_assets_environment FOREIGN KEY (environment_id)
        REFERENCES public.environments (id) ON DELETE SET NULL,
    CONSTRAINT unique_asset_name_per_environment UNIQUE (name, environment_id)
);

-- 3) software_components se vincula al nuevo assets
ALTER TABLE public.software_components
    ADD COLUMN IF NOT EXISTS asset_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_components_asset' AND table_name = 'software_components'
    ) THEN
        ALTER TABLE public.software_components
            ADD CONSTRAINT fk_components_asset FOREIGN KEY (asset_id)
                REFERENCES public.assets (id) ON DELETE SET NULL;
    END IF;
END $$;

-- vulnerabilities_audit.asset_id (fk_audit_asset) NO se toca: Postgres sigue
-- la FK por OID de tabla, no por nombre, asi que ya queda apuntando a
-- software_components sin ningun ALTER adicional.
