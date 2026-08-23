package com.gef.gefsecureapp.service;

import com.gef.gefsecureapp.dto.DashboardStatsDTO;
import com.gef.gefsecureapp.repository.AssetRepository;
import com.gef.gefsecureapp.repository.AssetVulnerabilityRepository;
import com.gef.gefsecureapp.repository.ScanReportRepository;
import com.gef.gefsecureapp.repository.SoftwareComponentRepository;
import com.gef.gefsecureapp.security.TestAuth;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** Cubre C3 (auditoria docs/20-08-26/AUDITORIA_END_TO_END.md): el Dashboard no tenia
 *  ningun scope -- un ASSET_OWNER veia KPIs de toda la organizacion. */
@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock private SoftwareComponentRepository softwareComponentRepository;
    @Mock private AssetVulnerabilityRepository vulnRepository;
    @Mock private ScanReportRepository scanReportRepository;
    @Mock private UserAssetAssignmentService userAssetAssignmentService;
    @Mock private AssetRepository assetRepository;

    @InjectMocks private DashboardService dashboardService;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("getStats() para ADMIN consulta los repos sin scope (comportamiento previo intacto)")
    void getStats_admin_sinScope() {
        TestAuth.loginAs(1L, "fede.frankenberger", "ADMIN");

        when(assetRepository.countByDeletedAtIsNull()).thenReturn(18L);
        when(vulnRepository.count()).thenReturn(30L);
        when(vulnRepository.countByTriageStatus(any())).thenReturn(5L);
        when(vulnRepository.countByPriority("CRITICAL")).thenReturn(2L);
        when(vulnRepository.countResolvedBetween(any(), any())).thenReturn(1L);
        when(vulnRepository.findAverageMttrDeclaredDays()).thenReturn(3.5);
        when(vulnRepository.findAverageMttrVerifiedDays()).thenReturn(null);
        when(scanReportRepository.findFirstByExecutedAtNotNullOrderByExecutedAtDesc()).thenReturn(Optional.empty());
        when(vulnRepository.countGroupedByPriority()).thenReturn(List.of());
        when(vulnRepository.countGroupedByTriageStatus()).thenReturn(List.of());
        when(vulnRepository.countDailyDetections(any())).thenReturn(List.of());
        when(vulnRepository.countDailyResolutions(any())).thenReturn(List.of());
        when(vulnRepository.countByReopenCountGreaterThan(0)).thenReturn(3L);
        when(vulnRepository.countAgingBuckets()).thenReturn(List.of());
        when(vulnRepository.findAverageMttrDeclaredDaysByPriority()).thenReturn(List.of());
        when(vulnRepository.countOpenGroupedByAssignedUser()).thenReturn(List.of());

        DashboardStatsDTO stats = dashboardService.getStats();

        assertThat(stats.getTotalAssets()).isEqualTo(18L);
        assertThat(stats.getTotalVulnerabilities()).isEqualTo(30L);
        assertThat(stats.getReopenedCasesCount()).isEqualTo(3L);
        assertThat(stats.getRecurrenceRate()).isEqualTo(3.0 / 30.0);
        assertThat(stats.getMttrDeclaredDays()).isEqualTo(3.5);
        assertThat(stats.getMttrVerifiedDays()).isNull();
        verify(userAssetAssignmentService, never()).assignedAssetIds(any());
        // ninguna de las variantes scopeadas debe llamarse para ADMIN
        verify(assetRepository, never()).countByIdInAndDeletedAtIsNull(any());
        verify(vulnRepository, never()).countBySoftwareComponent_Asset_IdIn(any());
        verify(vulnRepository, never()).countByReopenCountGreaterThanAndSoftwareComponent_Asset_IdIn(any(), any());
    }

    @Test
    @DisplayName("Fase 2: getStats() con 0 vulnerabilidades totales no divide por cero -- recurrenceRate queda en 0.0")
    void getStats_sinVulnerabilidades_recurrenceRateEnCero() {
        TestAuth.loginAs(1L, "fede.frankenberger", "ADMIN");

        when(assetRepository.countByDeletedAtIsNull()).thenReturn(0L);
        when(vulnRepository.count()).thenReturn(0L);
        when(vulnRepository.countByTriageStatus(any())).thenReturn(0L);
        when(vulnRepository.countByPriority("CRITICAL")).thenReturn(0L);
        when(vulnRepository.countResolvedBetween(any(), any())).thenReturn(0L);
        when(vulnRepository.findAverageMttrDeclaredDays()).thenReturn(null);
        when(scanReportRepository.findFirstByExecutedAtNotNullOrderByExecutedAtDesc()).thenReturn(Optional.empty());
        when(vulnRepository.countGroupedByPriority()).thenReturn(List.of());
        when(vulnRepository.countGroupedByTriageStatus()).thenReturn(List.of());
        when(vulnRepository.countDailyDetections(any())).thenReturn(List.of());
        when(vulnRepository.countDailyResolutions(any())).thenReturn(List.of());
        when(vulnRepository.countByReopenCountGreaterThan(0)).thenReturn(0L);
        when(vulnRepository.countAgingBuckets()).thenReturn(List.of());
        when(vulnRepository.findAverageMttrDeclaredDaysByPriority()).thenReturn(List.of());
        when(vulnRepository.countOpenGroupedByAssignedUser()).thenReturn(List.of());

        DashboardStatsDTO stats = dashboardService.getStats();

        assertThat(stats.getRecurrenceRate()).isEqualTo(0.0);
    }

    @Test
    @DisplayName("getStats() para ASSET_OWNER usa unicamente las variantes scopeadas, nunca las globales")
    void getStats_assetOwner_usaVariantesScopeadas() {
        TestAuth.loginAs(10L, "owner.demo", "ASSET_OWNER");
        Set<Long> scope = Set.of(1L, 2L);
        when(userAssetAssignmentService.assignedAssetIds(10L)).thenReturn(scope);

        when(assetRepository.countByIdInAndDeletedAtIsNull(scope)).thenReturn(2L);
        when(vulnRepository.countBySoftwareComponent_Asset_IdIn(scope)).thenReturn(4L);
        when(vulnRepository.countByTriageStatusAndSoftwareComponent_Asset_IdIn(any(), eq(scope))).thenReturn(1L);
        when(vulnRepository.countByPriorityAndSoftwareComponent_Asset_IdIn("CRITICAL", scope)).thenReturn(0L);
        when(vulnRepository.countResolvedBetween(any(), any(), eq(scope))).thenReturn(0L);
        when(vulnRepository.findAverageMttrDeclaredDays(scope)).thenReturn(null);
        when(vulnRepository.countGroupedByPriority(scope)).thenReturn(List.of());
        when(vulnRepository.countGroupedByTriageStatus(scope)).thenReturn(List.of());
        when(vulnRepository.countDailyDetections(any(), eq(scope))).thenReturn(List.of());
        when(vulnRepository.countDailyResolutions(any(), eq(scope))).thenReturn(List.of());
        when(vulnRepository.countByReopenCountGreaterThanAndSoftwareComponent_Asset_IdIn(0, scope)).thenReturn(1L);
        when(vulnRepository.countAgingBuckets(scope)).thenReturn(List.of());
        when(vulnRepository.findAverageMttrDeclaredDaysByPriority(scope)).thenReturn(List.of());
        when(vulnRepository.countOpenGroupedByAssignedUser(scope)).thenReturn(List.of());

        DashboardStatsDTO stats = dashboardService.getStats();

        assertThat(stats.getTotalAssets()).isEqualTo(2L);
        assertThat(stats.getTotalVulnerabilities()).isEqualTo(4L);
        assertThat(stats.getCriticalVulnerabilities()).isEqualTo(0L);
        assertThat(stats.getSystemStatus()).isEqualTo("✅ ESTABLE");
        assertThat(stats.getReopenedCasesCount()).isEqualTo(1L);
        assertThat(stats.getRecurrenceRate()).isEqualTo(1.0 / 4.0);

        // las variantes SIN scope no deben tocarse para ASSET_OWNER -- es la fuga que arregla C3
        verify(assetRepository, never()).countByDeletedAtIsNull();
        verify(vulnRepository, never()).count();
        verify(vulnRepository, never()).findAverageMttrDeclaredDays();
        verify(scanReportRepository, never()).findFirstByExecutedAtNotNullOrderByExecutedAtDesc();
        verify(vulnRepository, never()).countByReopenCountGreaterThan(any());
    }

    @Test
    @DisplayName("Fase 4: getStats() expone aging buckets y MTTR declarado por criticidad")
    void getStats_should_exposeAgingBucketsAndMttrByCriticality() {
        TestAuth.loginAs(1L, "fede.frankenberger", "ADMIN");

        when(assetRepository.countByDeletedAtIsNull()).thenReturn(1L);
        when(vulnRepository.count()).thenReturn(1L);
        when(vulnRepository.countByTriageStatus(any())).thenReturn(0L);
        when(vulnRepository.countByPriority("CRITICAL")).thenReturn(0L);
        when(vulnRepository.countResolvedBetween(any(), any())).thenReturn(0L);
        when(vulnRepository.findAverageMttrDeclaredDays()).thenReturn(null);
        when(scanReportRepository.findFirstByExecutedAtNotNullOrderByExecutedAtDesc()).thenReturn(Optional.empty());
        when(vulnRepository.countGroupedByPriority()).thenReturn(List.of());
        when(vulnRepository.countGroupedByTriageStatus()).thenReturn(List.of());
        when(vulnRepository.countDailyDetections(any())).thenReturn(List.of());
        when(vulnRepository.countDailyResolutions(any())).thenReturn(List.of());
        when(vulnRepository.countByReopenCountGreaterThan(0)).thenReturn(0L);
        when(vulnRepository.countAgingBuckets()).thenReturn(List.of(
                new Object[]{"0-30", 5L}, new Object[]{"90+", 2L}));
        when(vulnRepository.findAverageMttrDeclaredDaysByPriority()).thenReturn(List.of(
                new Object[]{"CRITICAL", 1.5}, new Object[]{"LOW", 8.0}));
        when(vulnRepository.countOpenGroupedByAssignedUser()).thenReturn(List.of());

        DashboardStatsDTO stats = dashboardService.getStats();

        assertThat(stats.getAgingBuckets()).hasSize(2);
        assertThat(stats.getAgingBuckets().get(0)).containsEntry("bucket", "0-30").containsEntry("count", 5L);
        assertThat(stats.getMttrByCriticality()).hasSize(2);
        assertThat(stats.getMttrByCriticality().get(0)).containsEntry("priority", "CRITICAL").containsEntry("avgDays", 1.5);
    }

    @Test
    @DisplayName("Fase 9: getStats() expone la distribucion por responsable (assignedToUser)")
    void getStats_should_exposeByResponsible() {
        TestAuth.loginAs(1L, "fede.frankenberger", "ADMIN");

        when(assetRepository.countByDeletedAtIsNull()).thenReturn(1L);
        when(vulnRepository.count()).thenReturn(1L);
        when(vulnRepository.countByTriageStatus(any())).thenReturn(0L);
        when(vulnRepository.countByPriority("CRITICAL")).thenReturn(0L);
        when(vulnRepository.countResolvedBetween(any(), any())).thenReturn(0L);
        when(vulnRepository.findAverageMttrDeclaredDays()).thenReturn(null);
        when(scanReportRepository.findFirstByExecutedAtNotNullOrderByExecutedAtDesc()).thenReturn(Optional.empty());
        when(vulnRepository.countGroupedByPriority()).thenReturn(List.of());
        when(vulnRepository.countGroupedByTriageStatus()).thenReturn(List.of());
        when(vulnRepository.countDailyDetections(any())).thenReturn(List.of());
        when(vulnRepository.countDailyResolutions(any())).thenReturn(List.of());
        when(vulnRepository.countByReopenCountGreaterThan(0)).thenReturn(0L);
        when(vulnRepository.countAgingBuckets()).thenReturn(List.of());
        when(vulnRepository.findAverageMttrDeclaredDaysByPriority()).thenReturn(List.of());
        when(vulnRepository.countOpenGroupedByAssignedUser()).thenReturn(List.of(
                new Object[]{"analyst.demo", 5L}, new Object[]{"fede.frankenberger", 2L}));

        DashboardStatsDTO stats = dashboardService.getStats();

        assertThat(stats.getByResponsible()).hasSize(2);
        assertThat(stats.getByResponsible().get(0)).containsEntry("name", "analyst.demo").containsEntry("value", 5L);
    }

    @Test
    @DisplayName("getStats() para ASSET_OWNER sin ningun activo asignado devuelve todo en cero, sin consultar la base")
    void getStats_assetOwnerSinActivos_todoEnCero() {
        TestAuth.loginAs(10L, "owner.demo", "ASSET_OWNER");
        when(userAssetAssignmentService.assignedAssetIds(10L)).thenReturn(Set.of());
        when(assetRepository.countByIdInAndDeletedAtIsNull(Set.of())).thenReturn(0L);

        DashboardStatsDTO stats = dashboardService.getStats();

        assertThat(stats.getTotalVulnerabilities()).isEqualTo(0L);
        assertThat(stats.getCriticalVulnerabilities()).isEqualTo(0L);
        assertThat(stats.getSystemStatus()).isEqualTo("✅ ESTABLE");
        verify(vulnRepository, never()).countBySoftwareComponent_Asset_IdIn(any());
    }

    @Test
    @DisplayName("DT-01: getStats() para ADMIN expone mttrVerifiedDays cuando hay cierres con evidencia E4+")
    void getStats_admin_exponeMttrVerificado() {
        TestAuth.loginAs(1L, "fede.frankenberger", "ADMIN");

        when(assetRepository.countByDeletedAtIsNull()).thenReturn(1L);
        when(vulnRepository.count()).thenReturn(1L);
        when(vulnRepository.countByTriageStatus(any())).thenReturn(0L);
        when(vulnRepository.countByPriority("CRITICAL")).thenReturn(0L);
        when(vulnRepository.countResolvedBetween(any(), any())).thenReturn(0L);
        when(vulnRepository.findAverageMttrDeclaredDays()).thenReturn(4.0);
        when(vulnRepository.findAverageMttrVerifiedDays()).thenReturn(2.5);
        when(scanReportRepository.findFirstByExecutedAtNotNullOrderByExecutedAtDesc()).thenReturn(Optional.empty());
        when(vulnRepository.countGroupedByPriority()).thenReturn(List.of());
        when(vulnRepository.countGroupedByTriageStatus()).thenReturn(List.of());
        when(vulnRepository.countDailyDetections(any())).thenReturn(List.of());
        when(vulnRepository.countDailyResolutions(any())).thenReturn(List.of());
        when(vulnRepository.countByReopenCountGreaterThan(0)).thenReturn(0L);
        when(vulnRepository.countAgingBuckets()).thenReturn(List.of());
        when(vulnRepository.findAverageMttrDeclaredDaysByPriority()).thenReturn(List.of());
        when(vulnRepository.countOpenGroupedByAssignedUser()).thenReturn(List.of());

        DashboardStatsDTO stats = dashboardService.getStats();

        assertThat(stats.getMttrDeclaredDays()).isEqualTo(4.0);
        assertThat(stats.getMttrVerifiedDays()).isEqualTo(2.5);
    }

    @Test
    @DisplayName("DT-01: getStats() para ASSET_OWNER usa la variante scopeada de mttrVerifiedDays, nunca la global")
    void getStats_assetOwner_mttrVerificadoUsaVarianteScopeada() {
        TestAuth.loginAs(10L, "owner.demo", "ASSET_OWNER");
        Set<Long> scope = Set.of(1L, 2L);
        when(userAssetAssignmentService.assignedAssetIds(10L)).thenReturn(scope);

        when(assetRepository.countByIdInAndDeletedAtIsNull(scope)).thenReturn(2L);
        when(vulnRepository.countBySoftwareComponent_Asset_IdIn(scope)).thenReturn(4L);
        when(vulnRepository.countByTriageStatusAndSoftwareComponent_Asset_IdIn(any(), eq(scope))).thenReturn(1L);
        when(vulnRepository.countByPriorityAndSoftwareComponent_Asset_IdIn("CRITICAL", scope)).thenReturn(0L);
        when(vulnRepository.countResolvedBetween(any(), any(), eq(scope))).thenReturn(0L);
        when(vulnRepository.findAverageMttrDeclaredDays(scope)).thenReturn(null);
        when(vulnRepository.findAverageMttrVerifiedDays(scope)).thenReturn(1.2);
        when(vulnRepository.countGroupedByPriority(scope)).thenReturn(List.of());
        when(vulnRepository.countGroupedByTriageStatus(scope)).thenReturn(List.of());
        when(vulnRepository.countDailyDetections(any(), eq(scope))).thenReturn(List.of());
        when(vulnRepository.countDailyResolutions(any(), eq(scope))).thenReturn(List.of());
        when(vulnRepository.countByReopenCountGreaterThanAndSoftwareComponent_Asset_IdIn(0, scope)).thenReturn(1L);
        when(vulnRepository.countAgingBuckets(scope)).thenReturn(List.of());
        when(vulnRepository.findAverageMttrDeclaredDaysByPriority(scope)).thenReturn(List.of());
        when(vulnRepository.countOpenGroupedByAssignedUser(scope)).thenReturn(List.of());

        DashboardStatsDTO stats = dashboardService.getStats();

        assertThat(stats.getMttrVerifiedDays()).isEqualTo(1.2);
        verify(vulnRepository, never()).findAverageMttrVerifiedDays();
    }
}
