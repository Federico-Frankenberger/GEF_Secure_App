package com.gef.gefsecureapp.controller;

import com.gef.gefsecureapp.dto.ScanReportDTO;
import com.gef.gefsecureapp.model.ScanReport;
import com.gef.gefsecureapp.repository.ScanReportRepository;
import com.gef.gefsecureapp.security.TestAuth;
import com.gef.gefsecureapp.service.N8nWebhookService;
import com.gef.gefsecureapp.service.ScanService;
import com.gef.gefsecureapp.service.UserAssetAssignmentService;
import com.gef.gefsecureapp.service.VulnerabilityAuditService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** A1 (docs/20-08-26/AUDITORIA_END_TO_END_2.md): ni /api/scan-reports/latest ni
 *  /api/scan-reports aplicaban ningun scope -- un ASSET_OWNER veia la metadata de los
 *  escaneos de toda la organizacion (conteos de severidad incluidos), mismo tipo de fuga
 *  ya cerrada en Dashboard/Informes/Webhooks. */
@ExtendWith(MockitoExtension.class)
class ScanControllerTest {

    @Mock private N8nWebhookService webhookService;
    @Mock private ScanReportRepository scanReportRepository;
    @Mock private VulnerabilityAuditService vulnerabilityAuditService;
    @Mock private ScanService scanService;
    @Mock private UserAssetAssignmentService userAssetAssignmentService;

    @InjectMocks private ScanController controller;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private ScanReport scan(Long id) {
        ScanReport scan = new ScanReport();
        scan.setId(id);
        scan.setTargetType("ACTIVO");
        scan.setTargetName("Spring Boot Backend");
        return scan;
    }

    @Test
    @DisplayName("latestReport() para ADMIN no aplica ningun filtro de scope")
    void latestReport_admin_sinScope() {
        TestAuth.loginAs(1L, "admin", "ADMIN");
        when(scanReportRepository.findFirstByTargetTypeAndTargetNameOrderByExecutedAtDesc("ACTIVO", "Spring Boot Backend"))
                .thenReturn(Optional.of(scan(1L)));

        ResponseEntity<ScanReportDTO> response = controller.latestReport("ACTIVO", "Spring Boot Backend");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(userAssetAssignmentService, never()).assignedAssetIds(any());
        verify(scanReportRepository, never()).resolveAssetId(any());
    }

    @Test
    @DisplayName("latestReport() de un activo fuera de scope da 204 para ASSET_OWNER (no confirma que exista)")
    void latestReport_assetOwner_fueraDeScope() {
        TestAuth.loginAs(10L, "owner.demo", "ASSET_OWNER");
        when(scanReportRepository.findFirstByTargetTypeAndTargetNameOrderByExecutedAtDesc("ACTIVO", "Spring Boot Backend"))
                .thenReturn(Optional.of(scan(1L)));
        when(scanReportRepository.resolveAssetId(1L)).thenReturn(17L);
        when(userAssetAssignmentService.assignedAssetIds(10L)).thenReturn(Set.of(5L));

        ResponseEntity<ScanReportDTO> response = controller.latestReport("ACTIVO", "Spring Boot Backend");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(response.getBody()).isNull();
    }

    @Test
    @DisplayName("latestReport() de un activo dentro de scope funciona normalmente para ASSET_OWNER")
    void latestReport_assetOwner_dentroDeScope() {
        TestAuth.loginAs(10L, "owner.demo", "ASSET_OWNER");
        when(scanReportRepository.findFirstByTargetTypeAndTargetNameOrderByExecutedAtDesc("ACTIVO", "Spring Boot Backend"))
                .thenReturn(Optional.of(scan(1L)));
        when(scanReportRepository.resolveAssetId(1L)).thenReturn(17L);
        when(userAssetAssignmentService.assignedAssetIds(10L)).thenReturn(Set.of(17L));

        ResponseEntity<ScanReportDTO> response = controller.latestReport("ACTIVO", "Spring Boot Backend");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @DisplayName("latestReport() de un escaneo GLOBAL/ENTORNO (sin activo unico) siempre da 204 para ASSET_OWNER")
    void latestReport_assetOwner_scanGlobalSinActivoUnico() {
        TestAuth.loginAs(10L, "owner.demo", "ASSET_OWNER");
        when(scanReportRepository.findFirstByTargetTypeAndTargetNameOrderByExecutedAtDesc("GLOBAL", "TODOS"))
                .thenReturn(Optional.of(scan(2L)));
        when(scanReportRepository.resolveAssetId(2L)).thenReturn(null);
        when(userAssetAssignmentService.assignedAssetIds(10L)).thenReturn(Set.of(17L));

        ResponseEntity<ScanReportDTO> response = controller.latestReport("GLOBAL", "TODOS");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }

    @Test
    @DisplayName("history() para ADMIN usa search() sin scope")
    void history_admin_usaSearchSinScope() {
        TestAuth.loginAs(1L, "admin", "ADMIN");
        when(scanReportRepository.search(any(), any(), any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(scan(1L), scan(2L))));

        ResponseEntity<Page<ScanReportDTO>> response = controller.history(null, null, null, null, null, 0, 20);

        assertThat(response.getBody().getTotalElements()).isEqualTo(2);
        verify(scanReportRepository, never()).searchInScope(any(), any(), any(), any(), any(), anySet(), any());
    }

    @Test
    @DisplayName("history() para ASSET_OWNER usa searchInScope() en vez de search()")
    void history_assetOwner_usaSearchInScope() {
        TestAuth.loginAs(10L, "owner.demo", "ASSET_OWNER");
        when(userAssetAssignmentService.assignedAssetIds(10L)).thenReturn(Set.of(17L));
        when(scanReportRepository.searchInScope(any(), any(), any(), any(), any(), eq(Set.of(17L)), any()))
                .thenReturn(new PageImpl<>(List.of(scan(1L))));

        ResponseEntity<Page<ScanReportDTO>> response = controller.history(null, null, null, null, null, 0, 20);

        assertThat(response.getBody().getTotalElements()).isEqualTo(1);
        verify(scanReportRepository, never()).search(any(), any(), any(), any(), any(), any(Pageable.class));
    }

    @Test
    @DisplayName("history() para ASSET_OWNER sin ningun activo asignado da pagina vacia sin pegarle a la base con un IN() vacio")
    void history_assetOwner_sinActivosAsignados_paginaVacia() {
        TestAuth.loginAs(10L, "owner.demo", "ASSET_OWNER");
        when(userAssetAssignmentService.assignedAssetIds(10L)).thenReturn(Set.of());

        ResponseEntity<Page<ScanReportDTO>> response = controller.history(null, null, null, null, null, 0, 20);

        assertThat(response.getBody().getTotalElements()).isEqualTo(0);
        verify(scanReportRepository, never()).searchInScope(any(), any(), any(), any(), any(), anySet(), any());
    }
}
