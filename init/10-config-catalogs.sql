-- ==========================================================
-- GEF SECURE - CATALOGOS ADMINISTRABLES DESDE CONFIG
-- ==========================================================
-- Tipos de host y ecosistemas de software estaban hardcodeados en el
-- frontend (Assets.tsx) -- se convierten en catalogos livianos, sin FK
-- real desde assets.asset_type / software_components.ecosystem (siguen
-- siendo texto libre): borrar una entrada del catalogo no afecta a los
-- activos/componentes ya creados con ese valor, solo deja de ofrecerse
-- como opcion para altas nuevas.
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.asset_types (
    id   BIGSERIAL PRIMARY KEY,
    name VARCHAR(30) UNIQUE NOT NULL
);
INSERT INTO public.asset_types (name) VALUES
    ('SERVIDOR'), ('APLICACION'), ('VM'), ('CONTENEDOR'), ('ENDPOINT')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.ecosystems (
    id   BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);
INSERT INTO public.ecosystems (name) VALUES
    ('npm'), ('pip'), ('maven'), ('nuget'), ('cargo'), ('go'), ('composer'), ('rubygems')
ON CONFLICT (name) DO NOTHING;
