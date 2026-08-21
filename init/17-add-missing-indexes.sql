-- DB-04 (docs/20-08-26/AUDITORIA_END_TO_END.md): Postgres NO indexa automaticamente las
-- columnas FK -- cada JOIN/filtro sobre estas columnas hacia un seq scan completo de la
-- tabla referenciada. Imperceptible con el volumen actual (decenas/cientos de filas), pero
-- degrada linealmente a medida que crece el inventario/historial de escaneos.
--
-- software_components.asset_id NO se indexa acá aparte: ya queda cubierto como prefijo
-- izquierdo del UNIQUE INDEX unique_component_per_asset (asset_id, software, ecosystem,
-- version) creado en init/16.

-- scan_reports: filtros de ScanReportRepository.search()/findFirstBy...OrderByExecutedAtDesc
CREATE INDEX IF NOT EXISTS idx_scan_reports_target_name ON public.scan_reports (target_name);
CREATE INDEX IF NOT EXISTS idx_scan_reports_status ON public.scan_reports (status);
CREATE INDEX IF NOT EXISTS idx_scan_reports_executed_at ON public.scan_reports (executed_at);
CREATE INDEX IF NOT EXISTS idx_scan_reports_triggered_by ON public.scan_reports (triggered_by);
CREATE INDEX IF NOT EXISTS idx_scan_reports_software_component_id ON public.scan_reports (software_component_id);
CREATE INDEX IF NOT EXISTS idx_scan_reports_environment_id ON public.scan_reports (environment_id);
CREATE INDEX IF NOT EXISTS idx_scan_reports_asset_id ON public.scan_reports (asset_id);

-- software_components: filtro directo del catálogo/autocomplete
CREATE INDEX IF NOT EXISTS idx_software_components_ecosystem ON public.software_components (ecosystem);

-- assets: JOIN hacia environments (dashboard, reportes, scope por entorno)
CREATE INDEX IF NOT EXISTS idx_assets_environment_id ON public.assets (environment_id);

-- vulnerabilities_audit: JOIN hacia software_components (findByAsset_Id / applyLifecycle),
-- scan_reports (findByScanReport_Id) y asset_vulnerabilities (findByAssetVulnerability_Id)
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_audit_asset_id ON public.vulnerabilities_audit (asset_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_audit_scan_id ON public.vulnerabilities_audit (scan_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_audit_asset_vulnerability_id ON public.vulnerabilities_audit (asset_vulnerability_id);

-- asset_vulnerabilities: JOIN hacia software_components (Kanban, dashboard, scope)
CREATE INDEX IF NOT EXISTS idx_asset_vulnerabilities_software_component_id ON public.asset_vulnerabilities (software_component_id);

-- user_asset_assignments: JOIN hacia users y assets (scope de ASSET_OWNER, chequeado en casi
-- todas las requests de un usuario con ese rol)
CREATE INDEX IF NOT EXISTS idx_user_asset_assignments_user_id ON public.user_asset_assignments (user_id);
CREATE INDEX IF NOT EXISTS idx_user_asset_assignments_asset_id ON public.user_asset_assignments (asset_id);
