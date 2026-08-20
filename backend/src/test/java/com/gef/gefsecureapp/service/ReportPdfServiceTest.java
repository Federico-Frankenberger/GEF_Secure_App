package com.gef.gefsecureapp.service;

import com.gef.gefsecureapp.dto.DashboardStatsDTO;
import com.gef.gefsecureapp.exception.ResourceNotFoundException;
import com.gef.gefsecureapp.mapper.VulnerabilityAuditMapper;
import com.gef.gefsecureapp.model.ScanReport;
import com.gef.gefsecureapp.repository.AssetVulnerabilityRepository;
import com.gef.gefsecureapp.repository.ScanReportRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportPdfServiceTest {

    @Mock private ScanReportRepository scanReportRepository;
    @Mock private VulnerabilityAuditService vulnerabilityAuditService;
    @Mock private DashboardService dashboardService;
    @Mock private AssetVulnerabilityRepository assetVulnerabilityRepository;
    @Mock private GhsaAdvisoryService ghsaAdvisoryService;
    @Mock private VulnerabilityAuditMapper vulnerabilityAuditMapper;

    private ReportPdfService service() {
        return new ReportPdfService(scanReportRepository, vulnerabilityAuditService, dashboardService,
                assetVulnerabilityRepository, ghsaAdvisoryService, vulnerabilityAuditMapper);
    }

    @Test
    @DisplayName("generateScanReport() rechaza un scanId inexistente")
    void generateScanReport_should_reject_missingScan() {
        when(scanReportRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service().generateScanReport(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("generateScanReport() produce bytes de un PDF válido para un escaneo sin hallazgos")
    void generateScanReport_should_producePdfBytes_when_scanExists() {
        ScanReport scan = ScanReport.builder()
                .id(1L).publicCode("SCN-2026-000001").executedAt(LocalDateTime.now())
                .totalDetected(0).audited(0).ignored(0)
                .criticals(0).highs(0).mediums(0).lows(0)
                .targetType("GLOBAL").targetName("TODOS")
                .build();
        when(scanReportRepository.findById(1L)).thenReturn(Optional.of(scan));
        when(vulnerabilityAuditService.findByScanReport(1L)).thenReturn(List.of());

        byte[] pdf = service().generateScanReport(1L);

        assertThat(pdf).isNotEmpty();
        assertThat(new String(pdf, 0, 4)).isEqualTo("%PDF");
    }

    @Test
    @DisplayName("generateCveReport() rechaza un identificador sin activos afectados")
    void generateCveReport_should_reject_whenNoMatches() {
        when(assetVulnerabilityRepository.findByCveIdIgnoreCaseOrGhsaIdIgnoreCase("CVE-0000-0000", "CVE-0000-0000"))
                .thenReturn(List.of());

        assertThatThrownBy(() -> service().generateCveReport("CVE-0000-0000"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("generateExecutiveReport() produce bytes de un PDF válido")
    void generateExecutiveReport_should_producePdfBytes() {
        when(dashboardService.getStats()).thenReturn(DashboardStatsDTO.builder()
                .totalAssets(5L).totalVulnerabilities(3L).openVulnerabilities(2L)
                .criticalVulnerabilities(1L).resolvedThisMonth(1L).mttrDays(2.5)
                .systemStatus("ESTABLE").build());
        when(assetVulnerabilityRepository.findTop10ByPriorityAndDetectionStatusOrderByLastDetectedAtDesc("CRITICAL", "OPEN"))
                .thenReturn(List.of());

        byte[] pdf = service().generateExecutiveReport();

        assertThat(pdf).isNotEmpty();
        assertThat(new String(pdf, 0, 4)).isEqualTo("%PDF");
    }
}
