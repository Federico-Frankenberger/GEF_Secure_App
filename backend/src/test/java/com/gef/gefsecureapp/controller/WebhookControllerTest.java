package com.gef.gefsecureapp.controller;

import com.gef.gefsecureapp.dto.VulnerabilityAuditDTO;
import com.gef.gefsecureapp.exception.InvalidCredentialsException;
import com.gef.gefsecureapp.model.ScanReport;
import com.gef.gefsecureapp.repository.SystemErrorRepository;
import com.gef.gefsecureapp.service.ScanService;
import com.gef.gefsecureapp.service.VulnerabilityAuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Cubre C1 (auditoria docs/20-08-26/AUDITORIA_END_TO_END.md): estos dos endpoints no
 *  tenian ninguna verificacion de token interno, a diferencia de receiveScanReport --
 *  cualquier usuario autenticado podia inyectar hallazgos falsos o spamear system_errors. */
@ExtendWith(MockitoExtension.class)
class WebhookControllerTest {

    private static final String VALID_TOKEN = "test-internal-token";

    @Mock private VulnerabilityAuditService vulnService;
    @Mock private SystemErrorRepository systemErrorRepository;
    @Mock private ScanService scanService;

    @InjectMocks private WebhookController controller;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(controller, "internalToken", VALID_TOKEN);
    }

    @Test
    void receiveVulnerabilities_tokenInvalido_rechazaYNoPersisteNada() {
        var vulns = List.of(new VulnerabilityAuditDTO.Request());

        assertThatThrownBy(() -> controller.receiveVulnerabilities("token-incorrecto", vulns))
                .isInstanceOf(InvalidCredentialsException.class);

        verify(vulnService, never()).create(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void receiveVulnerabilities_sinToken_rechaza() {
        var vulns = List.of(new VulnerabilityAuditDTO.Request());

        assertThatThrownBy(() -> controller.receiveVulnerabilities(null, vulns))
                .isInstanceOf(InvalidCredentialsException.class);

        verify(vulnService, never()).create(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void receiveVulnerabilities_tokenValido_persisteCadaHallazgo() {
        var v1 = new VulnerabilityAuditDTO.Request();
        var v2 = new VulnerabilityAuditDTO.Request();

        controller.receiveVulnerabilities(VALID_TOKEN, List.of(v1, v2));

        verify(vulnService).create(v1);
        verify(vulnService).create(v2);
    }

    @Test
    void receiveError_tokenInvalido_rechazaYNoPersisteNada() {
        var payload = new WebhookController.ErrorPayload();

        assertThatThrownBy(() -> controller.receiveError("token-incorrecto", payload))
                .isInstanceOf(InvalidCredentialsException.class);

        verify(systemErrorRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void receiveError_tokenValido_persisteElError() {
        var payload = new WebhookController.ErrorPayload();
        payload.nodeName = "Fetch_GitHub_Advisories";
        payload.errorMessage = "boom";

        controller.receiveError(VALID_TOKEN, payload);

        verify(systemErrorRepository).save(org.mockito.ArgumentMatchers.any());
    }

    // ── Hallazgo de hoy en vivo (docs/20-08-26/AUDITORIA_END_TO_END.md, N8N-03): dos
    // escaneos concurrentes con alcance solapado pueden hacer que Postgres mate una de
    // las dos transacciones de applyLifecycle() por deadlock -- ese escaneo quedaba en
    // RUNNING para siempre. completeWithRetry() reintenta antes de rendirse. ──

    @Test
    void receiveScanReport_reintentaAnteDeadlockYTerminaCompletandoElScan() {
        var payload = new WebhookController.ScanReportPayload();
        payload.scanId = 127L;

        when(scanService.complete(anyLong(), any()))
                .thenThrow(new CannotAcquireLockException("deadlock detected"))
                .thenReturn(null);

        controller.receiveScanReport(VALID_TOKEN, payload);

        verify(scanService, times(2)).complete(anyLong(), any());
    }

    @Test
    void receiveScanReport_siElDeadlockPersisteEnLosTresIntentos_propagaLaExcepcion() {
        var payload = new WebhookController.ScanReportPayload();
        payload.scanId = 127L;

        when(scanService.complete(anyLong(), any()))
                .thenThrow(new CannotAcquireLockException("deadlock detected"));

        assertThatThrownBy(() -> controller.receiveScanReport(VALID_TOKEN, payload))
                .isInstanceOf(CannotAcquireLockException.class);

        verify(scanService, times(3)).complete(anyLong(), any());
    }

    // ── Escaneo automatico (Scan_Scheduler de n8n, scanId null): antes se descartaba sin
    // persistir nada (ver comentario historico en receiveScanReport); ahora crea el ScanReport
    // via ScanService.completeAutomatic(), con la misma proteccion de retry por deadlock. ──

    @Test
    void receiveScanReport_sinScanId_llamaCompleteAutomaticEnVezDeDescartar() {
        var payload = new WebhookController.ScanReportPayload();
        payload.scanId = null;
        payload.totalDetected = 5;
        ScanReport created = ScanReport.builder().id(200L).publicCode("SCN-2026-000200").build();
        when(scanService.completeAutomatic(any())).thenReturn(created);

        controller.receiveScanReport(VALID_TOKEN, payload);

        verify(scanService).completeAutomatic(any());
        verify(scanService, never()).complete(anyLong(), any());
    }

    @Test
    void receiveScanReport_sinScanId_reintentaAnteDeadlockYTerminaCompletando() {
        var payload = new WebhookController.ScanReportPayload();
        payload.scanId = null;
        ScanReport created = ScanReport.builder().id(200L).publicCode("SCN-2026-000200").build();

        when(scanService.completeAutomatic(any()))
                .thenThrow(new CannotAcquireLockException("deadlock detected"))
                .thenReturn(created);

        controller.receiveScanReport(VALID_TOKEN, payload);

        verify(scanService, times(2)).completeAutomatic(any());
    }

    // ── N8N-03 (plan de confiabilidad 2026-08-24): AssetVulnerability.version (@Version)
    // agrega una segunda proteccion de concurrencia, ademas del deadlock -- el mismo retry
    // debe cubrir ObjectOptimisticLockingFailureException, no solo CannotAcquireLockException,
    // porque ConcurrencyFailureException es el ancestro comun de ambas. ──

    @Test
    void receiveScanReport_reintentaAnteConflictoDeVersionOptimistaYTerminaCompletandoElScan() {
        var payload = new WebhookController.ScanReportPayload();
        payload.scanId = 127L;

        when(scanService.complete(anyLong(), any()))
                .thenThrow(new ObjectOptimisticLockingFailureException("AssetVulnerability", 50L))
                .thenReturn(null);

        controller.receiveScanReport(VALID_TOKEN, payload);

        verify(scanService, times(2)).complete(anyLong(), any());
    }

    @Test
    void receiveScanReport_siElConflictoDeVersionPersisteEnLosTresIntentos_propagaLaExcepcion() {
        var payload = new WebhookController.ScanReportPayload();
        payload.scanId = 127L;

        when(scanService.complete(anyLong(), any()))
                .thenThrow(new ObjectOptimisticLockingFailureException("AssetVulnerability", 50L));

        assertThatThrownBy(() -> controller.receiveScanReport(VALID_TOKEN, payload))
                .isInstanceOf(ObjectOptimisticLockingFailureException.class);

        verify(scanService, times(3)).complete(anyLong(), any());
    }
}
