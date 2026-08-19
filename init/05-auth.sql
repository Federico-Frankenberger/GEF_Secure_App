-- ==========================================================
-- GEF SECURE - FASE 3: AUTENTICACION
-- ==========================================================
-- Agrega password_hash a users y hashea con BCrypt (via pgcrypto) una
-- contrasena de desarrollo fija para los usuarios del seed, documentada
-- en el README ("solo para entorno local"). Nunca queda en texto plano
-- en el repo: pgcrypto genera el hash BCrypt directamente en la base,
-- en el mismo formato que despues valida BCryptPasswordEncoder del lado
-- Java, sin ninguna conversion.
-- Igual que init/03 e init/04, este script solo corre en un volumen de
-- Postgres nuevo. Para la base de desarrollo ya existente hay que
-- aplicarlo a mano.
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

UPDATE public.users
    SET password_hash = crypt('GefSecure2026!', gen_salt('bf', 10))
    WHERE password_hash IS NULL;

ALTER TABLE public.users
    ALTER COLUMN password_hash SET NOT NULL;
