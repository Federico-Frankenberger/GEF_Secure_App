-- ==========================================================
-- GEF SECURE - DATOS SEMILLA (DEMO)
-- ==========================================================
-- Se ejecuta automaticamente junto con 00/01 via el mecanismo
-- docker-entrypoint-initdb.d de la imagen postgres:15 -- solo
-- corre en un volumen de datos nuevo, igual que los anteriores.
-- Objetivo: que el Dashboard, el Inventario y el Kanban tengan
-- datos representativos desde el primer "docker compose up -d",
-- incluyendo vulnerabilidades ya RESUELTA para que el calculo
-- de MTTR tenga con que trabajar desde el arranque.
-- ==========================================================

-- 1. ENTORNOS
INSERT INTO public.environments (name, business_criticality, description) VALUES
    ('Desarrollo', 'BAJA',   'Entorno de desarrollo interno, sin datos productivos'),
    ('Testing',    'MEDIA',  'Entorno de QA / staging previo a producción'),
    ('Producción', 'CRITICA','Entorno productivo expuesto a usuarios finales');

-- 2. ACTIVOS
INSERT INTO public.assets (name, software, ecosystem, version, environment_id, description, last_scan) VALUES
    ('React App', 'react', 'npm', '18.2.0',
        (SELECT id FROM public.environments WHERE name = 'Desarrollo'),
        'Frontend SPA del panel de gestión', NOW() - INTERVAL '2 days'),
    ('Express API Gateway', 'express', 'npm', '4.18.2',
        (SELECT id FROM public.environments WHERE name = 'Desarrollo'),
        'Gateway interno de pruebas', NOW() - INTERVAL '4 days'),
    ('Axios HTTP Client', 'axios', 'npm', '1.4.0',
        (SELECT id FROM public.environments WHERE name = 'Testing'),
        'Cliente HTTP usado por el frontend de QA', NOW() - INTERVAL '1 days'),
    ('Lodash Utils', 'lodash', 'npm', '4.17.21',
        (SELECT id FROM public.environments WHERE name = 'Testing'),
        'Librería de utilidades compartida', NOW() - INTERVAL '6 days'),
    ('Spring Boot Backend', 'spring-boot-starter-web', 'Maven', '3.1.0',
        (SELECT id FROM public.environments WHERE name = 'Producción'),
        'API principal de GEF Secure en producción', NOW() - INTERVAL '1 days'),
    ('PostgreSQL Database', 'postgres', 'Docker', '15',
        (SELECT id FROM public.environments WHERE name = 'Producción'),
        'Base de datos productiva', NOW() - INTERVAL '3 days');

-- 3. USUARIOS (para asignación en Kanban)
INSERT INTO public.users (username, full_name, email, role) VALUES
    ('fede.frankenberger', 'Federico Frankenberger', 'fede@gef-secure.local', 'ADMIN'),
    ('auditor.demo',        'Auditor Demo',           'auditor@gef-secure.local', 'AUDITOR');

-- 4. VULNERABILIDADES (mezcla de estados; las RESUELTA con resolved_at
--    seteado para que avg(resolved_at - detected_at) tenga datos reales)
INSERT INTO public.vulnerabilities_audit
    (asset_id, cve_id, ghsa_id, cvss, exploited, priority, decision, assigned_to, status, detected_at, resolved_at)
VALUES
    ((SELECT id FROM public.assets WHERE software = 'spring-boot-starter-web'),
        'CVE-2023-34042', 'GHSA-crjg-3vgr-p9qh', '9.8', TRUE, 'CRITICAL',
        'Actualizado a la versión parcheada 3.1.5', 'fede.frankenberger', 'RESUELTA',
        NOW() - INTERVAL '20 days', NOW() - INTERVAL '15 days'),

    ((SELECT id FROM public.assets WHERE software = 'postgres'),
        'CVE-2024-10977', 'GHSA-w22j-27h8-4gjq', '8.1', FALSE, 'HIGH',
        'Aplicado parche de seguridad del proveedor', 'fede.frankenberger', 'RESUELTA',
        NOW() - INTERVAL '25 days', NOW() - INTERVAL '22 days'),

    ((SELECT id FROM public.assets WHERE software = 'postgres'),
        'CVE-2024-4317', NULL, '7.5', TRUE, 'CRITICAL',
        'En revisión por el equipo de infraestructura', 'fede.frankenberger', 'EN_ANALISIS',
        NOW() - INTERVAL '4 days', NULL),

    ((SELECT id FROM public.assets WHERE software = 'spring-boot-starter-web'),
        'CVE-2023-20873', 'GHSA-cmhx-cq75-c74m', '5.3', FALSE, 'MEDIUM',
        NULL, 'SIN_ASIGNAR', 'DETECTADA',
        NOW() - INTERVAL '1 days', NULL),

    ((SELECT id FROM public.assets WHERE software = 'express'),
        'CVE-2024-29041', 'GHSA-rv95-896h-c2vc', '6.1', FALSE, 'HIGH',
        'Evaluando impacto en el gateway interno', 'auditor.demo', 'EN_ANALISIS',
        NOW() - INTERVAL '6 days', NULL),

    ((SELECT id FROM public.assets WHERE software = 'express'),
        'CVE-2022-24999', 'GHSA-hrpp-h998-j3pp', '3.7', FALSE, 'LOW',
        'Riesgo bajo, corregido en el próximo build', 'auditor.demo', 'RESUELTA',
        NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days'),

    ((SELECT id FROM public.assets WHERE software = 'axios'),
        'CVE-2023-45857', 'GHSA-wf5p-g6vw-rhxx', '6.5', FALSE, 'MEDIUM',
        NULL, 'SIN_ASIGNAR', 'DETECTADA',
        NOW() - INTERVAL '2 days', NULL),

    ((SELECT id FROM public.assets WHERE software = 'lodash'),
        'CVE-2021-23337', 'GHSA-35jh-r3h4-6jhm', '4.0', FALSE, 'LOW',
        NULL, 'SIN_ASIGNAR', 'DETECTADA',
        NOW() - INTERVAL '5 days', NULL),

    ((SELECT id FROM public.assets WHERE software = 'react'),
        'CVE-2024-11072', NULL, '5.9', FALSE, 'MEDIUM',
        'Actualizado a versión sin el componente afectado', 'fede.frankenberger', 'RESUELTA',
        NOW() - INTERVAL '8 days', NOW() - INTERVAL '1 days');
