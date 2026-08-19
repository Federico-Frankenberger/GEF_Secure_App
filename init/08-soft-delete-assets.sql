-- ==========================================================
-- GEF SECURE - BORRADO LOGICO DE ACTIVOS + SOFTWARE OBLIGATORIO
-- ==========================================================
-- SoftwareComponent.assetId pasa a ser obligatorio: el software siempre
-- pertenece a un activo, no puede quedar suelto. Como consecuencia, borrar
-- un activo con software ya no puede desvincularlo (asset_id = NULL, como
-- antes) -- pasa a ser borrado logico en cascada: se marca deleted_at tanto
-- en el activo como en su software activo en ese momento, sin borrar nada
-- fisicamente (se preserva el historial de vulnerabilidades). Un ADMIN o
-- SECURITY_ANALYST puede restaurarlo despues desde la propia pantalla de
-- Activos.
-- Igual que los scripts anteriores, solo corre en un volumen de Postgres
-- nuevo. Para la base de desarrollo ya existente hay que aplicarlo a mano.
-- ==========================================================

ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE public.software_components ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITHOUT TIME ZONE;

-- Backfill: cada componente huerfano (sin host) se promueve a un activo
-- nuevo con su mismo nombre/entorno, y se le asigna.
DO $$
DECLARE
    comp RECORD;
    new_id BIGINT;
BEGIN
    FOR comp IN SELECT id, name, environment_id FROM public.software_components WHERE asset_id IS NULL LOOP
        INSERT INTO public.assets (name, asset_type, environment_id, created_at)
        VALUES (comp.name, 'SERVIDOR', comp.environment_id, CURRENT_TIMESTAMP)
        RETURNING id INTO new_id;

        UPDATE public.software_components SET asset_id = new_id WHERE id = comp.id;
    END LOOP;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.software_components WHERE asset_id IS NULL) THEN
        RAISE EXCEPTION 'Quedaron software_components sin asset_id tras el backfill';
    END IF;
END $$;

ALTER TABLE public.software_components ALTER COLUMN asset_id SET NOT NULL;

-- El borrado fisico de un activo con componentes ya no deberia ocurrir nunca
-- (solo borrado logico desde la app) -- se saca el ON DELETE SET NULL; el
-- default RESTRICT de Postgres actua como resguardo si algo intentara
-- borrar un activo a nivel SQL sin pasar por la app.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_components_asset' AND table_name = 'software_components'
    ) THEN
        ALTER TABLE public.software_components DROP CONSTRAINT fk_components_asset;
    END IF;
END $$;

ALTER TABLE public.software_components
    ADD CONSTRAINT fk_components_asset FOREIGN KEY (asset_id) REFERENCES public.assets (id);

-- Indice unico parcial: permite reusar el nombre de un activo ya eliminado
-- logicamente (la UNIQUE original chocaria con el registro "borrado").
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'unique_asset_name_per_environment' AND table_name = 'assets'
    ) THEN
        ALTER TABLE public.assets DROP CONSTRAINT unique_asset_name_per_environment;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS unique_active_asset_name_per_environment
    ON public.assets (name, environment_id) WHERE deleted_at IS NULL;
