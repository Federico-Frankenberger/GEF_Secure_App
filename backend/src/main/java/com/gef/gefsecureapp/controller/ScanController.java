package com.gef.gefsecureapp.controller;

import com.gef.gefsecureapp.dto.ScanComparisonDTO;
import com.gef.gefsecureapp.dto.ScanReportDTO;
import com.gef.gefsecureapp.dto.VulnerabilityAuditDTO;
import com.gef.gefsecureapp.model.ScanReport;
import com.gef.gefsecureapp.repository.ScanReportRepository;
import com.gef.gefsecureapp.security.CurrentUser;
import com.gef.gefsecureapp.service.N8nWebhookService;
import com.gef.gefsecureapp.service.ScanService;
import com.gef.gefsecureapp.service.UserAssetAssignmentService;
import com.gef.gefsecureapp.service.VulnerabilityAuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Scan", description = "Disparo y seguimiento de escaneos globales")
public class ScanController {

    private final N8nWebhookService webhookService;
    private final ScanReportRepository scanReportRepository;
    private final VulnerabilityAuditService vulnerabilityAuditService;
    private final ScanService scanService;
    private final UserAssetAssignmentService userAssetAssignmentService;

    @PostMapping("/scan")
    @PreAuthorize("hasAnyRole('ADMIN','SECURITY_ANALYST')")
    @Operation(summary = "Disparar escaneo global (todos los entornos, todos los activos) vía n8n")
    public ResponseEntity<Void> triggerGlobalScan() {
        ScanReport scan = scanService.start("GLOBAL", "TODOS", null, null, null);
        webhookService.triggerGlobalScan(scan.getId());
        return ResponseEntity.accepted().build();
    }

    @GetMapping("/scan-reports/latest")
    @Operation(summary = "Último reporte de scan para un alcance (activo/entorno/global)")
    public ResponseEntity<ScanReportDTO> latestReport(
            @RequestParam String targetType,
            @RequestParam String targetName) {
        return scanReportRepository
                .findFirstByTargetTypeAndTargetNameOrderByExecutedAtDesc(targetType, targetName)
                .filter(this::isInScope)
                .map(ScanReportDTO::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/scan-reports/latest-automatic")
    @Operation(summary = "Último escaneo automático diario (Scan_Scheduler de n8n; triggered_by IS NULL)")
    public ResponseEntity<ScanReportDTO> latestAutomaticReport() {
        return scanReportRepository.findLatestAutomatic()
                .filter(this::isInScope)
                .map(ScanReportDTO::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @GetMapping("/scan-reports")
    @Operation(summary = "Historial de escaneos paginado, con filtros opcionales por tipo/objetivo/código/rango de fecha")
    public ResponseEntity<Page<ScanReportDTO>> history(
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) String targetName,
            @RequestParam(required = false) String publicCode,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        PageRequest pageable = PageRequest.of(page, size);
        Page<ScanReport> result;
        if (CurrentUser.isAssetOwner()) {
            Set<Long> scope = userAssetAssignmentService.assignedAssetIds(CurrentUser.get().id());
            result = scope.isEmpty()
                    ? Page.empty(pageable)
                    : scanReportRepository.searchInScope(targetType, targetName, publicCode, from, to, scope, pageable);
        } else {
            result = scanReportRepository.search(targetType, targetName, publicCode, from, to, pageable);
        }
        return ResponseEntity.ok(result.map(ScanReportDTO::from));
    }

    // A1 (2ª auditoría, docs/20-08-26/AUDITORIA_END_TO_END_2.md): ninguno de los dos endpoints
    // de arriba aplicaba scope -- un ASSET_OWNER veia la metadata (conteos de severidad
    // incluidos) de los escaneos de toda la organizacion, mismo tipo de fuga ya cerrada en
    // Dashboard/Informes/Webhooks. Un escaneo ENTORNO/GLOBAL (sin un unico activo resoluble)
    // queda fuera de scope por diseno, igual que en ReportPdfService.assertScanInScope.
    // resolveAssetId() (no scan.getSoftwareComponent().getAsset()) para no atravesar una
    // relacion LAZY sin sesion de Hibernate abierta -- este controller no es @Transactional.
    private boolean isInScope(ScanReport scan) {
        if (!CurrentUser.isAssetOwner()) return true;
        Set<Long> scope = userAssetAssignmentService.assignedAssetIds(CurrentUser.get().id());
        Long relevantAssetId = scanReportRepository.resolveAssetId(scan.getId());
        return relevantAssetId != null && scope.contains(relevantAssetId);
    }

    @GetMapping("/scan-reports/{id}/vulnerabilities")
    @Operation(summary = "Vulnerabilidades encontradas por un escaneo del historial (click en una fila puntual)")
    public ResponseEntity<List<VulnerabilityAuditDTO.Response>> reportVulnerabilities(@PathVariable Long id) {
        return ResponseEntity.ok(vulnerabilityAuditService.findByScanReport(id));
    }

    @GetMapping("/scan-reports/{id}/compare/{otherId}")
    @Operation(summary = "Comparar dos escaneos del historial: nuevas, persistentes, resueltas y cambios de severidad")
    public ResponseEntity<ScanComparisonDTO> compare(@PathVariable Long id, @PathVariable Long otherId) {
        return ResponseEntity.ok(vulnerabilityAuditService.compareScans(id, otherId));
    }
}
