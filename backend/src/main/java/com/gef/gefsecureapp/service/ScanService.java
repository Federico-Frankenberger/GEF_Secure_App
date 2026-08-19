package com.gef.gefsecureapp.service;

import com.gef.gefsecureapp.exception.ResourceNotFoundException;
import com.gef.gefsecureapp.model.Asset;
import com.gef.gefsecureapp.model.Environment;
import com.gef.gefsecureapp.model.ScanReport;
import com.gef.gefsecureapp.model.SoftwareComponent;
import com.gef.gefsecureapp.model.User;
import com.gef.gefsecureapp.repository.AssetRepository;
import com.gef.gefsecureapp.repository.EnvironmentRepository;
import com.gef.gefsecureapp.repository.ScanReportRepository;
import com.gef.gefsecureapp.repository.SoftwareComponentRepository;
import com.gef.gefsecureapp.repository.UserRepository;
import com.gef.gefsecureapp.security.CurrentUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ScanService {

    private final ScanReportRepository scanReportRepository;
    private final UserRepository userRepository;
    private final SoftwareComponentRepository softwareComponentRepository;
    private final EnvironmentRepository environmentRepository;
    private final AssetRepository assetRepository;
    private final VulnerabilityAuditService vulnerabilityAuditService;

    /** Crea el Scan en estado RUNNING antes de disparar n8n -- su id viaja en el
     *  payload del webhook y vuelve en /api/webhook/scan-report al completarse. */
    @Transactional
    public ScanReport start(String targetType, String targetName, Long softwareComponentId, Long environmentId, Long assetId) {
        User triggeredBy = userRepository.findById(CurrentUser.get().id()).orElse(null);
        SoftwareComponent component = softwareComponentId != null
                ? softwareComponentRepository.findById(softwareComponentId).orElse(null) : null;
        Environment environment = environmentId != null
                ? environmentRepository.findById(environmentId).orElse(null) : null;
        Asset asset = assetId != null
                ? assetRepository.findById(assetId).orElse(null) : null;

        ScanReport scan = ScanReport.builder()
                .startedAt(LocalDateTime.now())
                .status("RUNNING")
                .targetType(targetType)
                .targetName(targetName)
                .triggeredBy(triggeredBy)
                .softwareComponent(component)
                .environment(environment)
                .asset(asset)
                .totalDetected(0)
                .audited(0)
                .ignored(0)
                .build();
        scan = scanReportRepository.save(scan);
        scan.setPublicCode(generatePublicCode(scan));
        return scanReportRepository.save(scan);
    }

    private String generatePublicCode(ScanReport scan) {
        int year = scan.getStartedAt().getYear();
        return "SCN-%d-%06d".formatted(year, scan.getId());
    }

    /** Completa un Scan disparado por la app con el resultado que reporta n8n
     *  al terminar la corrida (POST /api/webhook/scan-report). */
    @Transactional
    public ScanReport complete(Long scanId, ScanCompletionPayload payload) {
        ScanReport scan = scanReportRepository.findById(scanId)
                .orElseThrow(() -> new ResourceNotFoundException("ScanReport", scanId));

        scan.setExecutedAt(LocalDateTime.now());
        scan.setStatus("COMPLETED");
        scan.setTotalDetected(payload.totalDetected());
        scan.setAudited(payload.audited());
        scan.setIgnored(payload.ignored());
        scan.setCriticals(payload.criticals());
        scan.setHighs(payload.highs());
        scan.setMediums(payload.mediums());
        scan.setLows(payload.lows());
        scan.setSystemStatus(payload.systemStatus());
        scan.setReportMessage(payload.reportMessage());
        scan.setEnvironmentBreakdown(payload.environmentBreakdown());
        scan = scanReportRepository.save(scan);
        vulnerabilityAuditService.applyLifecycle(scan);
        return scan;
    }

    public record ScanCompletionPayload(
            int totalDetected, int audited, int ignored,
            int criticals, int highs, int mediums, int lows,
            String systemStatus, String reportMessage, String environmentBreakdown) {
    }
}
