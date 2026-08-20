package com.gef.gefsecureapp.controller;

import com.gef.gefsecureapp.dto.ScanComparisonDTO;
import com.gef.gefsecureapp.dto.ScanReportDTO;
import com.gef.gefsecureapp.dto.VulnerabilityAuditDTO;
import com.gef.gefsecureapp.model.ScanReport;
import com.gef.gefsecureapp.repository.ScanReportRepository;
import com.gef.gefsecureapp.service.N8nWebhookService;
import com.gef.gefsecureapp.service.ScanService;
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

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Scan", description = "Disparo y seguimiento de escaneos globales")
public class ScanController {

    private final N8nWebhookService webhookService;
    private final ScanReportRepository scanReportRepository;
    private final VulnerabilityAuditService vulnerabilityAuditService;
    private final ScanService scanService;

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
        Page<ScanReport> result = scanReportRepository.search(targetType, targetName, publicCode, from, to, PageRequest.of(page, size));
        return ResponseEntity.ok(result.map(ScanReportDTO::from));
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
