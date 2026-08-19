-- ==========================================================
-- GEF SECURE - FASE 4 (continuacion): usuarios demo para los
-- botones de acceso rapido del login
-- ==========================================================
-- Los unicos usuarios semilla hasta ahora eran ADMIN y AUDITOR
-- (init/02-seed-data.sql). Se agregan los 2 roles restantes con
-- la misma contrasena fija de desarrollo (ver init/05-auth.sql),
-- y se le asigna al ASSET_OWNER de prueba un activo real con al
-- menos un componente y una vulnerabilidad, para que el boton de
-- acceso rapido muestre un caso de uso real y no una pantalla vacia.
-- Igual que los scripts anteriores, solo corre en un volumen de
-- Postgres nuevo. Para la base de desarrollo ya existente hay que
-- aplicarlo a mano.
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO public.users (username, full_name, email, role, password_hash) VALUES
    ('analyst.demo', 'Security Analyst Demo', 'analyst@gef-secure.local', 'SECURITY_ANALYST',
        crypt('GefSecure2026!', gen_salt('bf', 10))),
    ('owner.demo',   'Asset Owner Demo',      'owner@gef-secure.local',   'ASSET_OWNER',
        crypt('GefSecure2026!', gen_salt('bf', 10)))
ON CONFLICT (username) DO NOTHING;

-- Activo de demostración para que owner.demo tenga scope real
INSERT INTO public.assets (name, asset_type, environment_id, description) VALUES
    ('Servidor Demo (ASSET_OWNER)', 'SERVIDOR',
        (SELECT id FROM public.environments WHERE name = 'Desarrollo'),
        'Activo de demostración asignado a owner.demo para el botón de acceso rápido del login')
ON CONFLICT (name, environment_id) DO NOTHING;

-- Se reutiliza un componente del seed (con vulnerabilidad ya cargada)
-- para que el scope de owner.demo no esté vacío.
UPDATE public.software_components
    SET asset_id = (SELECT id FROM public.assets WHERE name = 'Servidor Demo (ASSET_OWNER)')
    WHERE software = 'axios' AND asset_id IS NULL;

INSERT INTO public.user_asset_assignments (user_id, asset_id)
    SELECT u.id, a.id
    FROM public.users u, public.assets a
    WHERE u.username = 'owner.demo' AND a.name = 'Servidor Demo (ASSET_OWNER)'
ON CONFLICT (user_id, asset_id) DO NOTHING;
