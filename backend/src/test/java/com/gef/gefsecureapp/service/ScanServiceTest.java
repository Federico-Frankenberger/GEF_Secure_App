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
import com.gef.gefsecureapp.security.TestAuth;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ScanServiceTest {

    @Mock private ScanReportRepository scanReportRepository;
    @Mock private UserRepository userRepository;
    @Mock private SoftwareComponentRepository softwareComponentRepository;
    @Mock private EnvironmentRepository environmentRepository;
    @Mock private AssetRepository assetRepository;
    @Mock private VulnerabilityAuditService vulnerabilityAuditService;

    @InjectMocks private ScanService scanService;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("start() crea el Scan en RUNNING, con quien lo disparo, y genera un public_code SCN-<anio>-<id>")
    void start_should_createRunningScan_withTriggeredByAndPublicCode() {
        TestAuth.loginAs(7L, "fede.frankenberger", "ADMIN");
        User user = User.builder().id(7L).username("fede.frankenberger").build();
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        when(scanReportRepository.save(any(ScanReport.class))).thenAnswer(inv -> {
            ScanReport s = inv.getArgument(0);
            if (s.getId() == null) s.setId(42L);
            return s;
        });

        ScanReport result = scanService.start("GLOBAL", "TODOS", null, null, null);

        assertThat(result.getStatus()).isEqualTo("RUNNING");
        assertThat(result.getTriggeredBy()).isEqualTo(user);
        assertThat(result.getTargetType()).isEqualTo("GLOBAL");
        assertThat(result.getTargetName()).isEqualTo("TODOS");
        assertThat(result.getStartedAt()).isNotNull();
        assertThat(result.getPublicCode()).matches("SCN-\\d{4}-000042");
    }

    @Test
    @DisplayName("start() para un escaneo de componente resuelve y setea el SoftwareComponent")
    void start_should_resolveSoftwareComponent_when_componentIdProvided() {
        TestAuth.loginAs(7L, "fede.frankenberger", "ADMIN");
        when(userRepository.findById(7L)).thenReturn(Optional.of(User.builder().id(7L).build()));
        SoftwareComponent component = SoftwareComponent.builder().id(5L).name("axios").build();
        when(softwareComponentRepository.findById(5L)).thenReturn(Optional.of(component));
        when(scanReportRepository.save(any(ScanReport.class))).thenAnswer(inv -> {
            ScanReport s = inv.getArgument(0);
            if (s.getId() == null) s.setId(1L);
            return s;
        });

        ScanReport result = scanService.start("ACTIVO", "axios", 5L, null, null);

        assertThat(result.getSoftwareComponent()).isEqualTo(component);
        assertThat(result.getEnvironment()).isNull();
        verify(environmentRepository, never()).findById(any());
    }

    @Test
    @DisplayName("start() para un escaneo de entorno resuelve y setea el Environment")
    void start_should_resolveEnvironment_when_environmentIdProvided() {
        TestAuth.loginAs(7L, "fede.frankenberger", "ADMIN");
        when(userRepository.findById(7L)).thenReturn(Optional.of(User.builder().id(7L).build()));
        Environment env = Environment.builder().id(2L).name("Desarrollo").build();
        when(environmentRepository.findById(2L)).thenReturn(Optional.of(env));
        when(scanReportRepository.save(any(ScanReport.class))).thenAnswer(inv -> {
            ScanReport s = inv.getArgument(0);
            if (s.getId() == null) s.setId(1L);
            return s;
        });

        ScanReport result = scanService.start("ENTORNO", "Desarrollo", null, 2L, null);

        assertThat(result.getEnvironment()).isEqualTo(env);
        assertThat(result.getSoftwareComponent()).isNull();
        verify(softwareComponentRepository, never()).findById(any());
    }

    @Test
    @DisplayName("start() para un escaneo de activo (host) resuelve y setea el Asset")
    void start_should_resolveAsset_when_assetIdProvided() {
        TestAuth.loginAs(7L, "fede.frankenberger", "ADMIN");
        when(userRepository.findById(7L)).thenReturn(Optional.of(User.builder().id(7L).build()));
        Asset asset = Asset.builder().id(3L).name("Host Inyectado").build();
        when(assetRepository.findById(3L)).thenReturn(Optional.of(asset));
        when(scanReportRepository.save(any(ScanReport.class))).thenAnswer(inv -> {
            ScanReport s = inv.getArgument(0);
            if (s.getId() == null) s.setId(1L);
            return s;
        });

        ScanReport result = scanService.start("HOST", "Host Inyectado", null, null, 3L);

        assertThat(result.getAsset()).isEqualTo(asset);
        assertThat(result.getSoftwareComponent()).isNull();
        assertThat(result.getEnvironment()).isNull();
        verify(softwareComponentRepository, never()).findById(any());
        verify(environmentRepository, never()).findById(any());
    }

    // ── A-NUEVO-2 (docs/20-08-26/AUDITORIA_END_TO_END_2.md) ────────────────────────

    @Test
    @DisplayName("start() rechaza un segundo disparo sobre el mismo target mientras el primero sigue RUNNING")
    void start_should_rejectSecondTrigger_when_sameTargetAlreadyRunning() {
        TestAuth.loginAs(7L, "fede.frankenberger", "ADMIN");
        when(scanReportRepository.existsByTargetTypeAndTargetNameAndStatus("ACTIVO", "axios", "RUNNING"))
                .thenReturn(true);

        assertThatThrownBy(() -> scanService.start("ACTIVO", "axios", 5L, null, null))
                .isInstanceOf(ConflictException.class);

        verifyNoInteractions(userRepository, softwareComponentRepository);
        verify(scanReportRepository, never()).save(any());
    }

    @Test
    @DisplayName("start() permite un nuevo disparo si el RUNNING previo del mismo target ya no existe")
    void start_should_allowTrigger_when_noRunningScan_forSameTarget() {
        TestAuth.loginAs(7L, "fede.frankenberger", "ADMIN");
        when(scanReportRepository.existsByTargetTypeAndTargetNameAndStatus("ACTIVO", "axios", "RUNNING"))
                .thenReturn(false);
        when(userRepository.findById(7L)).thenReturn(Optional.of(User.builder().id(7L).build()));
        when(scanReportRepository.save(any(ScanReport.class))).thenAnswer(inv -> {
            ScanReport s = inv.getArgument(0);
            if (s.getId() == null) s.setId(1L);
            return s;
        });

        assertThat(scanService.start("ACTIVO", "axios", null, null, null).getStatus()).isEqualTo("RUNNING");
    }

    @Test
    @DisplayName("complete() actualiza el Scan a COMPLETED con las metricas reportadas por n8n")
    void complete_should_updateScan_toCompletedWithMetrics() {
        ScanReport running = ScanReport.builder().id(9L).status("RUNNING").startedAt(LocalDateTime.now()).build();
        when(scanReportRepository.findById(9L)).thenReturn(Optional.of(running));
        when(scanReportRepository.save(any(ScanReport.class))).thenAnswer(inv -> inv.getArgument(0));

        ScanReport result = scanService.complete(9L, new ScanService.ScanCompletionPayload(
                10, 8, 2, 1, 2, 3, 2, "✅ ESTABLE", "resumen", "{}"));

        assertThat(result.getStatus()).isEqualTo("COMPLETED");
        assertThat(result.getExecutedAt()).isNotNull();
        assertThat(result.getTotalDetected()).isEqualTo(10);
        assertThat(result.getCriticals()).isEqualTo(1);
        assertThat(result.getSystemStatus()).isEqualTo("✅ ESTABLE");
        verify(vulnerabilityAuditService).applyLifecycle(result);
    }

    @Test
    @DisplayName("M-NUEVO-2: complete() sobre un scan ya COMPLETED (callback duplicado) es un no-op, no reprocesa applyLifecycle")
    void complete_should_beNoOp_when_scanAlreadyCompleted() {
        ScanReport alreadyCompleted = ScanReport.builder().id(9L).status("COMPLETED")
                .startedAt(LocalDateTime.now()).executedAt(LocalDateTime.now()).build();
        when(scanReportRepository.findById(9L)).thenReturn(Optional.of(alreadyCompleted));

        ScanReport result = scanService.complete(9L, new ScanService.ScanCompletionPayload(
                999, 999, 999, 999, 999, 999, 999, "distinto", "distinto", "{}"));

        assertThat(result).isSameAs(alreadyCompleted);
        assertThat(result.getTotalDetected()).isNull();
        verify(scanReportRepository, never()).save(any());
        verifyNoInteractions(vulnerabilityAuditService);
    }

    @Test
    @DisplayName("complete() de un scan inexistente da 404")
    void complete_should_throwNotFound_when_scanDoesNotExist() {
        when(scanReportRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> scanService.complete(999L,
                new ScanService.ScanCompletionPayload(0, 0, 0, 0, 0, 0, 0, "", "", "")))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── completeAutomatic() (escaneo diario de Scan_Scheduler, sin scanId/usuario) ─────────

    @Test
    @DisplayName("completeAutomatic() crea el ScanReport ya COMPLETED, con triggeredBy null como marca de origen automatico")
    void completeAutomatic_should_createCompletedScan_withNullTriggeredBy() {
        when(scanReportRepository.save(any(ScanReport.class))).thenAnswer(inv -> {
            ScanReport s = inv.getArgument(0);
            if (s.getId() == null) s.setId(55L);
            return s;
        });

        ScanReport result = scanService.completeAutomatic(new ScanService.ScanCompletionPayload(
                10, 8, 2, 1, 2, 3, 2, "✅ ESTABLE", "resumen", "{}"));

        assertThat(result.getStatus()).isEqualTo("COMPLETED");
        assertThat(result.getTargetType()).isEqualTo("GLOBAL");
        assertThat(result.getTargetName()).isEqualTo("TODOS");
        assertThat(result.getTriggeredBy()).isNull();
        assertThat(result.getStartedAt()).isNotNull();
        assertThat(result.getExecutedAt()).isNotNull();
        assertThat(result.getTotalDetected()).isEqualTo(10);
        assertThat(result.getCriticals()).isEqualTo(1);
        assertThat(result.getPublicCode()).matches("SCN-\\d{4}-000055");
        verifyNoInteractions(userRepository, softwareComponentRepository, environmentRepository, assetRepository);
    }

    @Test
    @DisplayName("Fix 0 (bucle-reapertura 2026-08-24): completeAutomatic() es un no-op si ya hubo una completacion automatica reciente (entrega duplicada del webhook)")
    void completeAutomatic_should_beNoOp_when_recentAutomaticCompletionExists() {
        ScanReport previous = ScanReport.builder().id(55L).status("COMPLETED")
                .startedAt(LocalDateTime.now().minusMinutes(5)).executedAt(LocalDateTime.now().minusMinutes(5)).build();
        when(scanReportRepository.existsByAutomaticScanTrueAndExecutedAtAfter(any(LocalDateTime.class))).thenReturn(true);
        when(scanReportRepository.findLatestAutomatic()).thenReturn(Optional.of(previous));

        ScanReport result = scanService.completeAutomatic(new ScanService.ScanCompletionPayload(
                10, 8, 2, 1, 2, 3, 2, "✅ ESTABLE", "resumen", "{}"));

        assertThat(result).isSameAs(previous);
        verify(scanReportRepository, never()).save(any());
        verifyNoInteractions(vulnerabilityAuditService);
    }

    @Test
    @DisplayName("completeAutomatic() vincula los hallazgos huerfanos (scan_id NULL) antes de correr applyLifecycle")
    void completeAutomatic_should_linkOrphanFindings_beforeApplyingLifecycle() {
        when(scanReportRepository.save(any(ScanReport.class))).thenAnswer(inv -> {
            ScanReport s = inv.getArgument(0);
            if (s.getId() == null) s.setId(55L);
            return s;
        });

        ScanReport result = scanService.completeAutomatic(new ScanService.ScanCompletionPayload(
                10, 8, 2, 1, 2, 3, 2, "✅ ESTABLE", "resumen", "{}"));

        var inOrder = inOrder(vulnerabilityAuditService);
        inOrder.verify(vulnerabilityAuditService).linkOrphanFindings(eq(55L), any(LocalDateTime.class));
        inOrder.verify(vulnerabilityAuditService).applyLifecycle(result);
    }

    @Test
    @DisplayName("Watchdog: closeStaleRunningScans() marca FAILED los escaneos RUNNING colgados hace mas del umbral (informe AUDITORIA_END_TO_END 2026-08-22, sin @Scheduled en todo el backend)")
    void closeStaleRunningScans_should_markStaleRunningScans_asFailed() {
        ScanReport stale = ScanReport.builder().id(11L).status("RUNNING")
                .startedAt(LocalDateTime.now().minusMinutes(45)).build();
        when(scanReportRepository.findByStatusAndStartedAtBefore(eq("RUNNING"), any(LocalDateTime.class)))
                .thenReturn(java.util.List.of(stale));

        scanService.closeStaleRunningScans();

        assertThat(stale.getStatus()).isEqualTo("FAILED");
        assertThat(stale.getErrorMessage()).isNotBlank();
        verify(scanReportRepository).save(stale);
    }

    @Test
    @DisplayName("Watchdog: closeStaleRunningScans() no toca nada si no hay escaneos RUNNING mas viejos que el umbral")
    void closeStaleRunningScans_should_doNothing_when_noStaleScans() {
        when(scanReportRepository.findByStatusAndStartedAtBefore(eq("RUNNING"), any(LocalDateTime.class)))
                .thenReturn(java.util.List.of());

        scanService.closeStaleRunningScans();

        verify(scanReportRepository, never()).save(any());
    }
}
