package com.gef.gefsecureapp.dto;

import com.gef.gefsecureapp.model.ScanReport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** M-NUEVO-1 (docs/20-08-26/AUDITORIA_END_TO_END_2.md): antes ScanReportDTO no exponia
 *  el status/errorMessage reales del ScanReport -- el Historial solo mostraba systemStatus
 *  (salud del pipeline), indistinguible entre un escaneo FAILED y uno COMPLETED normal. */
class ScanReportDTOTest {

    @Test
    @DisplayName("from() expone status y errorMessage reales del ScanReport, no solo systemStatus")
    void from_should_exposeRealStatusAndErrorMessage() {
        ScanReport failed = ScanReport.builder()
                .id(1L).publicCode("SCN-2026-000001")
                .status("FAILED")
                .errorMessage("n8n inalcanzable durante el callback")
                .systemStatus("✅ ESTABLE")
                .build();

        ScanReportDTO dto = ScanReportDTO.from(failed);

        assertThat(dto.getStatus()).isEqualTo("FAILED");
        assertThat(dto.getErrorMessage()).isEqualTo("n8n inalcanzable durante el callback");
    }

    @Test
    @DisplayName("from() de un escaneo COMPLETED normal no trae errorMessage")
    void from_should_haveNullErrorMessage_forNormalCompletedScan() {
        ScanReport completed = ScanReport.builder()
                .id(2L).publicCode("SCN-2026-000002")
                .status("COMPLETED")
                .systemStatus("✅ ESTABLE")
                .build();

        ScanReportDTO dto = ScanReportDTO.from(completed);

        assertThat(dto.getStatus()).isEqualTo("COMPLETED");
        assertThat(dto.getErrorMessage()).isNull();
    }
}
