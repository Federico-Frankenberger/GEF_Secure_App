-- ==========================================================
-- GEF SECURE - FASE 1: CATALOGO DE SOFTWARE
-- ==========================================================
-- Catalogo de paquetes derivado automaticamente de la ingesta de GitHub
-- Advisory (nodo Sync_Software_Catalog del workflow n8n). Se usa para el
-- autocomplete del frontend y para marcar assets.catalogued.
-- Igual que init/01 e init/02, este script solo corre solo en un volumen
-- de Postgres nuevo. Para la base de desarrollo ya existente hay que
-- aplicarlo a mano (ver Plan_Unificado_Implementacion_GEF_Secure.md).
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.software_catalog (
    id            BIGSERIAL PRIMARY KEY,
    package_name  VARCHAR(255) NOT NULL,
    ecosystem     VARCHAR(50)  NOT NULL,
    display_name  VARCHAR(255),
    source        VARCHAR(30)  NOT NULL DEFAULT 'GITHUB_ADVISORY',
    first_seen_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen_at  TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_catalog_package UNIQUE (package_name, ecosystem)
);

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_software_catalog_trgm
    ON public.software_catalog USING gin (package_name gin_trgm_ops);

ALTER TABLE public.assets
    ADD COLUMN IF NOT EXISTS catalogued BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS purl        VARCHAR(400);
