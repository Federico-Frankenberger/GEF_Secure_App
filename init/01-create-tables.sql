-- ==========================================================
-- GEF SECURE - ESQUEMA DE BASE DE DATOS FINAL (POSTGRESQL)
-- ==========================================================

-- 1. TABLA DE ENTORNOS
-- Define las capas de infraestructura (Desarrollo, Testing, Producción)
CREATE TABLE IF NOT EXISTS public.environments (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    business_criticality VARCHAR(20) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLA DE ACTIVOS (ASSETS)
-- Inventario de software detectado en cada entorno
CREATE TABLE IF NOT EXISTS public.assets (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100),
    software VARCHAR(255),
    ecosystem VARCHAR(50),
    version VARCHAR(50),
    last_scan TIMESTAMP WITHOUT TIME ZONE,
    description TEXT,
    environment_id BIGINT,
    
    CONSTRAINT fk_assets_environment FOREIGN KEY (environment_id)
        REFERENCES public.environments (id) ON DELETE CASCADE,
    CONSTRAINT unique_asset_per_environment UNIQUE (software, version, environment_id)
);

-- 3. TABLA DE REPORTES DE ESCANEO
-- Consolidado histórico de ejecuciones del workflow
CREATE TABLE IF NOT EXISTS public.scan_reports (
    id BIGSERIAL PRIMARY KEY,
    executed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    total_detected INTEGER NOT NULL,
    audited INTEGER NOT NULL,
    ignored INTEGER NOT NULL,
    criticals INTEGER DEFAULT 0,
    highs INTEGER DEFAULT 0,
    mediums INTEGER DEFAULT 0,
    lows INTEGER DEFAULT 0,
    system_status VARCHAR(50),
    report_message TEXT,
    environment_breakdown JSONB, -- Detalle por entorno en formato NoSQL
    target_type VARCHAR(20),
    target_name VARCHAR(100)
);

-- 4. TABLA DE AUDITORÍA DE VULNERABILIDADES
-- Registro detallado de hallazgos vinculados a activos específicos
CREATE TABLE IF NOT EXISTS public.vulnerabilities_audit (
    id BIGSERIAL PRIMARY KEY,
    detected_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    asset_id BIGINT, -- Relación FK con tabla Assets
    cve_id VARCHAR(50),
    ghsa_id VARCHAR(30),
    cvss VARCHAR(20),
    exploited BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20),
    decision TEXT,
    assigned_to VARCHAR(100) DEFAULT 'SIN_ASIGNAR',
    status VARCHAR(20) DEFAULT 'DETECTADA',
    resolved_at TIMESTAMP WITHOUT TIME ZONE,

    CONSTRAINT fk_audit_asset FOREIGN KEY (asset_id) 
        REFERENCES public.assets (id) ON DELETE CASCADE
);

-- 5. TABLA DE VULNERABILIDADES IGNORADAS (WHITELIST)
-- Gestión de falsos positivos o riesgos aceptados
CREATE TABLE IF NOT EXISTS public.vulnerabilities_ignored (
    id BIGSERIAL PRIMARY KEY,
    package_name VARCHAR(255),
    ecosystem VARCHAR(50),
    vulnerable_range VARCHAR(100),
    patched_version VARCHAR(100),
    ignored_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    hit_count INTEGER DEFAULT 1,
    CONSTRAINT unique_package_vulnerability UNIQUE (package_name, vulnerable_range)
);

-- 6. TABLA DE USUARIOS
-- Gestión de acceso al sistema de gestión de vulnerabilidades
CREATE TABLE IF NOT EXISTS public.users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(100),
    email VARCHAR(100),
    role VARCHAR(20) DEFAULT 'AUDITOR',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. REGISTRO DE ERRORES DEL SISTEMA (LOGGING)
-- Trazabilidad de fallos en los nodos de n8n
CREATE TABLE IF NOT EXISTS public.system_errors (
    id BIGSERIAL PRIMARY KEY,
    error_date TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    node_name VARCHAR(100),
    error_message TEXT,
    workflow_id VARCHAR(50),
    execution_id VARCHAR(50)
);

-- ==========================================================
-- VISTAS ÚTILES (OPCIONALES PARA DASHBOARDS)
-- ==========================================================
-- Vista para ver auditorías con el nombre del activo y su entorno
CREATE OR REPLACE VIEW public.view_vulnerability_details AS
SELECT 
    v.id AS audit_id,
    a.name AS asset_name,
    e.name AS environment_name,
    v.cve_id,
    v.priority,
    v.status,
    v.detected_at
FROM public.vulnerabilities_audit v
JOIN public.assets a ON v.asset_id = a.id
JOIN public.environments e ON a.environment_id = e.id;