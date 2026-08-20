-- ==========================================================
-- GEF SECURE - Tablero de Auditoria: cache de advisories de GitHub
-- ==========================================================
-- Frente 3 del plan de "mas contexto por vulnerabilidad": en vez de threadear
-- summary/description a traves del pipeline de n8n (ya de por si complejo, y
-- justo ahi es donde se perdian datos en silencio -- ver Frente 2), el backend
-- las pide directo a la API publica de GitHub Advisory Database la primera vez
-- que hace falta, y las cachea aca por GHSA ID. Una fila por advisory, no por
-- vulnerabilidad -- el mismo CVE puede repetirse en varios componentes/activos.
-- Igual que los scripts anteriores, solo corre en un volumen de Postgres
-- nuevo. Para la base de desarrollo ya existente hay que aplicarlo a mano.
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.ghsa_advisory_cache (
    ghsa_id       VARCHAR(30) PRIMARY KEY,
    summary       VARCHAR(500),
    description   TEXT,
    reference_urls TEXT,
    fetched_at    TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
