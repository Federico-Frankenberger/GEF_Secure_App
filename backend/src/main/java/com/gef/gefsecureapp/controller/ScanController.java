package com.gef.gefsecureapp.controller;

import com.gef.gefsecureapp.dto.ScanReportDTO;
import com.gef.gefsecureapp.repository.ScanReportRepository;
import com.gef.gefsecureapp.service.N8nWebhookService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Scan", description = "Disparo y seguimiento de escaneos globales")
public class ScanController {

    private final N8nWebhookService webhookService;
    private final ScanReportRepository scanReportRepository;

    @PostMapping("/scan")
    @Operation(summary = "Disparar escaneo global (todos los entornos, todos los activos) vía n8n")
    public ResponseEntity<Void> triggerGlobalScan() {
        webhookService.triggerGlobalScan();
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
}
