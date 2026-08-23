-- ==========================================================
-- GEF SECURE - APLICAR SEED LIMPIO A UNA BASE YA EXISTENTE
-- ==========================================================
-- A diferencia de un volumen nuevo (donde corre init/02 -> ... -> init/27 en
-- secuencia, cada uno compatible con el esquema de SU punto en el tiempo),
-- este script es AUTOCONTENIDO: la base ya tiene el esquema final de hoy
-- (todas las columnas NOT NULL ya exigidas, ej. users.password_hash), asi
-- que no se puede "reproducir" init/02 tal cual (fallaria contra columnas
-- que en su momento no existian todavia). Este script arma el mismo dataset
-- final que init/02+07+27 dejarian en un volumen nuevo, pero con INSERTs
-- validos contra el esquema COMPLETO de una sola vez.
--
-- Efecto: BORRA todo el contenido transaccional/de inventario actual
-- (semanas de pruebas acumuladas) y lo reemplaza por un dataset limpio y
-- representativo de las features actuales. No toca catalogos de referencia
-- (asset_types, ecosystems, software_catalog, ghsa_advisory_cache).
--
-- Vive fuera de init/ a propósito: Postgres corre TODOS los .sql de esa
-- carpeta en orden alfabético en un volumen nuevo, y este script correría de
-- nuevo justo después de init/27 en cualquier instalación limpia si quedara
-- ahí adentro.
--
-- Uso: docker compose exec -T postgres psql -U security_user -d security < scripts/reset-dev-data.sql
-- ==========================================================

TRUNCATE TABLE
    state_transitions, remediation_cycles, vulnerabilities_audit, asset_vulnerabilities,
    scan_reports, vulnerabilities_ignored, system_errors, user_asset_assignments,
    software_components, assets, users, environments
    RESTART IDENTITY CASCADE;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    env_dev BIGINT;
    env_test BIGINT;
    env_prod BIGINT;

    user_admin BIGINT;
    user_analyst BIGINT;
    user_owner BIGINT;
    user_auditor BIGINT;

    asset_react BIGINT;
    asset_gateway BIGINT;
    asset_qa BIGINT;
    asset_backend_prod BIGINT;
    asset_db_prod BIGINT;
    asset_owner_demo BIGINT;

    comp_react BIGINT;
    comp_express BIGINT;
    comp_axios_qa BIGINT;
    comp_lodash BIGINT;
    comp_spring BIGINT;
    comp_postgres BIGINT;
    comp_axios_owner BIGINT;

    scan_manual BIGINT;
    scan_auto BIGINT;

    av_id BIGINT;
    cycle_id BIGINT;
BEGIN
    -- ── Entornos ─────────────────────────────────────────────────────────
    INSERT INTO public.environments (name, business_criticality, description) VALUES
        ('Desarrollo', 'BAJA',    'Entorno de desarrollo interno, sin datos productivos'),
        ('Testing',    'MEDIA',   'Entorno de QA / staging previo a producción'),
        ('Producción', 'CRITICA', 'Entorno productivo expuesto a usuarios finales');

    SELECT id INTO env_dev  FROM public.environments WHERE name = 'Desarrollo';
    SELECT id INTO env_test FROM public.environments WHERE name = 'Testing';
    SELECT id INTO env_prod FROM public.environments WHERE name = 'Producción';

    -- ── Usuarios (mismos usernames que siempre -- README los referencia) ──
    INSERT INTO public.users (username, full_name, email, role, password_hash) VALUES
        ('fede.frankenberger', 'Federico Frankenberger', 'fede@gef-secure.local', 'ADMIN',
            crypt('GefSecure2026!', gen_salt('bf', 10))),
        ('analyst.demo', 'Security Analyst Demo', 'analyst@gef-secure.local', 'SECURITY_ANALYST',
            crypt('GefSecure2026!', gen_salt('bf', 10))),
        ('owner.demo', 'Asset Owner Demo', 'owner@gef-secure.local', 'ASSET_OWNER',
            crypt('GefSecure2026!', gen_salt('bf', 10))),
        ('auditor.demo', 'Auditor Demo', 'auditor@gef-secure.local', 'AUDITOR',
            crypt('GefSecure2026!', gen_salt('bf', 10)));

    SELECT id INTO user_admin   FROM public.users WHERE username = 'fede.frankenberger';
    SELECT id INTO user_analyst FROM public.users WHERE username = 'analyst.demo';
    SELECT id INTO user_owner   FROM public.users WHERE username = 'owner.demo';
    SELECT id INTO user_auditor FROM public.users WHERE username = 'auditor.demo';

    -- ── Activos ──────────────────────────────────────────────────────────
    INSERT INTO public.assets (name, asset_type, environment_id, description, exposed)
    VALUES ('React App', 'APLICACION', env_dev, 'Frontend SPA del panel de gestión', FALSE)
    RETURNING id INTO asset_react;

    INSERT INTO public.assets (name, asset_type, environment_id, description, exposed)
    VALUES ('Express API Gateway', 'APLICACION', env_dev, 'Gateway interno de pruebas', TRUE)
    RETURNING id INTO asset_gateway;

    INSERT INTO public.assets (name, asset_type, environment_id, description, exposed)
    VALUES ('QA Test Runner', 'SERVIDOR', env_test, 'Entorno de QA / staging previo a producción', FALSE)
    RETURNING id INTO asset_qa;

    INSERT INTO public.assets (name, asset_type, environment_id, description, exposed)
    VALUES ('Backend Producción', 'SERVIDOR', env_prod, 'API principal de GEF Secure en producción', TRUE)
    RETURNING id INTO asset_backend_prod;

    INSERT INTO public.assets (name, asset_type, environment_id, description, exposed)
    VALUES ('Database Producción', 'SERVIDOR', env_prod, 'Base de datos productiva', FALSE)
    RETURNING id INTO asset_db_prod;

    INSERT INTO public.assets (name, asset_type, environment_id, description, exposed)
    VALUES ('Servidor Demo (ASSET_OWNER)', 'SERVIDOR', env_dev,
            'Activo de demostración asignado a owner.demo para el botón de acceso rápido del login', FALSE)
    RETURNING id INTO asset_owner_demo;

    -- ── Componentes de software ──────────────────────────────────────────
    INSERT INTO public.software_components (name, software, ecosystem, version, asset_id, catalogued)
    VALUES ('react', 'react', 'npm', '18.2.0', asset_react, TRUE) RETURNING id INTO comp_react;

    INSERT INTO public.software_components (name, software, ecosystem, version, asset_id, catalogued)
    VALUES ('express', 'express', 'npm', '4.18.2', asset_gateway, TRUE) RETURNING id INTO comp_express;

    INSERT INTO public.software_components (name, software, ecosystem, version, asset_id, catalogued)
    VALUES ('axios', 'axios', 'npm', '1.4.0', asset_qa, TRUE) RETURNING id INTO comp_axios_qa;

    INSERT INTO public.software_components (name, software, ecosystem, version, asset_id, catalogued)
    VALUES ('lodash', 'lodash', 'npm', '4.17.21', asset_qa, TRUE) RETURNING id INTO comp_lodash;

    INSERT INTO public.software_components (name, software, ecosystem, version, asset_id, catalogued)
    VALUES ('spring-boot-starter-web', 'spring-boot-starter-web', 'maven', '3.1.0', asset_backend_prod, TRUE)
    RETURNING id INTO comp_spring;

    INSERT INTO public.software_components (name, software, ecosystem, version, asset_id, catalogued)
    VALUES ('postgres', 'postgres', 'Docker', '15', asset_db_prod, FALSE) RETURNING id INTO comp_postgres;

    INSERT INTO public.software_components (name, software, ecosystem, version, asset_id, catalogued)
    VALUES ('axios', 'axios', 'npm', '1.4.0', asset_owner_demo, TRUE) RETURNING id INTO comp_axios_owner;

    -- ── Scope de ASSET_OWNER ─────────────────────────────────────────────
    INSERT INTO public.user_asset_assignments (user_id, asset_id) VALUES
        (user_owner, asset_qa),
        (user_owner, asset_owner_demo);

    -- ── ScanReports: uno manual, uno automatico ──────────────────────────
    INSERT INTO public.scan_reports
        (started_at, executed_at, status, target_type, target_name, triggered_by, is_automatic_scan,
         total_detected, audited, ignored, criticals, highs, mediums, lows, system_status, report_message)
    VALUES
        (NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours' + INTERVAL '4 minutes', 'COMPLETED',
         'GLOBAL', 'TODOS', user_admin, FALSE,
         6, 6, 0, 2, 2, 1, 1, '⚠️ ACCIÓN REQUERIDA', 'Escaneo manual de referencia (seed)')
    RETURNING id INTO scan_manual;

    INSERT INTO public.scan_reports
        (started_at, executed_at, status, target_type, target_name, triggered_by, is_automatic_scan,
         total_detected, audited, ignored, criticals, highs, mediums, lows, system_status, report_message)
    VALUES
        (CURRENT_DATE + INTERVAL '9 hours', CURRENT_DATE + INTERVAL '9 hours' + INTERVAL '3 minutes', 'COMPLETED',
         'GLOBAL', 'TODOS', NULL, TRUE,
         -- Un escaneo GLOBAL automatico re-detecta TODO lo que sigue abierto, no solo
         -- lo nuevo del dia -- estos agregados ahora coinciden con los 4 hallazgos
         -- reales vinculados a scan_auto mas abajo: CVE-2023-34042 (CRITICAL, riesgo
         -- aceptado), CVE-2024-4317 (CRITICAL, reabierta), CVE-2024-29041 (HIGH,
         -- en analisis, re-detectada) y CVE-2023-45857 (MEDIUM, re-detectada). Antes
         -- decian 4/0/1/2/1 sin relacion real con los hallazgos vinculados (solo 2,
         -- ambos CRITICAL), lo que hacia que los KPIs del tab "Automatico" no
         -- coincidieran con la tabla de abajo ni con "Abiertas" del Dashboard.
         4, 4, 0, 2, 1, 1, 0, '⚠️ ACCIÓN REQUERIDA', 'Escaneo automático diario de referencia (seed)')
    RETURNING id INTO scan_auto;

    UPDATE public.scan_reports
    SET public_code = 'SCN-' || to_char(executed_at, 'YYYY') || '-' || lpad(id::text, 6, '0')
    WHERE id IN (scan_manual, scan_auto) AND public_code IS NULL;

    -- ══════════════════ Vulnerabilidad 1: cierre plano (react) ═══════════
    INSERT INTO public.asset_vulnerabilities
        (software_component_id, cve_id, detection_status, triage_status, priority, cvss, exploited, ghsa_id,
         assigned_to, assigned_to_user_id, first_detected_at, last_detected_at, resolved_at, reopen_count,
         priority_variables, due_date)
    VALUES
        (comp_react, 'CVE-2024-11072', 'RESOLVED', 'RESUELTA', 'MEDIUM', '5.9', FALSE, NULL,
         'fede.frankenberger', user_admin, NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '1 days', 0,
         '{"cvss_score":5.9,"env_criticality":"BAJA","priority_base":"MEDIUM","is_cisa_kev":false,"is_zero_day":false,"priority_final":"MEDIUM"}',
         (NOW() - INTERVAL '8 days') + INTERVAL '30 days')
    RETURNING id INTO av_id;

    INSERT INTO public.vulnerabilities_audit
        (detected_at, asset_id, scan_id, asset_vulnerability_id, cve_id, cvss, exploited, priority, decision,
         assigned_to, status, resolved_at, software, ecosystem, version, priority_variables)
    VALUES
        (NOW() - INTERVAL '8 days', comp_react, scan_manual, av_id, 'CVE-2024-11072', '5.9', FALSE, 'MEDIUM',
         'Actualizado a versión sin el componente afectado', 'fede.frankenberger', 'RESUELTA', NOW() - INTERVAL '1 days',
         'react', 'npm', '18.2.0', '{"cvss_score":5.9,"env_criticality":"BAJA","priority_base":"MEDIUM","is_cisa_kev":false,"is_zero_day":false,"priority_final":"MEDIUM"}');

    INSERT INTO public.remediation_cycles (asset_vulnerability_id, cycle_number, detected_at, closed_at, created_at)
    VALUES (av_id, 1, NOW() - INTERVAL '8 days', NOW() - INTERVAL '1 days', NOW()) RETURNING id INTO cycle_id;

    INSERT INTO public.state_transitions (remediation_cycle_id, from_state, to_state, occurred_at, actor_type, trigger_type)
    VALUES (cycle_id, NULL, 'DETECTADA', NOW() - INTERVAL '8 days', 'ESCANER', 'ESCANEO_N8N');

    INSERT INTO public.state_transitions (remediation_cycle_id, from_state, to_state, occurred_at, actor_id, actor_type, trigger_type, evidence_level)
    VALUES (cycle_id, 'DETECTADA', 'RESUELTA', NOW() - INTERVAL '1 days', user_admin, 'HUMANO', 'KANBAN_MANUAL', 'E0');

    -- ══════════════════ Vulnerabilidad 2: en analisis (express) ══════════
    INSERT INTO public.asset_vulnerabilities
        (software_component_id, cve_id, detection_status, triage_status, priority, cvss, exploited, ghsa_id,
         assigned_to, assigned_to_user_id, first_detected_at, last_detected_at, reopen_count, priority_variables, due_date)
    VALUES
        (comp_express, 'CVE-2024-29041', 'OPEN', 'EN_ANALISIS', 'HIGH', '6.1', FALSE, 'GHSA-rv95-896h-c2vc',
         'analyst.demo', user_analyst, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days', 0,
         '{"cvss_score":6.1,"env_criticality":"BAJA","priority_base":"HIGH","is_cisa_kev":false,"is_zero_day":false,"priority_final":"HIGH"}',
         (NOW() - INTERVAL '6 days') + INTERVAL '7 days')
    RETURNING id INTO av_id;

    INSERT INTO public.vulnerabilities_audit
        (detected_at, asset_id, scan_id, asset_vulnerability_id, cve_id, ghsa_id, cvss, exploited, priority, decision,
         assigned_to, status, software, ecosystem, version, priority_variables)
    VALUES
        (NOW() - INTERVAL '6 days', comp_express, scan_manual, av_id, 'CVE-2024-29041', 'GHSA-rv95-896h-c2vc', '6.1', FALSE, 'HIGH',
         'Evaluando impacto en el gateway interno', 'analyst.demo', 'EN_ANALISIS', 'express', 'npm', '4.18.2',
         '{"cvss_score":6.1,"env_criticality":"BAJA","priority_base":"HIGH","is_cisa_kev":false,"is_zero_day":false,"priority_final":"HIGH"}');

    -- Un scan GLOBAL diario real vuelve a detectar TODO lo que sigue instalado, no solo
    -- lo nuevo -- esta vulnerabilidad sigue OPEN, asi que el automatico de hoy la
    -- re-confirma con su propia fila de auditoria (mismo asset_vulnerability_id, sin
    -- cambio de estado). Sin esto, "Escaneos > Automatico" solo mostraba 2 de las 4
    -- vulnerabilidades abiertas del sistema, aunque el escaneo automatico es GLOBAL.
    INSERT INTO public.vulnerabilities_audit
        (detected_at, asset_id, scan_id, asset_vulnerability_id, cve_id, ghsa_id, cvss, exploited, priority, decision,
         assigned_to, status, software, ecosystem, version, priority_variables)
    VALUES
        (CURRENT_DATE + INTERVAL '9 hours' + INTERVAL '3 minutes', comp_express, scan_auto, av_id, 'CVE-2024-29041', 'GHSA-rv95-896h-c2vc', '6.1', FALSE, 'HIGH',
         'Evaluando impacto en el gateway interno', 'analyst.demo', 'EN_ANALISIS', 'express', 'npm', '4.18.2',
         '{"cvss_score":6.1,"env_criticality":"BAJA","priority_base":"HIGH","is_cisa_kev":false,"is_zero_day":false,"priority_final":"HIGH"}');

    INSERT INTO public.remediation_cycles (asset_vulnerability_id, cycle_number, detected_at, created_at)
    VALUES (av_id, 1, NOW() - INTERVAL '6 days', NOW()) RETURNING id INTO cycle_id;

    INSERT INTO public.state_transitions (remediation_cycle_id, from_state, to_state, occurred_at, actor_type, trigger_type)
    VALUES (cycle_id, NULL, 'DETECTADA', NOW() - INTERVAL '6 days', 'ESCANER', 'ESCANEO_N8N');

    INSERT INTO public.state_transitions (remediation_cycle_id, from_state, to_state, occurred_at, actor_id, actor_type, trigger_type)
    VALUES (cycle_id, 'DETECTADA', 'EN_ANALISIS', NOW() - INTERVAL '5 days', user_analyst, 'HUMANO', 'KANBAN_MANUAL');

    -- ══════════════════ Vulnerabilidad 3: VEX MITIGADA (express) ═════════
    INSERT INTO public.asset_vulnerabilities
        (software_component_id, cve_id, detection_status, triage_status, priority, cvss, exploited, ghsa_id,
         assigned_to, assigned_to_user_id, first_detected_at, last_detected_at, resolved_at, reopen_count,
         outcome, mitigation_control, priority_variables, due_date)
    VALUES
        (comp_express, 'CVE-2022-24999', 'RESOLVED', 'RESUELTA', 'LOW', '3.7', FALSE, 'GHSA-hrpp-h998-j3pp',
         'analyst.demo', user_analyst, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', 0,
         'MITIGADA', 'Se agregó un WAF delante del gateway que bloquea el patrón de payload explotable, mientras se planifica el upgrade de versión.',
         '{"cvss_score":3.7,"env_criticality":"BAJA","priority_base":"LOW","is_cisa_kev":false,"is_zero_day":false,"priority_final":"LOW"}',
         (NOW() - INTERVAL '10 days') + INTERVAL '90 days')
    RETURNING id INTO av_id;

    INSERT INTO public.vulnerabilities_audit
        (detected_at, asset_id, scan_id, asset_vulnerability_id, cve_id, ghsa_id, cvss, exploited, priority, decision,
         assigned_to, status, resolved_at, software, ecosystem, version, priority_variables)
    VALUES
        (NOW() - INTERVAL '10 days', comp_express, scan_manual, av_id, 'CVE-2022-24999', 'GHSA-hrpp-h998-j3pp', '3.7', FALSE, 'LOW',
         'Riesgo bajo, mitigado con WAF', 'analyst.demo', 'RESUELTA', NOW() - INTERVAL '9 days', 'express', 'npm', '4.18.2',
         '{"cvss_score":3.7,"env_criticality":"BAJA","priority_base":"LOW","is_cisa_kev":false,"is_zero_day":false,"priority_final":"LOW"}');

    INSERT INTO public.remediation_cycles (asset_vulnerability_id, cycle_number, detected_at, closed_at, created_at)
    VALUES (av_id, 1, NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', NOW()) RETURNING id INTO cycle_id;

    INSERT INTO public.state_transitions (remediation_cycle_id, from_state, to_state, occurred_at, actor_type, trigger_type)
    VALUES (cycle_id, NULL, 'DETECTADA', NOW() - INTERVAL '10 days', 'ESCANER', 'ESCANEO_N8N');

    INSERT INTO public.state_transitions (remediation_cycle_id, from_state, to_state, occurred_at, actor_id, actor_type, trigger_type, evidence_level, evidence_ref)
    VALUES (cycle_id, 'DETECTADA', 'RESUELTA', NOW() - INTERVAL '9 days', user_analyst, 'HUMANO', 'KANBAN_MANUAL', 'E3', 'Regla WAF #482, revisión de config adjunta en el ticket interno');

    -- ══════════════════ Vulnerabilidad 4: detectada, advisory no revisado (axios QA) ═
    INSERT INTO public.asset_vulnerabilities
        (software_component_id, cve_id, detection_status, triage_status, priority, cvss, exploited, ghsa_id,
         assigned_to, first_detected_at, last_detected_at, reopen_count, advisory_type, vulnerable_version_range,
         priority_variables, due_date)
    VALUES
        (comp_axios_qa, 'CVE-2023-45857', 'OPEN', 'DETECTADA', 'MEDIUM', '6.5', FALSE, 'GHSA-wf5p-g6vw-rhxx',
         'SIN_ASIGNAR', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', 0, 'UNREVIEWED', '>= 0',
         '{"cvss_score":6.5,"env_criticality":"MEDIA","priority_base":"MEDIUM","is_cisa_kev":false,"is_zero_day":false,"priority_final":"MEDIUM"}',
         (NOW() - INTERVAL '2 days') + INTERVAL '30 days')
    RETURNING id INTO av_id;

    INSERT INTO public.vulnerabilities_audit
        (detected_at, asset_id, scan_id, asset_vulnerability_id, cve_id, ghsa_id, cvss, exploited, priority,
         assigned_to, status, software, ecosystem, version, advisory_type, vulnerable_version_range, priority_variables)
    VALUES
        (NOW() - INTERVAL '2 days', comp_axios_qa, scan_manual, av_id, 'CVE-2023-45857', 'GHSA-wf5p-g6vw-rhxx', '6.5', FALSE, 'MEDIUM',
         'SIN_ASIGNAR', 'DETECTADA', 'axios', 'npm', '1.4.0', 'UNREVIEWED', '>= 0',
         '{"cvss_score":6.5,"env_criticality":"MEDIA","priority_base":"MEDIUM","is_cisa_kev":false,"is_zero_day":false,"priority_final":"MEDIUM"}');

    -- Misma logica que la re-deteccion de CVE-2024-29041 mas arriba: sigue OPEN, el
    -- automatico de hoy la re-confirma.
    INSERT INTO public.vulnerabilities_audit
        (detected_at, asset_id, scan_id, asset_vulnerability_id, cve_id, ghsa_id, cvss, exploited, priority,
         assigned_to, status, software, ecosystem, version, advisory_type, vulnerable_version_range, priority_variables)
    VALUES
        (CURRENT_DATE + INTERVAL '9 hours' + INTERVAL '3 minutes', comp_axios_qa, scan_auto, av_id, 'CVE-2023-45857', 'GHSA-wf5p-g6vw-rhxx', '6.5', FALSE, 'MEDIUM',
         'SIN_ASIGNAR', 'DETECTADA', 'axios', 'npm', '1.4.0', 'UNREVIEWED', '>= 0',
         '{"cvss_score":6.5,"env_criticality":"MEDIA","priority_base":"MEDIUM","is_cisa_kev":false,"is_zero_day":false,"priority_final":"MEDIUM"}');

    INSERT INTO public.remediation_cycles (asset_vulnerability_id, cycle_number, detected_at, created_at)
    VALUES (av_id, 1, NOW() - INTERVAL '2 days', NOW()) RETURNING id INTO cycle_id;

    INSERT INTO public.state_transitions (remediation_cycle_id, from_state, to_state, occurred_at, actor_type, trigger_type)
    VALUES (cycle_id, NULL, 'DETECTADA', NOW() - INTERVAL '2 days', 'ESCANER', 'ESCANEO_N8N');

    -- ══════════════════ Vulnerabilidad 5: VEX NO_APLICA (lodash) ═════════
    INSERT INTO public.asset_vulnerabilities
        (software_component_id, cve_id, detection_status, triage_status, priority, cvss, exploited, ghsa_id,
         assigned_to, assigned_to_user_id, first_detected_at, last_detected_at, resolved_at, reopen_count,
         outcome, justification, priority_variables, due_date)
    VALUES
        (comp_lodash, 'CVE-2021-23337', 'RESOLVED', 'RESUELTA', 'LOW', '4.0', FALSE, 'GHSA-35jh-r3h4-6jhm',
         'analyst.demo', user_analyst, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', 0,
         'NO_APLICA', 'La función vulnerable (template compilation) no se invoca en ningún punto de este proyecto -- confirmado por búsqueda estática en el código fuente que la usa.',
         '{"cvss_score":4.0,"env_criticality":"MEDIA","priority_base":"LOW","is_cisa_kev":false,"is_zero_day":false,"priority_final":"LOW"}',
         (NOW() - INTERVAL '5 days') + INTERVAL '90 days')
    RETURNING id INTO av_id;

    INSERT INTO public.vulnerabilities_audit
        (detected_at, asset_id, scan_id, asset_vulnerability_id, cve_id, ghsa_id, cvss, exploited, priority,
         assigned_to, status, resolved_at, software, ecosystem, version, priority_variables)
    VALUES
        (NOW() - INTERVAL '5 days', comp_lodash, scan_manual, av_id, 'CVE-2021-23337', 'GHSA-35jh-r3h4-6jhm', '4.0', FALSE, 'LOW',
         'analyst.demo', 'RESUELTA', NOW() - INTERVAL '4 days', 'lodash', 'npm', '4.17.21',
         '{"cvss_score":4.0,"env_criticality":"MEDIA","priority_base":"LOW","is_cisa_kev":false,"is_zero_day":false,"priority_final":"LOW"}');

    INSERT INTO public.remediation_cycles (asset_vulnerability_id, cycle_number, detected_at, closed_at, created_at)
    VALUES (av_id, 1, NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', NOW()) RETURNING id INTO cycle_id;

    INSERT INTO public.state_transitions (remediation_cycle_id, from_state, to_state, occurred_at, actor_type, trigger_type)
    VALUES (cycle_id, NULL, 'DETECTADA', NOW() - INTERVAL '5 days', 'ESCANER', 'ESCANEO_N8N');

    INSERT INTO public.state_transitions (remediation_cycle_id, from_state, to_state, occurred_at, actor_id, actor_type, trigger_type, evidence_level)
    VALUES (cycle_id, 'DETECTADA', 'RESUELTA', NOW() - INTERVAL '4 days', user_analyst, 'HUMANO', 'KANBAN_MANUAL', 'E1');

    -- ══════════════════ Vulnerabilidad 6: VEX RIESGO_ACEPTADO (spring) ═══
    -- Ejemplo clave del modelo dual: detection_status sigue OPEN (el scanner
    -- la sigue viendo) aunque triage_status ya este en RESUELTA (el analista
    -- acepto el riesgo) -- ver ADR-0004.
    INSERT INTO public.asset_vulnerabilities
        (software_component_id, cve_id, detection_status, triage_status, priority, cvss, exploited, ghsa_id,
         assigned_to, assigned_to_user_id, first_detected_at, last_detected_at, reopen_count,
         outcome, accepted_by, risk_accepted_until, priority_variables, due_date)
    VALUES
        (comp_spring, 'CVE-2023-34042', 'OPEN', 'RESUELTA', 'CRITICAL', '9.8', TRUE, 'GHSA-crjg-3vgr-p9qh',
         'fede.frankenberger', user_admin, NOW() - INTERVAL '20 days', NOW() - INTERVAL '1 days', 0,
         'RIESGO_ACEPTADO', 'fede.frankenberger', NOW() + INTERVAL '180 days',
         '{"cvss_score":9.8,"env_criticality":"CRITICA","priority_base":"CRITICAL","is_cisa_kev":true,"is_zero_day":false,"priority_final":"CRITICAL"}',
         (NOW() - INTERVAL '20 days') + INTERVAL '3 days')
    RETURNING id INTO av_id;

    INSERT INTO public.vulnerabilities_audit
        (detected_at, asset_id, scan_id, asset_vulnerability_id, cve_id, ghsa_id, cvss, exploited, priority,
         assigned_to, status, software, ecosystem, version, priority_variables)
    VALUES
        (NOW() - INTERVAL '1 days', comp_spring, scan_auto, av_id, 'CVE-2023-34042', 'GHSA-crjg-3vgr-p9qh', '9.8', TRUE, 'CRITICAL',
         'fede.frankenberger', 'RESUELTA', 'spring-boot-starter-web', 'maven', '3.1.0',
         '{"cvss_score":9.8,"env_criticality":"CRITICA","priority_base":"CRITICAL","is_cisa_kev":true,"is_zero_day":false,"priority_final":"CRITICAL"}');

    INSERT INTO public.remediation_cycles (asset_vulnerability_id, cycle_number, detected_at, created_at)
    VALUES (av_id, 1, NOW() - INTERVAL '20 days', NOW()) RETURNING id INTO cycle_id;

    INSERT INTO public.state_transitions (remediation_cycle_id, from_state, to_state, occurred_at, actor_type, trigger_type)
    VALUES (cycle_id, NULL, 'DETECTADA', NOW() - INTERVAL '20 days', 'ESCANER', 'ESCANEO_N8N');

    INSERT INTO public.state_transitions (remediation_cycle_id, from_state, to_state, occurred_at, actor_id, actor_type, trigger_type, evidence_level, evidence_ref)
    VALUES (cycle_id, 'DETECTADA', 'RESUELTA', NOW() - INTERVAL '1 days', user_admin, 'HUMANO', 'KANBAN_MANUAL', 'E2',
            'Aceptado por Dirección de Producto -- actualizar la dependencia rompe compatibilidad con un integrador externo, se planifica para el próximo trimestre.');

    -- ══════════════════ Vulnerabilidad 7: VEX MITIGADA (postgres) ════════
    INSERT INTO public.asset_vulnerabilities
        (software_component_id, cve_id, detection_status, triage_status, priority, cvss, exploited, ghsa_id,
         assigned_to, assigned_to_user_id, first_detected_at, last_detected_at, resolved_at, reopen_count,
         outcome, mitigation_control, priority_variables, due_date)
    VALUES
        (comp_postgres, 'CVE-2024-10977', 'RESOLVED', 'RESUELTA', 'HIGH', '8.1', FALSE, 'GHSA-w22j-27h8-4gjq',
         'fede.frankenberger', user_admin, NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', NOW() - INTERVAL '22 days', 0,
         'MITIGADA', 'Se aplicó el parche de seguridad menor del proveedor sin cambiar la versión mayor.',
         '{"cvss_score":8.1,"env_criticality":"CRITICA","priority_base":"HIGH","is_cisa_kev":false,"is_zero_day":false,"priority_final":"HIGH"}',
         (NOW() - INTERVAL '25 days') + INTERVAL '7 days')
    RETURNING id INTO av_id;

    INSERT INTO public.vulnerabilities_audit
        (detected_at, asset_id, scan_id, asset_vulnerability_id, cve_id, ghsa_id, cvss, exploited, priority,
         assigned_to, status, resolved_at, software, ecosystem, version, priority_variables)
    VALUES
        (NOW() - INTERVAL '25 days', comp_postgres, scan_manual, av_id, 'CVE-2024-10977', 'GHSA-w22j-27h8-4gjq', '8.1', FALSE, 'HIGH',
         'fede.frankenberger', 'RESUELTA', NOW() - INTERVAL '22 days', 'postgres', 'Docker', '15',
         '{"cvss_score":8.1,"env_criticality":"CRITICA","priority_base":"HIGH","is_cisa_kev":false,"is_zero_day":false,"priority_final":"HIGH"}');

    INSERT INTO public.remediation_cycles (asset_vulnerability_id, cycle_number, detected_at, closed_at, created_at)
    VALUES (av_id, 1, NOW() - INTERVAL '25 days', NOW() - INTERVAL '22 days', NOW()) RETURNING id INTO cycle_id;

    INSERT INTO public.state_transitions (remediation_cycle_id, from_state, to_state, occurred_at, actor_type, trigger_type)
    VALUES (cycle_id, NULL, 'DETECTADA', NOW() - INTERVAL '25 days', 'ESCANER', 'ESCANEO_N8N');

    INSERT INTO public.state_transitions (remediation_cycle_id, from_state, to_state, occurred_at, actor_id, actor_type, trigger_type, evidence_level)
    VALUES (cycle_id, 'DETECTADA', 'RESUELTA', NOW() - INTERVAL '22 days', user_admin, 'HUMANO', 'KANBAN_MANUAL', 'E2');

    -- ══════════════════ Vulnerabilidad 8: REABIERTA (postgres) ═══════════
    INSERT INTO public.asset_vulnerabilities
        (software_component_id, cve_id, detection_status, triage_status, priority, cvss, exploited,
         assigned_to, first_detected_at, last_detected_at, reopen_count, priority_variables, due_date)
    VALUES
        (comp_postgres, 'CVE-2024-4317', 'OPEN', 'DETECTADA', 'CRITICAL', '7.5', TRUE,
         'SIN_ASIGNAR', NOW() - INTERVAL '15 days', NOW() - INTERVAL '4 days', 1,
         '{"cvss_score":7.5,"env_criticality":"CRITICA","priority_base":"CRITICAL","is_cisa_kev":true,"is_zero_day":false,"priority_final":"CRITICAL"}',
         (NOW() - INTERVAL '4 days') + INTERVAL '3 days')
    RETURNING id INTO av_id;

    INSERT INTO public.vulnerabilities_audit
        (detected_at, asset_id, scan_id, asset_vulnerability_id, cve_id, cvss, exploited, priority,
         assigned_to, status, software, ecosystem, version, priority_variables)
    VALUES
        (NOW() - INTERVAL '15 days', comp_postgres, scan_manual, av_id, 'CVE-2024-4317', '7.5', TRUE, 'CRITICAL',
         'SIN_ASIGNAR', 'RESUELTA', 'postgres', 'Docker', '15',
         '{"cvss_score":7.5,"env_criticality":"CRITICA","priority_base":"CRITICAL","is_cisa_kev":true,"is_zero_day":false,"priority_final":"CRITICAL"}'),
        (NOW() - INTERVAL '4 days', comp_postgres, scan_auto, av_id, 'CVE-2024-4317', '7.5', TRUE, 'CRITICAL',
         'SIN_ASIGNAR', 'DETECTADA', 'postgres', 'Docker', '15',
         '{"cvss_score":7.5,"env_criticality":"CRITICA","priority_base":"CRITICAL","is_cisa_kev":true,"is_zero_day":false,"priority_final":"CRITICAL"}');

    INSERT INTO public.remediation_cycles (asset_vulnerability_id, cycle_number, detected_at, closed_at, created_at)
    VALUES (av_id, 1, NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days', NOW()) RETURNING id INTO cycle_id;

    INSERT INTO public.state_transitions (remediation_cycle_id, from_state, to_state, occurred_at, actor_type, trigger_type)
    VALUES (cycle_id, NULL, 'DETECTADA', NOW() - INTERVAL '15 days', 'ESCANER', 'ESCANEO_N8N');

    INSERT INTO public.state_transitions (remediation_cycle_id, from_state, to_state, occurred_at, actor_id, actor_type, trigger_type, evidence_level)
    VALUES (cycle_id, 'DETECTADA', 'RESUELTA', NOW() - INTERVAL '10 days', user_analyst, 'HUMANO', 'KANBAN_MANUAL', 'E1');

    INSERT INTO public.remediation_cycles (asset_vulnerability_id, cycle_number, detected_at, created_at)
    VALUES (av_id, 2, NOW() - INTERVAL '4 days', NOW()) RETURNING id INTO cycle_id;

    INSERT INTO public.state_transitions (remediation_cycle_id, from_state, to_state, occurred_at, actor_type, trigger_type)
    VALUES (cycle_id, 'RESUELTA', 'DETECTADA', NOW() - INTERVAL '4 days', 'ESCANER', 'REAPERTURA_ESCANEO');

    -- ══════════════════ Vulnerabilidad 9: scope de owner.demo (axios) ═════
    INSERT INTO public.asset_vulnerabilities
        (software_component_id, cve_id, detection_status, triage_status, priority, cvss, exploited, ghsa_id,
         assigned_to, first_detected_at, last_detected_at, reopen_count, priority_variables, due_date)
    VALUES
        (comp_axios_owner, 'CVE-2023-45857', 'OPEN', 'DETECTADA', 'MEDIUM', '6.5', FALSE, 'GHSA-wf5p-g6vw-rhxx',
         'SIN_ASIGNAR', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', 0,
         '{"cvss_score":6.5,"env_criticality":"BAJA","priority_base":"MEDIUM","is_cisa_kev":false,"is_zero_day":false,"priority_final":"MEDIUM"}',
         (NOW() - INTERVAL '3 days') + INTERVAL '30 days')
    RETURNING id INTO av_id;

    INSERT INTO public.vulnerabilities_audit
        (detected_at, asset_id, scan_id, asset_vulnerability_id, cve_id, ghsa_id, cvss, exploited, priority,
         assigned_to, status, software, ecosystem, version, priority_variables)
    VALUES
        (NOW() - INTERVAL '3 days', comp_axios_owner, scan_manual, av_id, 'CVE-2023-45857', 'GHSA-wf5p-g6vw-rhxx', '6.5', FALSE, 'MEDIUM',
         'SIN_ASIGNAR', 'DETECTADA', 'axios', 'npm', '1.4.0',
         '{"cvss_score":6.5,"env_criticality":"BAJA","priority_base":"MEDIUM","is_cisa_kev":false,"is_zero_day":false,"priority_final":"MEDIUM"}');

    INSERT INTO public.remediation_cycles (asset_vulnerability_id, cycle_number, detected_at, created_at)
    VALUES (av_id, 1, NOW() - INTERVAL '3 days', NOW()) RETURNING id INTO cycle_id;

    INSERT INTO public.state_transitions (remediation_cycle_id, from_state, to_state, occurred_at, actor_type, trigger_type)
    VALUES (cycle_id, NULL, 'DETECTADA', NOW() - INTERVAL '3 days', 'ESCANER', 'ESCANEO_N8N');

END $$;
