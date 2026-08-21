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
        when(vulnRepository.findAverageMttrDays()).thenReturn(3.5);
        when(scanReportRepository.findFirstByExecutedAtNotNullOrderByExecutedAtDesc()).thenReturn(Optional.empty());
        when(vulnRepository.countGroupedByPriority()).thenReturn(List.of());
        when(vulnRepository.countGroupedByTriageStatus()).thenReturn(List.of());
        when(vulnRepository.countDailyDetections(any())).thenReturn(List.of());
        when(vulnRepository.countDailyResolutions(any())).thenReturn(List.of());

        DashboardStatsDTO stats = dashboardService.getStats();

        assertThat(stats.getTotalAssets()).isEqualTo(18L);
        assertThat(stats.getTotalVulnerabilities()).isEqualTo(30L);
        verify(userAssetAssignmentService, never()).assignedAssetIds(any());
        // ninguna de las variantes scopeadas debe llamarse para ADMIN
        verify(assetRepository, never()).countByIdInAndDeletedAtIsNull(any());
        verify(vulnRepository, never()).countBySoftwareComponent_Asset_IdIn(any());
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
        when(vulnRepository.findAverageMttrDays(scope)).thenReturn(null);
        when(vulnRepository.countGroupedByPriority(scope)).thenReturn(List.of());
        when(vulnRepository.countGroupedByTriageStatus(scope)).thenReturn(List.of());
        when(vulnRepository.countDailyDetections(any(), eq(scope))).thenReturn(List.of());
        when(vulnRepository.countDailyResolutions(any(), eq(scope))).thenReturn(List.of());

        DashboardStatsDTO stats = dashboardService.getStats();

        assertThat(stats.getTotalAssets()).isEqualTo(2L);
        assertThat(stats.getTotalVulnerabilities()).isEqualTo(4L);
        assertThat(stats.getCriticalVulnerabilities()).isEqualTo(0L);
        assertThat(stats.getSystemStatus()).isEqualTo("✅ ESTABLE");

        // las variantes SIN scope no deben tocarse para ASSET_OWNER -- es la fuga que arregla C3
        verify(assetRepository, never()).countByDeletedAtIsNull();
        verify(vulnRepository, never()).count();
        verify(vulnRepository, never()).findAverageMttrDays();
        verify(scanReportRepository, never()).findFirstByExecutedAtNotNullOrderByExecutedAtDesc();
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
}
