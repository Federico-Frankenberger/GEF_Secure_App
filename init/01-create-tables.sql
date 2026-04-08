-- ── Tabla ASSETS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assets (
    id BIGSERIAL PRIMARY KEY, -- SE CAMBIÓ SERIAL POR BIGSERIAL
    name character varying(255),
    software character varying(255),
    ecosystem character varying(50),
    version character varying(50),
    criticality character varying(20),
    last_scan timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    description text,
    CONSTRAINT unique_software_version UNIQUE (software, version)
);

-- ── Tabla VULNERABILITIES_AUDIT ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vulnerabilities_audit (
    id BIGSERIAL PRIMARY KEY, -- SE CAMBIÓ SERIAL POR BIGSERIAL
    detected_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    asset character varying(255),
    cve_id character varying(50),
    cvss character varying(20),
    exploited boolean DEFAULT FALSE,
    priority character varying(20),
    decision text,
    assigned_to character varying(100),
    status character varying(20) DEFAULT 'DETECTADA',
    resolved_at timestamp without time zone,
    ghsa_id character varying(50),
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- ── Tabla VULNERABILITIES_IGNORED ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vulnerabilities_ignored (
    id BIGSERIAL PRIMARY KEY, -- SE CAMBIÓ SERIAL POR BIGSERIAL
    package_name character varying(255),
    ecosystem character varying(50),
    vulnerable_range character varying(100),
    patched_version character varying(100),
    ignored_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    hit_count integer DEFAULT 1,
    CONSTRAINT unique_package_vulnerability UNIQUE (package_name, vulnerable_range)
);

-- ── Tabla SCAN_REPORTS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.scan_reports (
    id BIGSERIAL PRIMARY KEY, -- SE CAMBIÓ SERIAL POR BIGSERIAL
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_detected INTEGER NOT NULL,
    audited INTEGER NOT NULL,
    ignored INTEGER NOT NULL,
    criticals INTEGER DEFAULT 0,
    highs INTEGER DEFAULT 0,
    mediums INTEGER DEFAULT 0,
    lows INTEGER DEFAULT 0,
    system_status VARCHAR(50),
    report_message TEXT
);

-- ── Tabla SYSTEM_ERRORS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_errors (
    id BIGSERIAL PRIMARY KEY, -- SE CAMBIÓ SERIAL POR BIGSERIAL
    error_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    node_name VARCHAR(100),
    error_message TEXT,
    workflow_id VARCHAR(50),
    execution_id VARCHAR(50)
);

-- ── Tabla USERS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
    id BIGSERIAL PRIMARY KEY, -- SE CAMBIÓ SERIAL POR BIGSERIAL
    username character varying(50) UNIQUE NOT NULL,
    full_name character varying(100),
    email character varying(100),
    role character varying(20) DEFAULT 'AUDITOR',
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);