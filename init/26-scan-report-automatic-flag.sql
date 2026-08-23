-- ==========================================================
-- GEF SECURE - MARCA EXPLICITA DE ESCANEO AUTOMATICO
-- ==========================================================
-- triggered_by IS NULL no alcanza como marca de "vino del scheduler de n8n":
-- se encontraron filas viejas de scan_reports con triggered_by NULL que no
-- son automaticas (datos de prueba/seed con ese campo sin completar), y
-- ScanReportRepository.findLatestAutomatic() las confundia con el ultimo
-- escaneo automatico real. Se agrega una columna explicita en vez de seguir
-- infiriendo el origen.
-- Igual que init/03 en adelante, este script solo corre en un volumen de
-- Postgres nuevo. Para la base de desarrollo ya existente hay que aplicarlo
-- a mano (ver README de despliegue).
-- ==========================================================

ALTER TABLE public.scan_reports
    ADD COLUMN IF NOT EXISTS is_automatic_scan BOOLEAN NOT NULL DEFAULT FALSE;
