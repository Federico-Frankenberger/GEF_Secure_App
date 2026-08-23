package com.gef.gefsecureapp.controller;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.gef.gefsecureapp.dto.VulnerabilityAuditDTO;
import com.gef.gefsecureapp.exception.InvalidCredentialsException;
import com.gef.gefsecureapp.model.ScanReport;
import com.gef.gefsecureapp.model.SystemError;
import com.gef.gefsecureapp.repository.SystemErrorRepository;
import com.gef.gefsecureapp.service.ScanService;
import com.gef.gefsecureapp.service.VulnerabilityAuditService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.function.Supplier;

@RestController
@RequestMapping("/api/webhook")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Webhook n8n", description = "Endpoints para recibir datos de n8n")
public class WebhookController {

    private final VulnerabilityAuditService vulnService;
    private final SystemErrorRepository systemErrorRepository;
    private final ScanService scanService;

    // Ruta interna, sin JWT de usuario (n8n no es un usuario del sistema) --
    // se valida en su lugar con un token compartido, configurado por env var.
    @Value("${n8n.internal-token}")
    private String internalToken;

    @PostMapping("/vulnerabilities")
    @Operation(summary = "Recibir vulnerabilidades en batch desde n8n")
    public ResponseEntity<Void> receiveVulnerabilities(
            @RequestHeader(value = "X-Internal-Token", required = false) String token,
            @RequestBody List<VulnerabilityAuditDTO.Request> vulns) {
        if (!Objects.equals(token, internalToken)) {
            throw new InvalidCredentialsException("Token interno inválido");
        }
        log.info("Webhook: recibidas {} vulnerabilidades de n8n", vulns.size());
        vulns.forEach(vulnService::create);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/scan-report")
    @Operation(summary = "Recibir el resultado final de un escaneo disparado por la app (completa el Scan en RUNNING)")
    public ResponseEntity<Void> receiveScanReport(
            @RequestHeader(value = "X-Internal-Token", required = false) String token,
            @RequestBody ScanReportPayload payload) {
        if (!Objects.equals(token, internalToken)) {
            throw new InvalidCredentialsException("Token interno inválido");
        }
        if (payload.scanId == null) {
            // Escaneo automatico (Scan_Scheduler de n8n): antes se descartaba aca sin
            // persistir nada -- ahora ScanService.completeAutomatic() crea el ScanReport
            // (triggered_by null = marca de origen automatico, ver findLatestAutomatic).
            ScanReport created = completeAutomaticWithRetry(payload);
            log.info("Escaneo automático (Scan_Scheduler) persistido: ScanReport id={} publicCode={}",
                    created.getId(), created.getPublicCode());
            return ResponseEntity.ok().build();
        }
        completeWithRetry(payload);
        log.info("Scan {} completado: total={}", payload.scanId, payload.totalDetected);
        return ResponseEntity.ok().build();
    }

    // Hallazgo encontrado hoy en vivo (docs/20-08-26/AUDITORIA_END_TO_END.md, N8N-03/
    // condicion de carrera de escaneos concurrentes): dos escaneos con alcance solapado
    // (ej. GLOBAL + ENTORNO disparados casi juntos) pueden actualizar las mismas filas de
    // asset_vulnerabilities en orden distinto en applyLifecycle() y Postgres mata una de
    // las dos transacciones por deadlock -- ese escaneo quedaba en RUNNING para siempre.
    // Un deadlock es, por naturaleza, una condicion transitoria: la transaccion que gano
    // ya libero sus locks, asi que reintentar la perdedora resuelve el caso normal.
    // Generico (Supplier<ScanReport>) porque el mismo riesgo de deadlock aplica tanto al
    // camino manual (complete) como al automatico (completeAutomatic) -- ambos terminan
    // escribiendo en asset_vulnerabilities via applyLifecycle().
    private ScanReport runWithDeadlockRetry(Supplier<ScanReport> action, Object logId) {
        int maxAttempts = 3;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return action.get();
            } catch (CannotAcquireLockException e) {
                if (attempt == maxAttempts) throw e;
                log.warn("Scan {} — deadlock al completar (intento {}/{}), reintentando: {}",
                        logId, attempt, maxAttempts, e.getMessage());
                try {
                    Thread.sleep(200L * attempt);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw e;
                }
            }
        }
        throw new IllegalStateException("unreachable");
    }

    private void completeWithRetry(ScanReportPayload payload) {
        runWithDeadlockRetry(() -> scanService.complete(payload.scanId, new ScanService.ScanCompletionPayload(
                payload.totalDetected, payload.audited, payload.ignored,
                payload.criticals, payload.highs, payload.mediums, payload.lows,
                payload.systemStatus, payload.reportMessage, payload.environmentBreakdown)), payload.scanId);
    }

    private ScanReport completeAutomaticWithRetry(ScanReportPayload payload) {
        return runWithDeadlockRetry(() -> scanService.completeAutomatic(new ScanService.ScanCompletionPayload(
                payload.totalDetected, payload.audited, payload.ignored,
                payload.criticals, payload.highs, payload.mediums, payload.lows,
                payload.systemStatus, payload.reportMessage, payload.environmentBreakdown)), "automático");
    }

    @PostMapping("/error")
    @Operation(summary = "Recibir error de workflow desde n8n")
    public ResponseEntity<Void> receiveError(
            @RequestHeader(value = "X-Internal-Token", required = false) String token,
            @RequestBody ErrorPayload payload) {
        if (!Objects.equals(token, internalToken)) {
            throw new InvalidCredentialsException("Token interno inválido");
        }
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
        public Long scanId;
        public int totalDetected, audited, ignored, criticals, highs, mediums, lows;
        public String systemStatus, reportMessage;
        public String environmentBreakdown;
    }

    @Getter @Setter @NoArgsConstructor @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ErrorPayload {
        public String nodeName, errorMessage, workflowId, executionId;
    }
}
