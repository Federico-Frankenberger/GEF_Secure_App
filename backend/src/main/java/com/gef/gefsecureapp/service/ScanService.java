package com.gef.gefsecureapp.service;

import com.gef.gefsecureapp.exception.ConflictException;
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
        // A-NUEVO-2 (docs/20-08-26/AUDITORIA_END_TO_END_2.md): sin este chequeo, pegarle dos
        // veces seguidas al mismo endpoint de escaneo (dos pestañas, un script, un reintento
        // de red) creaba dos ScanReport RUNNING y disparaba dos ejecuciones de n8n en paralelo
        // sobre el mismo target -- la misma condicion de carrera que N8N-03 mitiga con retry,
        // pero atacada en la causa (evitar el segundo disparo) en vez de solo en el sintoma.
        if (scanReportRepository.existsByTargetTypeAndTargetNameAndStatus(targetType, targetName, "RUNNING"))
            throw new ConflictException("Ya hay un escaneo en curso para " + targetType + "/" + targetName);

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

        // M-NUEVO-2 (docs/20-08-26/AUDITORIA_END_TO_END_2.md): sin esta guarda, una entrega
        // duplicada del mismo callback (n8n reintentando por un timeout de red, por ejemplo)
        // volvia a correr applyLifecycle() sobre el mismo scan -- no duplica hallazgos (esos
        // ya estan insertados por n8n antes de este webhook), pero si vuelve a evaluar
        // innecesariamente el ciclo de vida completo (auto-resolucion incluida) una segunda vez.
        if (!"RUNNING".equals(scan.getStatus())) return scan;

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

    private static final long AUTOMATIC_LINK_WINDOW_MINUTES = 60;

    /** Contraparte de start()+complete() para el escaneo disparado por Scan_Scheduler (sin
     *  scanId, sin usuario) -- antes WebhookController descartaba este payload sin persistir
     *  nada. triggeredBy queda null a proposito: es la marca de "automatico", no un dato
     *  faltante (ver ScanReportRepository.findLatestAutomatic). startedAt=executedAt=now()
     *  porque no existe un evento de "inicio" real para este camino (a diferencia de start(),
     *  que crea el ScanReport ANTES de disparar n8n) -- se documenta como aproximacion conocida. */
    @Transactional
    public ScanReport completeAutomatic(ScanCompletionPayload payload) {
        LocalDateTime now = LocalDateTime.now();
        ScanReport scan = ScanReport.builder()
                .startedAt(now)
                .executedAt(now)
                .status("COMPLETED")
                .targetType("GLOBAL")
                .targetName("TODOS")
                .triggeredBy(null)
                .automaticScan(true)
                .totalDetected(payload.totalDetected())
                .audited(payload.audited())
                .ignored(payload.ignored())
                .criticals(payload.criticals())
                .highs(payload.highs())
                .mediums(payload.mediums())
                .lows(payload.lows())
                .systemStatus(payload.systemStatus())
                .reportMessage(payload.reportMessage())
                .environmentBreakdown(payload.environmentBreakdown())
                .build();
        scan = scanReportRepository.save(scan);
        scan.setPublicCode(generatePublicCode(scan));
        scan = scanReportRepository.save(scan);

        // Orden importa: applyLifecycle() lee los hallazgos de este scan por scan_report_id,
        // asi que primero hay que vincular los huerfanos (scan_id NULL) que dejo n8n.
        vulnerabilityAuditService.linkOrphanFindings(scan.getId(), now.minusMinutes(AUTOMATIC_LINK_WINDOW_MINUTES));
        vulnerabilityAuditService.applyLifecycle(scan);
        return scan;
    }

    // Watchdog (docs/22-08-26/AUDITORIA_END_TO_END.md): sin esto no habia ningun @Scheduled
    // en todo el backend -- un ScanReport que se queda en RUNNING para siempre (n8n cae, el
    // webhook de cierre nunca llega) no tenia nada que lo marcara como sospechoso, ni una
    // alarma ni una forma de distinguirlo de un escaneo legitimamente largo.
    private static final long WATCHDOG_TIMEOUT_MINUTES = 30;

    @org.springframework.scheduling.annotation.Scheduled(
            fixedDelayString = "${scan.watchdog.check-interval-ms:300000}")
    @Transactional
    public void closeStaleRunningScans() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(WATCHDOG_TIMEOUT_MINUTES);
        for (ScanReport scan : scanReportRepository.findByStatusAndStartedAtBefore("RUNNING", cutoff)) {
            scan.setStatus("FAILED");
            scan.setErrorMessage("Watchdog: sin actualizacion tras " + WATCHDOG_TIMEOUT_MINUTES
                    + " minutos en RUNNING (probable fallo silencioso del pipeline de n8n o "
                    + "del webhook de cierre del escaneo).");
            scanReportRepository.save(scan);
        }
    }
}
