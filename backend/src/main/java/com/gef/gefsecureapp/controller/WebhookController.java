package com.gef.gefsecureapp.controller;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.gef.gefsecureapp.dto.VulnerabilityAuditDTO;
import com.gef.gefsecureapp.model.ScanReport;
import com.gef.gefsecureapp.model.SystemError;
import com.gef.gefsecureapp.repository.ScanReportRepository;
import com.gef.gefsecureapp.repository.SystemErrorRepository;
import com.gef.gefsecureapp.service.VulnerabilityAuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/webhook")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Webhook n8n", description = "Endpoints para recibir datos de n8n")
public class WebhookController {

    private final VulnerabilityAuditService vulnService;
    private final ScanReportRepository scanReportRepository;
    private final SystemErrorRepository systemErrorRepository;

    @PostMapping("/vulnerabilities")
    @Operation(summary = "Recibir vulnerabilidades en batch desde n8n")
    public ResponseEntity<Void> receiveVulnerabilities(
            @RequestBody List<VulnerabilityAuditDTO.Request> vulns) {
        log.info("Webhook: recibidas {} vulnerabilidades de n8n", vulns.size());
        vulns.forEach(vulnService::create);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/scan-report")
    @Operation(summary = "Recibir reporte de escaneo desde n8n")
    public ResponseEntity<Void> receiveScanReport(@RequestBody ScanReportPayload payload) {
        ScanReport report = ScanReport.builder()
                .executedAt(LocalDateTime.now())
                .totalDetected(payload.totalDetected)
                .audited(payload.audited)
                .ignored(payload.ignored)
                .criticals(payload.criticals)
                .highs(payload.highs)
                .mediums(payload.mediums)
                .lows(payload.lows)
                .systemStatus(payload.systemStatus)
                .reportMessage(payload.reportMessage)
                .environmentBreakdown(payload.environmentBreakdown)
                .targetType(payload.targetType)
                .targetName(payload.targetName)
                .build();
        scanReportRepository.save(report);
        log.info("Scan report guardado: total={}", payload.totalDetected);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/error")
    @Operation(summary = "Recibir error de workflow desde n8n")
    public ResponseEntity<Void> receiveError(@RequestBody ErrorPayload payload) {
        SystemError error = SystemError.builder()
                .errorDate(LocalDateTime.now())
                .nodeName(payload.nodeName)
                .errorMessage(payload.errorMessage)
                .workflowId(payload.workflowId)
                .executionId(payload.executionId)
                .build();
        systemErrorRepository.save(error);
        log.warn("Error n8n guardado: {}", payload.errorMessage);
        return ResponseEntity.ok().build();
    }

    @Getter @Setter @NoArgsConstructor @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ScanReportPayload {
        public int totalDetected, audited, ignored, criticals, highs, mediums, lows;
        public String systemStatus, reportMessage;
        public String environmentBreakdown;
        public String targetType;
        public String targetName;
    }

    @Getter @Setter @NoArgsConstructor @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ErrorPayload {
        public String nodeName, errorMessage, workflowId, executionId;
    }
}
