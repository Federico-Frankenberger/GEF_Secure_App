-- ==========================================================
-- GEF SECURE - SEED ENRIQUECIDO (post-tracking de remediacion)
-- ==========================================================
-- init/02-seed-data.sql sigue intacto a proposito: corre justo despues de
-- init/01, cuando "assets" todavia es el modelo plano viejo (pre-split de
-- init/04) y ninguna de las tablas de este script existe todavia
-- (asset_vulnerabilities nace en init/09, remediation_cycles/state_transitions
-- en init/19). Reescribir init/02 para que ya use el esquema de hoy rompería
-- la secuencia real de migraciones para cualquiera que instale desde cero
-- (y contradice el criterio ya aplicado en el resto de init/: "no se edita
-- una migracion que ya corrio", ver comentario de init/15).
--
-- Este script corre al final (despues de init/26, con todas las columnas ya
-- creadas) y agrega un dataset ADITIVO que muestra las features actuales que
-- init/02+07 no pueden mostrar por ser anteriores a ellas: RBAC de 4 roles
-- (ya cubierto por 02+07, no se repite), modelo dual detection/triage status,
-- VEX (los 3 outcomes), escala de evidencia E0-E6, remediation_cycles con una
-- reapertura real, y un ScanReport de cada origen (manual + automatico) para
-- que la seccion "Escaneo Automatico" tenga datos desde el primer arranque.
--
-- Para una base YA EXISTENTE (no un volumen nuevo): usar
-- init/scratch_apply_seed.sql, que hace el TRUNCATE de las tablas
-- transaccionales y aplica este mismo dataset.
-- ==========================================================

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
    asset_backend_prod BIGINT;
    asset_db_prod BIGINT;
    asset_owner_demo BIGINT;

    comp_react BIGINT;
    comp_express BIGINT;
    comp_lodash BIGINT;
    comp_spring BIGINT;
    comp_postgres BIGINT;
    comp_axios_owner BIGINT;

    scan_manual BIGINT;
    scan_auto BIGINT;

    av_id BIGINT;
    cycle_id BIGINT;
    vuln_id BIGINT;
BEGIN
    -- ── Entornos (mismos 3 que init/02, referenciados por nombre) ──────────
    SELECT id INTO env_dev  FROM public.environments WHERE name = 'Desarrollo';
    SELECT id INTO env_test FROM public.environments WHERE name = 'Testing';
    SELECT id INTO env_prod FROM public.environments WHERE name = 'Producción';

    -- ── Usuarios (mismos usernames que init/02+07 -- README los referencia) ─
    SELECT id INTO user_admin   FROM public.users WHERE username = 'fede.frankenberger';
    SELECT id INTO user_analyst FROM public.users WHERE username = 'analyst.demo';
    SELECT id INTO user_owner   FROM public.users WHERE username = 'owner.demo';
    SELECT id INTO user_auditor FROM public.users WHERE username = 'auditor.demo';

    -- ── Activos: se REUTILIZAN los que init/02+07 ya crearon (post-split
    -- init/04), no se crean paralelos -- init/02 ya sembró 'React App' y
    -- 'Express API Gateway' en Desarrollo; insertarlos de nuevo con el mismo
    -- nombre en el mismo entorno viola unique_active_asset_name_per_environment
    -- (init/08). Verificado corriendo este script contra un volumen nuevo real.
    -- Nota tambien verificada en vivo: 'Axios HTTP Client' NO sobrevive como
    -- activo propio tras el split de init/04 -- su unico componente 'axios'
    -- queda huerfano (asset_id NULL) hasta que init/07 lo reapunta directo a
    -- 'Servidor Demo (ASSET_OWNER)'. Por eso no hay un activo "QA" con axios:
    -- ese componente ya vive en Servidor Demo (ver comp_axios_owner).
    SELECT id INTO asset_react       FROM public.assets WHERE name = 'React App';
    SELECT id INTO asset_gateway     FROM public.assets WHERE name = 'Express API Gateway';
    SELECT id INTO asset_backend_prod FROM public.assets WHERE name = 'Spring Boot Backend';
    SELECT id INTO asset_db_prod     FROM public.assets WHERE name = 'PostgreSQL Database';
    SELECT id INTO asset_owner_demo  FROM public.assets WHERE name = 'Servidor Demo (ASSET_OWNER)';

    -- ── Componentes de software: se reutilizan los que ya existen sobre esos
    -- activos (mismo motivo: unique_component_per_asset de init/16 rompería
    -- si insertáramos react/express/axios/lodash/spring/postgres de nuevo
    -- sobre el mismo activo). 'lodash' vive en el activo 'Lodash Utils'
    -- (Testing), un activo aparte del de axios en el seed original.
    SELECT id INTO comp_react   FROM public.software_components WHERE asset_id = asset_react   AND software = 'react';
    SELECT id INTO comp_express FROM public.software_components WHERE asset_id = asset_gateway AND software = 'express';
    SELECT sc.id INTO comp_lodash FROM public.software_components sc
        JOIN public.assets a ON a.id = sc.asset_id
        WHERE a.name = 'Lodash Utils' AND sc.software = 'lodash';
    SELECT id INTO comp_spring  FROM public.software_components WHERE asset_id = asset_backend_prod AND software = 'spring-boot-starter-web';
    SELECT id INTO comp_postgres FROM public.software_components WHERE asset_id = asset_db_prod AND software = 'postgres';
    -- El axios de owner.demo es el MISMO componente que init/07 ya reasignó.
    SELECT id INTO comp_axios_owner FROM public.software_components WHERE asset_id = asset_owner_demo AND software = 'axios';

    -- El scope de owner.demo sobre 'Servidor Demo (ASSET_OWNER)' ya lo dejó
    -- armado init/07 -- no hace falta repetirlo acá.

    -- ── ScanReports: uno manual, uno automatico (para /escaneo-automatico) ──
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
         -- lo nuevo del dia -- estos agregados coinciden con los 4 hallazgos reales
         -- vinculados a scan_auto mas abajo: CVE-2023-34042 (CRITICAL), CVE-2024-4317
         -- (CRITICAL, reabierta), CVE-2024-29041 (HIGH, re-detectada) y CVE-2023-45857
         -- (MEDIUM, re-detectada). Antes decian 4/0/1/2/1 sin relacion real con los
         -- hallazgos vinculados (solo 2, ambos CRITICAL).
         4, 4, 0, 2, 1, 1, 0, '⚠️ ACCIÓN REQUERIDA', 'Escaneo automático diario de referencia (seed)')
    RETURNING id INTO scan_auto;

    UPDATE public.scan_reports
    SET public_code = 'SCN-' || to_char(executed_at, 'YYYY') || '-' || lpad(id::text, 6, '0')
    WHERE id IN (scan_manual, scan_auto) AND public_code IS NULL;

    -- ══════════════════════════════════════════════════════════════════════
    -- Vulnerabilidad 1: react/CVE-2024-11072 -- cierre plano (outcome NULL,
    -- comportamiento previo a VEX), detection_status ya RESOLVED.
    -- ══════════════════════════════════════════════════════════════════════
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

    -- ══════════════════════════════════════════════════════════════════════
    -- Vulnerabilidad 2: express/CVE-2024-29041 -- en analisis (abierta).
    -- ══════════════════════════════════════════════════════════════════════
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
    -- cambio de estado).
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

    -- ══════════════════════════════════════════════════════════════════════
    -- Vulnerabilidad 3: express/CVE-2022-24999 -- VEX MITIGADA.
    -- ══════════════════════════════════════════════════════════════════════
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

    -- ══════════════════════════════════════════════════════════════════════
    -- Vulnerabilidad 4: lodash/CVE-2021-23337 -- VEX NO_APLICA.
    -- ══════════════════════════════════════════════════════════════════════
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

    -- ══════════════════════════════════════════════════════════════════════
    -- Vulnerabilidad 5: spring-boot-starter-web/CVE-2023-34042 -- VEX
    -- RIESGO_ACEPTADO. Ejemplo clave del modelo dual: el scanner la sigue
    -- viendo (detection_status=OPEN) aunque el analista ya la cerro en el
    -- Kanban (triage_status=RESUELTA) porque el riesgo fue aceptado, no
    -- corregido -- justo la situacion que el modelo dual esta pensado para
    -- representar (ver ADR-0004).
    -- ══════════════════════════════════════════════════════════════════════
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

    -- ══════════════════════════════════════════════════════════════════════
    -- Vulnerabilidad 6: postgres/CVE-2024-10977 -- VEX MITIGADA.
    -- ══════════════════════════════════════════════════════════════════════
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

    -- ══════════════════════════════════════════════════════════════════════
    -- Vulnerabilidad 7: postgres/CVE-2024-4317 -- REABIERTA (reopen_count=1).
    -- Se resolvió una vez, el scanner volvió a detectarla despues -- applyLifecycle
    -- fuerza triage_status de vuelta a DETECTADA en la reapertura (nunca queda en
    -- un estado "intermedio" elegido por el analista), ver nota de clase de
    -- AssetVulnerability.
    -- ══════════════════════════════════════════════════════════════════════
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

    -- Ciclo 1: detectada -> resuelta (en revisión de infraestructura).
    INSERT INTO public.remediation_cycles (asset_vulnerability_id, cycle_number, detected_at, closed_at, created_at)
    VALUES (av_id, 1, NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days', NOW()) RETURNING id INTO cycle_id;

    INSERT INTO public.state_transitions (remediation_cycle_id, from_state, to_state, occurred_at, actor_type, trigger_type)
    VALUES (cycle_id, NULL, 'DETECTADA', NOW() - INTERVAL '15 days', 'ESCANER', 'ESCANEO_N8N');

    INSERT INTO public.state_transitions (remediation_cycle_id, from_state, to_state, occurred_at, actor_id, actor_type, trigger_type, evidence_level)
    VALUES (cycle_id, 'DETECTADA', 'RESUELTA', NOW() - INTERVAL '10 days', user_analyst, 'HUMANO', 'KANBAN_MANUAL', 'E1');

    -- Ciclo 2: reaparece 4 dias atras -- nuevo ciclo, triage forzado a DETECTADA.
    INSERT INTO public.remediation_cycles (asset_vulnerability_id, cycle_number, detected_at, created_at)
    VALUES (av_id, 2, NOW() - INTERVAL '4 days', NOW()) RETURNING id INTO cycle_id;

    INSERT INTO public.state_transitions (remediation_cycle_id, from_state, to_state, occurred_at, actor_type, trigger_type)
    VALUES (cycle_id, 'RESUELTA', 'DETECTADA', NOW() - INTERVAL '4 days', 'ESCANER', 'REAPERTURA_ESCANEO');

    -- ══════════════════════════════════════════════════════════════════════
    -- Vulnerabilidad 8: axios(owner.demo)/CVE-2023-45857 -- detectada, advisory
    -- no revisado. Es el unico componente axios que sobrevive en el seed (ver
    -- nota mas arriba); tambien es el caso real que ve el boton de acceso
    -- rapido de ASSET_OWNER.
    -- ══════════════════════════════════════════════════════════════════════
    INSERT INTO public.asset_vulnerabilities
        (software_component_id, cve_id, detection_status, triage_status, priority, cvss, exploited, ghsa_id,
         assigned_to, first_detected_at, last_detected_at, reopen_count, advisory_type, vulnerable_version_range,
         priority_variables, due_date)
    VALUES
        (comp_axios_owner, 'CVE-2023-45857', 'OPEN', 'DETECTADA', 'MEDIUM', '6.5', FALSE, 'GHSA-wf5p-g6vw-rhxx',
         'SIN_ASIGNAR', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', 0, 'UNREVIEWED', '>= 0',
         '{"cvss_score":6.5,"env_criticality":"BAJA","priority_base":"MEDIUM","is_cisa_kev":false,"is_zero_day":false,"priority_final":"MEDIUM"}',
         (NOW() - INTERVAL '3 days') + INTERVAL '30 days')
    RETURNING id INTO av_id;

    INSERT INTO public.vulnerabilities_audit
        (detected_at, asset_id, scan_id, asset_vulnerability_id, cve_id, ghsa_id, cvss, exploited, priority,
         assigned_to, status, software, ecosystem, version, advisory_type, vulnerable_version_range, priority_variables)
    VALUES
        (NOW() - INTERVAL '3 days', comp_axios_owner, scan_manual, av_id, 'CVE-2023-45857', 'GHSA-wf5p-g6vw-rhxx', '6.5', FALSE, 'MEDIUM',
         'SIN_ASIGNAR', 'DETECTADA', 'axios', 'npm', '1.4.0', 'UNREVIEWED', '>= 0',
         '{"cvss_score":6.5,"env_criticality":"BAJA","priority_base":"MEDIUM","is_cisa_kev":false,"is_zero_day":false,"priority_final":"MEDIUM"}');

    -- Misma logica que la re-deteccion de CVE-2024-29041 mas arriba: sigue OPEN, el
    -- automatico de hoy la re-confirma.
    INSERT INTO public.vulnerabilities_audit
        (detected_at, asset_id, scan_id, asset_vulnerability_id, cve_id, ghsa_id, cvss, exploited, priority,
         assigned_to, status, software, ecosystem, version, advisory_type, vulnerable_version_range, priority_variables)
    VALUES
        (CURRENT_DATE + INTERVAL '9 hours' + INTERVAL '3 minutes', comp_axios_owner, scan_auto, av_id, 'CVE-2023-45857', 'GHSA-wf5p-g6vw-rhxx', '6.5', FALSE, 'MEDIUM',
         'SIN_ASIGNAR', 'DETECTADA', 'axios', 'npm', '1.4.0', 'UNREVIEWED', '>= 0',
         '{"cvss_score":6.5,"env_criticality":"BAJA","priority_base":"MEDIUM","is_cisa_kev":false,"is_zero_day":false,"priority_final":"MEDIUM"}');

    INSERT INTO public.remediation_cycles (asset_vulnerability_id, cycle_number, detected_at, created_at)
    VALUES (av_id, 1, NOW() - INTERVAL '3 days', NOW()) RETURNING id INTO cycle_id;

    INSERT INTO public.state_transitions (remediation_cycle_id, from_state, to_state, occurred_at, actor_type, trigger_type)
    VALUES (cycle_id, NULL, 'DETECTADA', NOW() - INTERVAL '3 days', 'ESCANER', 'ESCANEO_N8N');

END $$;
