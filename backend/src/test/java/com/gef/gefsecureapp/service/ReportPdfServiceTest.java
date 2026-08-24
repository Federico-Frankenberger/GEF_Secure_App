package com.gef.gefsecureapp.service;

import com.gef.gefsecureapp.dto.CvePreviewDTO;
import com.gef.gefsecureapp.dto.RemediationAnalysisDTO;
import com.gef.gefsecureapp.dto.VulnerabilityAnalysisDTO;
import com.gef.gefsecureapp.dto.VulnerabilitySummaryDTO;
import com.gef.gefsecureapp.exception.ResourceNotFoundException;
import com.gef.gefsecureapp.mapper.VulnerabilityAuditMapper;
import com.gef.gefsecureapp.model.Asset;
import com.gef.gefsecureapp.model.ScanReport;
import com.gef.gefsecureapp.model.SoftwareComponent;
import com.gef.gefsecureapp.repository.AssetVulnerabilityRepository;
import com.gef.gefsecureapp.repository.ScanReportRepository;
import com.gef.gefsecureapp.security.TestAuth;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportPdfServiceTest {

    @Mock private ScanReportRepository scanReportRepository;
    @Mock private VulnerabilityAuditService vulnerabilityAuditService;
    @Mock private AssetVulnerabilityRepository assetVulnerabilityRepository;
    @Mock private GhsaAdvisoryService ghsaAdvisoryService;
    @Mock private VulnerabilityAuditMapper vulnerabilityAuditMapper;
    @Mock private UserAssetAssignmentService userAssetAssignmentService;

    private ReportPdfService service() {
        return new ReportPdfService(scanReportRepository, vulnerabilityAuditService,
                assetVulnerabilityRepository, ghsaAdvisoryService, vulnerabilityAuditMapper, userAssetAssignmentService);
    }

    @BeforeEach
    void defaultLogin() {
        // Sin restriccion por defecto -- los tests que necesiten ASSET_OWNER hacen su propio login.
        TestAuth.loginAs(1L, "fede.frankenberger", "ADMIN");
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
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

    private VulnerabilitySummaryDTO emptySummary() {
        return VulnerabilitySummaryDTO.builder()
                .openCount(0L).criticalCount(0L).highCount(0L).exploitedCount(0L)
                .slaOverdueCount(0L).slaUpcomingCount(0L).affectedAssetsCount(0L)
                .newLast7Days(0L).resolvedLast7Days(0L).attentionList(List.of())
                .topRiskAssets(List.of()).cisaKevCount(0L).ghsaOnlyCount(0L).build();
    }

    @Test
    @DisplayName("generateExecutiveReport() produce bytes de un PDF válido")
    void generateExecutiveReport_should_producePdfBytes() {
        when(vulnerabilityAuditService.getSummary()).thenReturn(emptySummary());
        when(assetVulnerabilityRepository.findTop10ByPriorityAndDetectionStatusOrderByLastDetectedAtDesc("CRITICAL", "OPEN"))
                .thenReturn(List.of());

        byte[] pdf = service().generateExecutiveReport();

        assertThat(pdf).isNotEmpty();
        assertThat(new String(pdf, 0, 4)).isEqualTo("%PDF");
    }

    // ── C2 (docs/20-08-26/AUDITORIA_END_TO_END.md): ASSET_OWNER no debe ver datos fuera de scope ──

    @Test
    @DisplayName("generateScanReport() de un escaneo ACTIVO fuera de scope da 404 para ASSET_OWNER (no confirma que exista)")
    void generateScanReport_assetOwner_fueraDeScope_rechaza() {
        SecurityContextHolder.clearContext();
        TestAuth.loginAs(10L, "owner.demo", "ASSET_OWNER");
        when(userAssetAssignmentService.assignedAssetIds(10L)).thenReturn(Set.of(1L));

        SoftwareComponent component = SoftwareComponent.builder().id(50L)
                .asset(Asset.builder().id(99L).build()).build(); // 99L no está en el scope (1L)
        ScanReport scan = ScanReport.builder().id(5L).targetType("ACTIVO").softwareComponent(component).build();
        when(scanReportRepository.findById(5L)).thenReturn(Optional.of(scan));

        assertThatThrownBy(() -> service().generateScanReport(5L))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(vulnerabilityAuditService, never()).findByScanReport(any());
    }

    @Test
    @DisplayName("generateScanReport() de un escaneo ACTIVO dentro de scope funciona normalmente para ASSET_OWNER")
    void generateScanReport_assetOwner_dentroDeScope_funciona() {
        SecurityContextHolder.clearContext();
        TestAuth.loginAs(10L, "owner.demo", "ASSET_OWNER");
        when(userAssetAssignmentService.assignedAssetIds(10L)).thenReturn(Set.of(1L));

        SoftwareComponent component = SoftwareComponent.builder().id(50L)
                .asset(Asset.builder().id(1L).build()).build();
        ScanReport scan = ScanReport.builder().id(5L).publicCode("SCN-2026-000005").targetType("ACTIVO")
                .softwareComponent(component).criticals(0).highs(0).mediums(0).lows(0).build();
        when(scanReportRepository.findById(5L)).thenReturn(Optional.of(scan));
        when(vulnerabilityAuditService.findByScanReport(5L)).thenReturn(List.of());

        byte[] pdf = service().generateScanReport(5L);

        assertThat(pdf).isNotEmpty();
    }

    @Test
    @DisplayName("generateScanReport() de un escaneo GLOBAL/ENTORNO (sin activo único) siempre da 404 para ASSET_OWNER")
    void generateScanReport_assetOwner_scanGlobal_rechaza() {
        SecurityContextHolder.clearContext();
        TestAuth.loginAs(10L, "owner.demo", "ASSET_OWNER");
        when(userAssetAssignmentService.assignedAssetIds(10L)).thenReturn(Set.of(1L));

        ScanReport scan = ScanReport.builder().id(6L).targetType("GLOBAL").build();
        when(scanReportRepository.findById(6L)).thenReturn(Optional.of(scan));

        assertThatThrownBy(() -> service().generateScanReport(6L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("generateExecutiveReport() para ASSET_OWNER usa el top-10 scopeado, nunca el global")
    void generateExecutiveReport_assetOwner_usaTop10Scopeado() {
        SecurityContextHolder.clearContext();
        TestAuth.loginAs(10L, "owner.demo", "ASSET_OWNER");
        Set<Long> scope = Set.of(1L);
        when(userAssetAssignmentService.assignedAssetIds(10L)).thenReturn(scope);
        when(vulnerabilityAuditService.getSummary()).thenReturn(emptySummary());
        when(assetVulnerabilityRepository
                .findTop10ByPriorityAndDetectionStatusAndSoftwareComponent_Asset_IdInOrderByLastDetectedAtDesc(
                        "CRITICAL", "OPEN", scope))
                .thenReturn(List.of());

        byte[] pdf = service().generateExecutiveReport();

        assertThat(pdf).isNotEmpty();
        verify(assetVulnerabilityRepository, never())
                .findTop10ByPriorityAndDetectionStatusOrderByLastDetectedAtDesc(any(), any());
    }

    @Test
    @DisplayName("generateCveReport() para ASSET_OWNER usa la variante scopeada, nunca la global")
    void generateCveReport_assetOwner_usaVarianteScopeada() {
        SecurityContextHolder.clearContext();
        TestAuth.loginAs(10L, "owner.demo", "ASSET_OWNER");
        Set<Long> scope = Set.of(1L);
        when(userAssetAssignmentService.assignedAssetIds(10L)).thenReturn(scope);
        when(assetVulnerabilityRepository.findByCveIdOrGhsaIdIgnoreCaseAndAssetIn("CVE-1234-5678", scope))
                .thenReturn(List.of());

        assertThatThrownBy(() -> service().generateCveReport("CVE-1234-5678"))
                .isInstanceOf(ResourceNotFoundException.class); // sin coincidencias en su scope -> 404, no fuga

        verify(assetVulnerabilityRepository, never())
                .findByCveIdIgnoreCaseOrGhsaIdIgnoreCase(any(), any());
    }

    // ── Centro de Informes (docs/bitacora/23-08-26): previewCve + informes nuevos ──────

    @Test
    @DisplayName("previewCve() devuelve found=false sin activos afectados")
    void previewCve_should_returnNotFound_whenNoMatches() {
        when(assetVulnerabilityRepository.findByCveIdIgnoreCaseOrGhsaIdIgnoreCase("CVE-0000-0000", "CVE-0000-0000"))
                .thenReturn(List.of());

        CvePreviewDTO preview = service().previewCve("CVE-0000-0000");

        assertThat(preview.isFound()).isFalse();
        assertThat(preview.getAffectedAssetsCount()).isZero();
    }

    @Test
    @DisplayName("previewCve() para ASSET_OWNER usa la variante scopeada, nunca la global")
    void previewCve_assetOwner_usaVarianteScopeada() {
        SecurityContextHolder.clearContext();
        TestAuth.loginAs(10L, "owner.demo", "ASSET_OWNER");
        Set<Long> scope = Set.of(1L);
        when(userAssetAssignmentService.assignedAssetIds(10L)).thenReturn(scope);
        when(assetVulnerabilityRepository.findByCveIdOrGhsaIdIgnoreCaseAndAssetIn("CVE-1234-5678", scope))
                .thenReturn(List.of());

        CvePreviewDTO preview = service().previewCve("CVE-1234-5678");

        assertThat(preview.isFound()).isFalse();
        verify(assetVulnerabilityRepository, never()).findByCveIdIgnoreCaseOrGhsaIdIgnoreCase(any(), any());
    }

    @Test
    @DisplayName("generateVulnerabilityAnalysisReport() produce bytes de un PDF válido")
    void generateVulnerabilityAnalysisReport_should_producePdfBytes() {
        when(vulnerabilityAuditService.getAnalysis(30)).thenReturn(VulnerabilityAnalysisDTO.builder()
                .days(30).trend(List.of()).slaOverdueCount(0L).slaUpcomingCount(0L)
                .slaOnTrackCount(0L).cisaKevCount(0L).ghsaOnlyCount(0L).build());

        byte[] pdf = service().generateVulnerabilityAnalysisReport(30);

        assertThat(pdf).isNotEmpty();
        assertThat(new String(pdf, 0, 4)).isEqualTo("%PDF");
    }

    @Test
    @DisplayName("generateRemediationReport() produce bytes de un PDF válido, con desgloses vacíos")
    void generateRemediationReport_should_producePdfBytes() {
        when(vulnerabilityAuditService.getRemediationAnalysis(30)).thenReturn(RemediationAnalysisDTO.builder()
                .days(30).mttrDeclaredDays(2.5).mttrVerifiedDays(null).mttrByCriticality(List.of())
                .slaOverdueCount(0L).slaUpcomingCount(0L).slaOnTrackCount(0L)
                .outcomeBreakdown(List.of()).evidenceLevelBreakdown(List.of())
                .reopenedCasesCount(0L).build());

        byte[] pdf = service().generateRemediationReport(30);

        assertThat(pdf).isNotEmpty();
        assertThat(new String(pdf, 0, 4)).isEqualTo("%PDF");
    }
}
