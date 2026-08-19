-- ==========================================================
-- GEF SECURE - FASE 4: RBAC + SCOPE
-- ==========================================================
-- Fija los 4 roles reales del sistema (antes "role" era texto libre sin
-- ningun efecto) y agrega la tabla de asignacion usuario<->activo que
-- define el scope de ASSET_OWNER: solo ve/opera sobre los activos que
-- tiene asignados aca.
-- Igual que los scripts anteriores, solo corre en un volumen de Postgres
-- nuevo. Para la base de desarrollo ya existente hay que aplicarlo a mano.
-- ==========================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'check_users_role' AND table_name = 'users'
    ) THEN
        ALTER TABLE public.users
            ADD CONSTRAINT check_users_role
            CHECK (role IN ('ADMIN','SECURITY_ANALYST','ASSET_OWNER','AUDITOR'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_asset_assignments (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
    asset_id    BIGINT NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_asset UNIQUE (user_id, asset_id)
);
